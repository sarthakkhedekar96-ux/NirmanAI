import json
import hashlib
import datetime
import logging
from typing import Dict, Any, List, Optional
import sqlalchemy
import pandas as pd

from backend.app.core.db_resilience import get_resilient_db_engine
from backend.app.services.risk_engine import RiskEngineService
from backend.app.services.early_warning_service import EarlyWarningPrioritizationService
from backend.app.services.recommendation_engine import PrescriptiveRecommendationEngine
from backend.app.services.risk_decomposition_service import RiskDecompositionService
from backend.app.services.email_service import email_service

logger = logging.getLogger("nirman.alert_engine")

ROLE_ALERT_ROUTING = {
    "CRITICAL_RISK": ["ADMIN", "DECISION_MAKER", "ANALYST"],
    "EARLY_WARNING": ["DECISION_MAKER", "ANALYST"],
    "COST_OVERRUN": ["DECISION_MAKER", "ANALYST"],
    "SCHEDULE_DELAY": ["DECISION_MAKER", "ANALYST"],
    "SYSTEM_AUDIT": ["ADMIN"],
}


class AlertEngine:
    """
    Evaluates backend project risk monitoring data, performs database-enforced deduplication,
    resolves recipient roles/preferences, and generates grounded alerts & notifications.
    """

    def __init__(self):
        self.risk_engine = RiskEngineService()
        self.early_warning_service = EarlyWarningPrioritizationService()
        self.recommendation_engine = PrescriptiveRecommendationEngine()
        self.decomposition_service = RiskDecompositionService()

    def run_portfolio_alert_scan(self) -> Dict[str, Any]:
        """
        Scans monitored portfolio projects, evaluates backend risk thresholds,
        and generates auditable alerts with role-aware notification routing.
        Executed strictly ON-DEMAND (never auto-triggered on frontend page reload).
        """
        logger.info("⚡ Initiating on-demand portfolio alert evaluation scan...")
        ew_projects = self.early_warning_service.get_early_warning_projects(limit=50)

        alerts_created = 0
        notifications_created = 0
        emails_dispatched = 0
        skipped_duplicates = 0

        for item in ew_projects:
            project_code = item["project_code"]
            risk_assessment = self.risk_engine.get_project_risk_assessment(project_code)
            if not risk_assessment:
                continue

            score = float(risk_assessment.get("risk_score") or item.get("risk_score") or 0.0)
            prob = float(risk_assessment.get("predicted_severe_risk_prob") or item.get("predicted_prob") or 0.0)
            category = str(risk_assessment.get("risk_category") or item.get("risk_category") or "Low").upper()
            reporting_month = str(risk_assessment.get("reporting_month") or item.get("reporting_month") or "2026-07")

            # Determine alert types to evaluate
            candidate_alerts = []

            # 1. CRITICAL_RISK Trigger
            if category == "CRITICAL" or score >= 80.0:
                candidate_alerts.append({
                    "alert_type": "CRITICAL_RISK",
                    "severity": "CRITICAL",
                    "title": f"Critical Risk Escalation — {item['project_name']}",
                    "description": f"Project risk evaluation returned CRITICAL status with composite risk score {score:.1f}/100 and failure probability {prob*100:.1f}%.",
                    "trigger_reason": f"Project meets backend CRITICAL risk criteria (Risk Score: {score:.1f}/100, Severe Risk Prob: {prob:.2f}). Urgency: {item.get('urgency_reason', 'Threshold breach')}"
                })
            # 2. EARLY_WARNING Trigger (T* = 0.28)
            elif prob >= 0.28:
                candidate_alerts.append({
                    "alert_type": "EARLY_WARNING",
                    "severity": "HIGH" if prob >= 0.50 else "MEDIUM",
                    "title": f"Early Warning Threshold Breach — {item['project_name']}",
                    "description": f"Project calibrated failure probability ({prob*100:.1f}%) crossed the operational monitoring threshold T*=0.28.",
                    "trigger_reason": f"Severe risk probability {prob:.2f} >= T*=0.28 threshold. Urgency: {item.get('urgency_reason', 'Threshold breach')}"
                })

            # 3. COST_OVERRUN Trigger
            if item.get("cost_warning") or item.get("cost_overrun_cr", 0) > 50.0:
                candidate_alerts.append({
                    "alert_type": "COST_OVERRUN",
                    "severity": "HIGH",
                    "title": f"Cost Overrun Advisory — {item['project_name']}",
                    "description": f"Project cost overrun recorded at ₹{item.get('cost_overrun_cr', 0):.2f} Cr above sanctioned baseline.",
                    "trigger_reason": f"Anticipated cost expansion exceeds policy monitoring baseline (Cost Overrun: ₹{item.get('cost_overrun_cr', 0):.2f} Cr)."
                })

            # 4. SCHEDULE_DELAY Trigger
            if item.get("schedule_warning") or item.get("delay_months", 0) >= 12.0:
                candidate_alerts.append({
                    "alert_type": "SCHEDULE_DELAY",
                    "severity": "HIGH" if item.get("delay_months", 0) >= 24.0 else "MEDIUM",
                    "title": f"Schedule Slippage Alert — {item['project_name']}",
                    "description": f"Project execution timeline slippage reaches {item.get('delay_months', 0):.1f} months.",
                    "trigger_reason": f"Observed delay of {item.get('delay_months', 0):.1f} months exceeds threshold."
                })

            # Process each candidate alert through deduplication and creation
            for cand in candidate_alerts:
                sig_input = f"{project_code}:{cand['alert_type']}:{reporting_month}:{cand['severity']}"
                dedup_hash = hashlib.sha256(sig_input.encode("utf-8")).hexdigest()

                created_alert = self.create_alert_if_not_exists(
                    project_code=project_code,
                    alert_type=cand["alert_type"],
                    severity=cand["severity"],
                    title=cand["title"],
                    description=cand["description"],
                    trigger_reason=cand["trigger_reason"],
                    risk_score=score,
                    predicted_severe_risk_prob=prob,
                    risk_category=category,
                    dedup_hash=dedup_hash,
                    reporting_month=reporting_month
                )

                if created_alert:
                    alerts_created += 1
                    notif_count, email_count = self.dispatch_notifications_for_alert(created_alert)
                    notifications_created += notif_count
                    emails_dispatched += email_count
                else:
                    skipped_duplicates += 1

        summary = {
            "alerts_created": alerts_created,
            "skipped_duplicates": skipped_duplicates,
            "notifications_created": notifications_created,
            "emails_dispatched": emails_dispatched,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        logger.info(f"✅ Alert scan complete: {summary}")
        return summary

    def create_alert_if_not_exists(
        self,
        project_code: str,
        alert_type: str,
        severity: str,
        title: str,
        description: str,
        trigger_reason: str,
        risk_score: float,
        predicted_severe_risk_prob: float,
        risk_category: str,
        dedup_hash: str,
        reporting_month: str
    ) -> Optional[Dict[str, Any]]:
        """
        Database-enforced deterministic creation of Alert record.
        Returns Alert dict if newly created, or None if skipped as a duplicate.
        """
        engine = get_resilient_db_engine()

        # Check existing hash
        check_sql = "SELECT id FROM alerts WHERE dedup_hash = :hash LIMIT 1;"
        with engine.connect() as conn:
            df = pd.read_sql(sqlalchemy.text(check_sql), conn, params={"hash": dedup_hash})
            if not df.empty:
                return None

        # Fetch SHAP drivers & Prescriptive Recommendations
        decomp = self.decomposition_service.decompose_project_risk(project_code) or {}
        drivers = decomp.get("primary_risk_drivers", [])

        recs_data = self.recommendation_engine.get_project_recommendations(project_code) or {}
        recs_list = recs_data.get("recommendations", [])
        
        # Grounded Mitigation Wording Notice
        disclaimer = "Recommendations are generated from available project data and should be reviewed by the responsible authority before action."

        recommended_actions = [
            {
                "code": r.get("recommendation_code", "REVIEW_REQUIRED"),
                "severity": r.get("severity", "MEDIUM"),
                "action": r.get("recommended_review", "Inspect project execution progress."),
                "rationale": r.get("rationale", ""),
                "disclaimer": disclaimer
            }
            for r in recs_list
        ]

        if not recommended_actions:
            recommended_actions.append({
                "code": "STANDARD_RISK_REVIEW",
                "severity": severity,
                "action": "Conduct operational progress and risk review with project monitoring team.",
                "rationale": f"Triggered due to {alert_type} condition.",
                "disclaimer": disclaimer
            })

        insert_sql = """
        INSERT INTO alerts (
            project_code, alert_type, severity, title, description, trigger_reason,
            risk_score, predicted_severe_risk_probability, risk_category,
            risk_drivers, recommended_actions, dedup_hash, triggered_at, status, metadata_json
        ) VALUES (
            :code, :alert_type, :severity, :title, :description, :trigger_reason,
            :risk_score, :prob, :cat,
            :drivers, :recs, :hash, :triggered_at, 'ACTIVE', :meta
        ) RETURNING id, triggered_at;
        """
        now = datetime.datetime.utcnow()
        meta = json.dumps({"reporting_month": reporting_month, "source": "AlertEngine"})

        try:
            with engine.begin() as conn:
                res = conn.execute(sqlalchemy.text(insert_sql), {
                    "code": project_code,
                    "alert_type": alert_type,
                    "severity": severity,
                    "title": title,
                    "description": description,
                    "trigger_reason": trigger_reason,
                    "risk_score": risk_score,
                    "prob": predicted_severe_risk_prob,
                    "cat": risk_category,
                    "drivers": json.dumps(drivers),
                    "recs": json.dumps(recommended_actions),
                    "hash": dedup_hash,
                    "triggered_at": now,
                    "meta": meta
                })
                row = res.fetchone()
                alert_id = row[0] if row else None
        except Exception as e:
            logger.error(f"Deduplication collision or DB error inserting alert: {e}")
            return None

        return {
            "id": alert_id,
            "project_code": project_code,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "description": description,
            "trigger_reason": trigger_reason,
            "risk_score": risk_score,
            "predicted_severe_risk_probability": predicted_severe_risk_prob,
            "risk_category": risk_category,
            "risk_drivers": drivers,
            "recommended_actions": recommended_actions,
            "dedup_hash": dedup_hash,
            "triggered_at": now.isoformat(),
            "status": "ACTIVE"
        }

    def dispatch_notifications_for_alert(self, alert: Dict[str, Any]) -> tuple[int, int]:
        """
        Executes Recipient Resolution Pipeline:
        alert → eligible roles → active users in DB → notification preferences → deduplication → create notifications & dispatch emails.
        Returns tuple of (notifications_created_count, emails_dispatched_count).
        """
        engine = get_resilient_db_engine()
        alert_id = alert["id"]
        alert_type = alert["alert_type"]
        severity = alert["severity"]

        eligible_roles = ROLE_ALERT_ROUTING.get(alert_type, ["ADMIN", "DECISION_MAKER"])

        # Fetch active users matching eligible roles
        users_query = """
        SELECT u.id, u.username, u.email, u.full_name, u.role,
               p.email_enabled, p.in_app_enabled, p.critical_alerts_only,
               p.cost_alerts_enabled, p.schedule_alerts_enabled
        FROM users u
        LEFT JOIN user_notification_preferences p ON u.id = p.user_id
        WHERE u.is_active = TRUE AND UPPER(u.role) IN :roles;
        """
        with engine.connect() as conn:
            df = pd.read_sql(sqlalchemy.text(users_query), conn, params={"roles": tuple(r.upper() for r in eligible_roles)})

        if df.empty:
            return (0, 0)

        notif_created = 0
        emails_sent = 0

        for _, user in df.iterrows():
            user_id = int(user["id"])
            user_email = str(user["email"])
            user_name = str(user["full_name"])

            # Preferences filter check
            email_pref = bool(user["email_enabled"]) if user["email_enabled"] is not None else True
            in_app_pref = bool(user["in_app_enabled"]) if user["in_app_enabled"] is not None else True
            crit_only = bool(user["critical_alerts_only"]) if user["critical_alerts_only"] is not None else False
            cost_pref = bool(user["cost_alerts_enabled"]) if user["cost_alerts_enabled"] is not None else True
            sched_pref = bool(user["schedule_alerts_enabled"]) if user["schedule_alerts_enabled"] is not None else True

            # Critical alerts bypass non-critical filters
            if crit_only and severity != "CRITICAL":
                continue
            if alert_type == "COST_OVERRUN" and not cost_pref:
                continue
            if alert_type == "SCHEDULE_DELAY" and not sched_pref:
                continue

            # 1. Create In-App Notification if enabled
            if in_app_pref:
                insert_notif_sql = """
                INSERT INTO notifications (alert_id, recipient_user_id, channel, title, message, status, created_at)
                VALUES (:alert_id, :uid, 'IN_APP', :title, :message, 'UNREAD', CURRENT_TIMESTAMP)
                RETURNING id;
                """
                notif_id = None
                try:
                    with engine.begin() as conn:
                        res = conn.execute(sqlalchemy.text(insert_notif_sql), {
                            "alert_id": alert_id,
                            "uid": user_id,
                            "title": alert["title"],
                            "message": alert["description"]
                        })
                        row = res.fetchone()
                        if row:
                            notif_id = row[0]
                            notif_created += 1
                except Exception as e:
                    logger.error(f"Error creating in-app notification: {e}")

                # 2. Dispatch Email Notification if enabled
                if email_pref and notif_id:
                    email_subject, body_text, body_html = self._compose_email_content(user_name, alert)
                    res = email_service.send_notification_email(
                        notification_id=notif_id,
                        recipient_email=user_email,
                        subject=email_subject,
                        body_text=body_text,
                        body_html=body_html
                    )
                    if res.get("success"):
                        emails_sent += 1

        return (notif_created, emails_sent)

    def _compose_email_content(self, recipient_name: str, alert: Dict[str, Any]) -> tuple[str, str, str]:
        """
        Composes structured email content answering the 6 core questions:
        1. WHAT happened?
        2. WHY triggered?
        3. HOW serious?
        4. WHAT factors driving risk?
        5. WHAT actions recommended for review?
        6. WHERE to investigate?
        """
        code = alert["project_code"]
        title = alert["title"]
        severity = alert["severity"]
        score = alert["risk_score"]
        prob = alert["predicted_severe_risk_probability"]
        trigger = alert["trigger_reason"]
        drivers = alert.get("risk_drivers") or []
        recs = alert.get("recommended_actions") or []

        subject = f"[NIRMAN AI] {severity} Alert — Project {code}"

        drivers_text = "\n".join([f"- {d.get('feature_name', 'Risk Driver')}: {d.get('description', '')}" for d in drivers]) if drivers else "- Standard longitudinal risk factors"
        recs_text = "\n".join([f"{i+1}. {r.get('action', '')}" for i, r in enumerate(recs)]) if recs else "1. Inspect project execution progress and coordinate with site monitoring authority."

        body_text = f"""
NIRMAN AI — OFFICIAL INFRASTRUCTURE RISK MONITORING ALERT

Dear {recipient_name},

1. WHAT HAPPENED:
{title}
Project Code: {code}

2. WHY THIS ALERT WAS GENERATED:
{trigger}

3. HOW SERIOUS IS IT:
- Severity Level: {severity}
- Composite Risk Score: {score:.1f} / 100
- Calibrated Severe Failure Probability: {prob*100:.1f}%

4. KEY RISK DRIVERS:
{drivers_text}

5. RECOMMENDED ACTIONS FOR REVIEW:
{recs_text}

IMPORTANT NOTICE:
Recommendations are generated from available project data and should be reviewed by the responsible authority before action.

6. WHERE TO INVESTIGATE:
Log in to the Nirman AI portal to inspect complete risk intelligence, SHAP decomposition, and historical project evidence.

---
MoSPI Infrastructure Monitoring Portal — Nirman AI Engine
"""

        # Build clean HTML email
        drivers_html = "".join([f"<li style='margin-bottom: 6px;'><strong>{d.get('feature_name', 'Risk Driver')}</strong>: {d.get('description', '')}</li>" for d in drivers]) if drivers else "<li>Standard longitudinal risk factors</li>"
        recs_html = "".join([f"<li style='margin-bottom: 8px;'><strong>{r.get('action', '')}</strong><br/><span style='font-size: 12px; color: #64748b;'>Rationale: {r.get('rationale', '')}</span></li>" for r in recs]) if recs else "<li>Inspect project execution progress.</li>"

        body_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background-color: #0f172a; color: #ffffff; padding: 16px 24px; border-bottom: 3px solid #f59e0b;">
            <div style="font-size: 11px; font-weight: bold; color: #cbd5e1; letter-spacing: 0.5px;">GOVERNMENT OF INDIA — MoSPI</div>
            <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #ffffff;">NIRMAN AI RISK ADVISORY</h2>
        </div>

        <div style="padding: 24px;">
            <div style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #ffffff; background-color: {'#dc2626' if severity == 'CRITICAL' else ('#ea580c' if severity == 'HIGH' else '#0284c7')}; margin-bottom: 16px;">
                {severity} ALERT
            </div>

            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">{title}</h3>
            <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;"><strong>Project Code:</strong> {code}</p>

            <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
                <div style="font-size: 12px; font-weight: bold; color: #334155; text-transform: uppercase;">Why Triggered</div>
                <div style="font-size: 13px; color: #0f172a; margin-top: 4px;">{trigger}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                <tr style="background-color: #f8fafc;">
                    <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Composite Risk Score</td>
                    <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">{score:.1f} / 100</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Calibrated Severe Failure Prob.</td>
                    <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #ea580c;">{prob*100:.1f}%</td>
                </tr>
            </table>

            <h4 style="font-size: 14px; margin: 0 0 8px 0; color: #0f172a;">Key Risk Drivers</h4>
            <ul style="padding-left: 20px; margin: 0 0 20px 0; font-size: 13px; color: #334155;">
                {drivers_html}
            </ul>

            <h4 style="font-size: 14px; margin: 0 0 8px 0; color: #0f172a;">Recommended Actions for Review</h4>
            <ol style="padding-left: 20px; margin: 0 0 16px 0; font-size: 13px; color: #334155;">
                {recs_html}
            </ol>

            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #92400e; margin-bottom: 24px;">
                <strong>IMPORTANT NOTICE:</strong> Recommendations are generated from available project data and should be reviewed by the responsible authority before action.
            </div>

            <div style="text-align: center;">
                <a href="http://localhost:5173" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold;">Inspect Project Risk Intelligence</a>
            </div>
        </div>

        <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
            This is an automated system advisory generated by Nirman AI Surveillance Platform.
        </div>
    </div>
</body>
</html>
"""
        return subject, body_text, body_html


alert_engine = AlertEngine()
