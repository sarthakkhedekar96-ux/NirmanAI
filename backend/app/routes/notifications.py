import datetime
import json
import hashlib
import sqlalchemy
import pandas as pd
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr

from backend.app.core.auth_dependencies import get_current_user, require_role
from backend.app.models.user import User
from backend.app.core.db_resilience import get_resilient_db_engine
from backend.app.services.email_service import email_service
from backend.app.services.alert_engine import alert_engine

router = APIRouter(
    prefix="/api/notifications",
    tags=["Phase 8 — Notifications & Alerts"],
    dependencies=[Depends(get_current_user)]
)


class PreferenceUpdateRequest(BaseModel):
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    critical_alerts_only: Optional[bool] = None
    cost_alerts_enabled: Optional[bool] = None
    schedule_alerts_enabled: Optional[bool] = None


class TestEmailRequest(BaseModel):
    recipient_email: str


@router.get("", response_model=List[dict])
def get_user_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Retrieve in-app notifications for the authenticated user."""
    engine = get_resilient_db_engine()
    sql = """
        SELECT n.id, n.alert_id, n.channel, n.title, n.message, n.created_at, n.read_at, n.status,
               a.project_code, a.alert_type, a.severity, a.risk_score, a.predicted_severe_risk_probability
        FROM notifications n
        LEFT JOIN alerts a ON n.alert_id = a.id
        WHERE n.recipient_user_id = :uid
    """
    if unread_only:
        sql += " AND n.status = 'UNREAD'"
    sql += " ORDER BY n.created_at DESC LIMIT :limit OFFSET :offset;"

    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"uid": current_user.id, "limit": limit, "offset": offset})

    if df.empty:
        return []

    res = []
    for _, row in df.iterrows():
        res.append({
            "id": int(row["id"]),
            "alert_id": int(row["alert_id"]) if pd.notna(row.get("alert_id")) else None,
            "channel": str(row["channel"]),
            "title": str(row["title"]),
            "message": str(row["message"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "read_at": row["read_at"].isoformat() if row["read_at"] else None,
            "status": str(row["status"]),
            "project_code": str(row["project_code"]) if pd.notna(row.get("project_code")) else "SYSTEM",
            "alert_type": str(row["alert_type"]) if pd.notna(row.get("alert_type")) else "SYSTEM_AUDIT",
            "severity": str(row["severity"]) if pd.notna(row.get("severity")) else "INFO",
            "risk_score": float(row["risk_score"]) if pd.notna(row.get("risk_score")) else None,
            "predicted_severe_risk_prob": float(row["predicted_severe_risk_probability"]) if pd.notna(row.get("predicted_severe_risk_probability")) else None,
        })
    return res


@router.get("/unread-count")
def get_unread_notification_count(current_user: User = Depends(get_current_user)):
    """Retrieve total count of unread notifications for the current user."""
    engine = get_resilient_db_engine()
    sql = "SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = :uid AND status = 'UNREAD';"
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"uid": current_user.id})

    count = int(df.iloc[0]["count"]) if not df.empty else 0
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_notification_as_read(notification_id: int, current_user: User = Depends(get_current_user)):
    """Mark a specific notification as READ for the authenticated user."""
    engine = get_resilient_db_engine()
    sql = """
        UPDATE notifications
        SET status = 'READ', read_at = CURRENT_TIMESTAMP
        WHERE id = :nid AND recipient_user_id = :uid
        RETURNING id;
    """
    with engine.begin() as conn:
        res = conn.execute(sqlalchemy.text(sql), {"nid": notification_id, "uid": current_user.id})
        row = res.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Notification #{notification_id} not found for this user.")

    return {"message": "Notification marked as read.", "id": notification_id, "status": "READ"}


@router.patch("/read-all")
def mark_all_notifications_as_read(current_user: User = Depends(get_current_user)):
    """Mark all UNREAD notifications as READ for the authenticated user."""
    engine = get_resilient_db_engine()
    sql = """
        UPDATE notifications
        SET status = 'READ', read_at = CURRENT_TIMESTAMP
        WHERE recipient_user_id = :uid AND status = 'UNREAD';
    """
    with engine.begin() as conn:
        conn.execute(sqlalchemy.text(sql), {"uid": current_user.id})

    return {"message": "All unread notifications marked as read."}


@router.get("/preferences")
def get_notification_preferences(current_user: User = Depends(get_current_user)):
    """Retrieve authenticated user's notification preferences."""
    engine = get_resilient_db_engine()
    sql = "SELECT * FROM user_notification_preferences WHERE user_id = :uid LIMIT 1;"
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"uid": current_user.id})

    if df.empty:
        # Default preferences
        return {
            "user_id": current_user.id,
            "email_enabled": True,
            "in_app_enabled": True,
            "critical_alerts_only": False,
            "cost_alerts_enabled": True,
            "schedule_alerts_enabled": True
        }

    row = df.iloc[0]
    return {
        "user_id": current_user.id,
        "email_enabled": bool(row["email_enabled"]),
        "in_app_enabled": bool(row["in_app_enabled"]),
        "critical_alerts_only": bool(row["critical_alerts_only"]),
        "cost_alerts_enabled": bool(row["cost_alerts_enabled"]),
        "schedule_alerts_enabled": bool(row["schedule_alerts_enabled"]),
    }


@router.put("/preferences")
def update_notification_preferences(req: PreferenceUpdateRequest, current_user: User = Depends(get_current_user)):
    """Update notification preferences for current user."""
    engine = get_resilient_db_engine()
    existing = get_notification_preferences(current_user)

    email_enabled = req.email_enabled if req.email_enabled is not None else existing["email_enabled"]
    in_app_enabled = req.in_app_enabled if req.in_app_enabled is not None else existing["in_app_enabled"]
    critical_alerts_only = req.critical_alerts_only if req.critical_alerts_only is not None else existing["critical_alerts_only"]
    cost_alerts_enabled = req.cost_alerts_enabled if req.cost_alerts_enabled is not None else existing["cost_alerts_enabled"]
    schedule_alerts_enabled = req.schedule_alerts_enabled if req.schedule_alerts_enabled is not None else existing["schedule_alerts_enabled"]

    sql = """
        INSERT INTO user_notification_preferences (
            user_id, email_enabled, in_app_enabled, critical_alerts_only, cost_alerts_enabled, schedule_alerts_enabled, updated_at
        ) VALUES (
            :uid, :email, :in_app, :crit_only, :cost, :sched, CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email_enabled = EXCLUDED.email_enabled,
            in_app_enabled = EXCLUDED.in_app_enabled,
            critical_alerts_only = EXCLUDED.critical_alerts_only,
            cost_alerts_enabled = EXCLUDED.cost_alerts_enabled,
            schedule_alerts_enabled = EXCLUDED.schedule_alerts_enabled,
            updated_at = CURRENT_TIMESTAMP;
    """
    with engine.begin() as conn:
        conn.execute(sqlalchemy.text(sql), {
            "uid": current_user.id,
            "email": email_enabled,
            "in_app": in_app_enabled,
            "crit_only": critical_alerts_only,
            "cost": cost_alerts_enabled,
            "sched": schedule_alerts_enabled
        })

    return {
        "message": "Preferences updated successfully.",
        "preferences": {
            "user_id": current_user.id,
            "email_enabled": email_enabled,
            "in_app_enabled": in_app_enabled,
            "critical_alerts_only": critical_alerts_only,
            "cost_alerts_enabled": cost_alerts_enabled,
            "schedule_alerts_enabled": schedule_alerts_enabled,
        }
    }


@router.get("/alerts", response_model=List[dict])
def get_alerts_history(
    severity: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    project_code: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    """Retrieve system alerts history with optional filtering by severity, type, or project code."""
    engine = get_resilient_db_engine()
    sql = """
        SELECT a.id, a.project_code, a.alert_type, a.severity, a.title, a.description, a.trigger_reason,
               a.risk_score, a.predicted_severe_risk_probability, a.risk_category, a.risk_drivers,
               a.recommended_actions, a.triggered_at, a.status, p.project_name
        FROM alerts a
        LEFT JOIN projects p ON a.project_code = p.project_code
        WHERE 1=1
    """
    params = {"limit": limit, "offset": offset}
    if severity:
        sql += " AND UPPER(a.severity) = :severity"
        params["severity"] = severity.upper()
    if alert_type:
        sql += " AND UPPER(a.alert_type) = :alert_type"
        params["alert_type"] = alert_type.upper()
    if project_code:
        sql += " AND a.project_code = :project_code"
        params["project_code"] = project_code

    sql += " ORDER BY a.triggered_at DESC LIMIT :limit OFFSET :offset;"

    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params=params)

    if df.empty:
        return []

    res = []
    for _, row in df.iterrows():
        drivers = json.loads(row["risk_drivers"]) if (pd.notna(row["risk_drivers"]) and isinstance(row["risk_drivers"], str) and row["risk_drivers"].strip()) else []
        recs = json.loads(row["recommended_actions"]) if (pd.notna(row["recommended_actions"]) and isinstance(row["recommended_actions"], str) and row["recommended_actions"].strip()) else []
        res.append({
            "id": int(row["id"]),
            "project_code": str(row["project_code"]),
            "project_name": str(row.get("project_name") or f"Project {row['project_code']}"),
            "alert_type": str(row["alert_type"]),
            "severity": str(row["severity"]),
            "title": str(row["title"]),
            "description": str(row["description"]),
            "trigger_reason": str(row["trigger_reason"]),
            "risk_score": float(row["risk_score"]) if row["risk_score"] is not None else None,
            "predicted_severe_risk_prob": float(row["predicted_severe_risk_probability"]) if row["predicted_severe_risk_probability"] is not None else None,
            "risk_category": str(row["risk_category"]),
            "risk_drivers": drivers,
            "recommended_actions": recs,
            "triggered_at": row["triggered_at"].isoformat() if row["triggered_at"] else None,
            "status": str(row["status"]),
        })
    return res


@router.get("/alerts/{alert_id}")
def get_alert_detail(alert_id: int, current_user: User = Depends(get_current_user)):
    """Retrieve comprehensive single alert details including recipient dispatch list."""
    engine = get_resilient_db_engine()
    sql = """
        SELECT a.*, p.project_name, p.agency, p.state
        FROM alerts a
        LEFT JOIN projects p ON a.project_code = p.project_code
        WHERE a.id = :aid LIMIT 1;
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"aid": alert_id})

    if df.empty:
        raise HTTPException(status_code=404, detail=f"Alert #{alert_id} not found.")

    row = df.iloc[0]
    drivers = json.loads(row["risk_drivers"]) if (pd.notna(row["risk_drivers"]) and isinstance(row["risk_drivers"], str) and row["risk_drivers"].strip()) else []
    recs = json.loads(row["recommended_actions"]) if (pd.notna(row["recommended_actions"]) and isinstance(row["recommended_actions"], str) and row["recommended_actions"].strip()) else []

    # Fetch recipient notification dispatch status
    notif_sql = """
        SELECT n.id, n.recipient_user_id, n.channel, n.status as notif_status, n.created_at,
               u.username, u.email, u.full_name, u.role,
               d.status as delivery_status, d.provider, d.sent_at, d.failure_reason
        FROM notifications n
        JOIN users u ON n.recipient_user_id = u.id
        LEFT JOIN notification_deliveries d ON n.id = d.notification_id
        WHERE n.alert_id = :aid;
    """
    with engine.connect() as conn:
        n_df = pd.read_sql(sqlalchemy.text(notif_sql), conn, params={"aid": alert_id})

    recipients = []
    if not n_df.empty:
        for _, n_row in n_df.iterrows():
            recipients.append({
                "notification_id": int(n_row["id"]),
                "user_id": int(n_row["recipient_user_id"]),
                "username": str(n_row["username"]),
                "email": str(n_row["email"]),
                "full_name": str(n_row["full_name"]),
                "role": str(n_row["role"]),
                "channel": str(n_row["channel"]),
                "in_app_status": str(n_row["notif_status"]),
                "email_delivery_status": str(n_row["delivery_status"]) if n_row["delivery_status"] else "N/A",
                "sent_at": n_row["sent_at"].isoformat() if n_row["sent_at"] else None,
                "failure_reason": str(n_row["failure_reason"]) if n_row["failure_reason"] else None
            })

    return {
        "id": int(row["id"]),
        "project_code": str(row["project_code"]),
        "project_name": str(row.get("project_name") or f"Project {row['project_code']}"),
        "agency": str(row.get("agency", "")),
        "state": str(row.get("state", "")),
        "alert_type": str(row["alert_type"]),
        "severity": str(row["severity"]),
        "title": str(row["title"]),
        "description": str(row["description"]),
        "trigger_reason": str(row["trigger_reason"]),
        "risk_score": float(row["risk_score"]) if row["risk_score"] is not None else None,
        "predicted_severe_risk_prob": float(row["predicted_severe_risk_probability"]) if row["predicted_severe_risk_probability"] is not None else None,
        "risk_category": str(row["risk_category"]),
        "risk_drivers": drivers,
        "recommended_actions": recs,
        "triggered_at": row["triggered_at"].isoformat() if row["triggered_at"] else None,
        "status": str(row["status"]),
        "recipients": recipients
    }


@router.get("/deliveries", response_model=List[dict])
def get_notification_deliveries_audit(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    ADMIN ONLY. Retrieve complete email/notification delivery audit trail.
    Sanitizes raw metadata to ensure secrets are never exposed.
    """
    engine = get_resilient_db_engine()
    sql = """
        SELECT d.id, d.notification_id, d.provider, d.provider_message_id, d.attempted_at, d.sent_at,
               d.delivered_at, d.status, d.failure_reason, d.provider_response_metadata,
               n.recipient_user_id, n.title as notification_title,
               u.email as recipient_email, u.full_name as recipient_name,
               a.project_code, a.alert_type, a.severity
        FROM notification_deliveries d
        JOIN notifications n ON d.notification_id = n.id
        JOIN users u ON n.recipient_user_id = u.id
        JOIN alerts a ON n.alert_id = a.id
        ORDER BY d.attempted_at DESC
        LIMIT :limit OFFSET :offset;
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"limit": limit, "offset": offset})

    if df.empty:
        return []

    res = []
    for _, row in df.iterrows():
        meta = {}
        if row["provider_response_metadata"]:
            try:
                raw_m = json.loads(row["provider_response_metadata"])
                # Sanitize meta to ensure no secrets or password tokens exist
                meta = {k: v for k, v in raw_m.items() if "pass" not in k.lower() and "token" not in k.lower()}
            except Exception:
                meta = {}

        res.append({
            "id": int(row["id"]),
            "notification_id": int(row["notification_id"]),
            "recipient_email": str(row["recipient_email"]),
            "recipient_name": str(row["recipient_name"]),
            "project_code": str(row["project_code"]),
            "alert_type": str(row["alert_type"]),
            "severity": str(row["severity"]),
            "provider": str(row["provider"]),
            "provider_message_id": str(row["provider_message_id"]) if row["provider_message_id"] else None,
            "attempted_at": row["attempted_at"].isoformat() if row["attempted_at"] else None,
            "sent_at": row["sent_at"].isoformat() if row["sent_at"] else None,
            "delivered_at": row["delivered_at"].isoformat() if row["delivered_at"] else None,
            "status": str(row["status"]),
            "failure_reason": str(row["failure_reason"]) if row["failure_reason"] else None,
            "metadata": meta
        })
    return res


@router.post("/test-email")
def send_test_email(req: TestEmailRequest, current_user: User = Depends(require_role(["ADMIN"]))):
    """
    ADMIN ONLY. Triggers a controlled test email to verify SMTP provider configuration & delivery recording.
    Checks SMTP configuration BEFORE creating any database audit records.
    """
    if not req.recipient_email or "@" not in req.recipient_email:
        raise HTTPException(status_code=400, detail="Invalid email address.")

    # STEP 1: Check SMTP configuration BEFORE creating any alert/audit record
    if not email_service.is_configured():
        diag = email_service.diagnose_smtp_connection()
        return {
            "status": "SMTP_NOT_CONFIGURED",
            "configured": False,
            "message": "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM_EMAIL in the backend environment configuration.",
            "recipient": req.recipient_email,
            "result": {
                "success": False,
                "status": "NOT_CONFIGURED",
                "provider": email_service.provider,
                "error": "SMTP email delivery is not configured. Configure the required SMTP environment variables on the backend."
            }
        }

    # STEP 2: If configured, perform real SMTP test and log audit entry
    engine = get_resilient_db_engine()
    now = datetime.datetime.utcnow()

    sig_input = f"TEST_EMAIL:{now.isoformat()}"
    dedup_hash = hashlib.sha256(sig_input.encode("utf-8")).hexdigest()

    create_alert_sql = """
    INSERT INTO alerts (project_code, alert_type, severity, title, description, trigger_reason, dedup_hash, status)
    VALUES ('SYSTEM_TEST', 'SYSTEM_AUDIT', 'INFO', '[NIRMAN AI TEST] Email Provider Diagnostics',
            'Controlled diagnostic test email triggered by administrator.',
            'Admin initiated SMTP provider verification test.', :hash, 'ACTIVE')
    RETURNING id;
    """
    with engine.begin() as conn:
        res = conn.execute(sqlalchemy.text(create_alert_sql), {"hash": dedup_hash})
        row = res.fetchone()
        alert_id = row[0]

    create_notif_sql = """
    INSERT INTO notifications (alert_id, recipient_user_id, channel, title, message, status)
    VALUES (:aid, :uid, 'EMAIL', '[NIRMAN AI TEST] Email Diagnostics', 'Controlled test email dispatch.', 'READ')
    RETURNING id;
    """
    with engine.begin() as conn:
        res = conn.execute(sqlalchemy.text(create_notif_sql), {"aid": alert_id, "uid": current_user.id})
        row = res.fetchone()
        notif_id = row[0]

    subject = "[NIRMAN AI TEST] Email Provider Diagnostic Test"
    body_text = f"Nirman AI Email Infrastructure Test\nTriggered by: {current_user.full_name} ({current_user.email})\nTimestamp: {now.isoformat()}\nStatus: Operational."
    body_html = f"<h3>NIRMAN AI EMAIL TEST</h3><p>Triggered by: <strong>{current_user.full_name}</strong> ({current_user.email})</p><p>Status: Operational.</p>"

    result = email_service.send_notification_email(
        notification_id=notif_id,
        recipient_email=req.recipient_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html
    )

    return {
        "message": "Test email provider check executed.",
        "recipient": req.recipient_email,
        "result": result
    }


@router.get("/email/health")
def get_email_provider_health(current_user: User = Depends(get_current_user)):
    """
    Retrieve dedicated email provider health & configuration diagnostic status.
    Does NOT send an email or expose credentials/secrets. Protected by existing authentication.
    """
    return email_service.diagnose_smtp_connection()


@router.post("/generate-alerts")
def trigger_alert_generation_scan(current_user: User = Depends(require_role(["ADMIN", "DECISION_MAKER"]))):
    """
    ADMIN / DECISION MAKER ONLY. Executes on-demand portfolio risk scan to evaluate alert conditions
    and dispatch grounded notifications.
    """
    scan_result = alert_engine.run_portfolio_alert_scan()
    return {
        "message": "On-demand portfolio alert evaluation scan completed.",
        "triggered_by": current_user.username,
        "results": scan_result
    }


@router.get("/health")
def get_notification_infrastructure_health(current_user: User = Depends(get_current_user)):
    """Retrieve operational health metrics for notification & email infrastructure."""
    engine = get_resilient_db_engine()

    status_info = email_service.get_status_info()

    counts_sql = """
        SELECT
            (SELECT COUNT(*) FROM alerts) as total_alerts,
            (SELECT COUNT(*) FROM notifications) as total_notifications,
            (SELECT COUNT(*) FROM notification_deliveries) as total_deliveries,
            (SELECT COUNT(*) FROM notification_deliveries WHERE status IN ('SENT', 'DELIVERED')) as successful_deliveries,
            (SELECT COUNT(*) FROM notification_deliveries WHERE status = 'FAILED') as failed_deliveries;
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(counts_sql), conn)

    row = df.iloc[0] if not df.empty else {}

    return {
        "email_service": status_info,
        "total_alerts": int(row.get("total_alerts", 0)),
        "total_notifications": int(row.get("total_notifications", 0)),
        "total_deliveries": int(row.get("total_deliveries", 0)),
        "successful_deliveries": int(row.get("successful_deliveries", 0)),
        "failed_deliveries": int(row.get("failed_deliveries", 0)),
        "status": "HEALTHY" if status_info["configured"] else "UNCONFIGURED_SMTP"
    }
