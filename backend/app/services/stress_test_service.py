"""
backend/app/services/stress_test_service.py

Phase 18 — Synthetic Stress-Test / What-If Scenario Simulation Engine.
Enables interactive decision-support simulation of hypothetical cost, schedule,
environmental, and clearance disruptions on infrastructure project risk indicators.

STRICT INVARIANTS:
1. ABSOLUTE ZERO DATABASE MUTATION — Operates on in-memory deep copies only.
2. Does NOT alter production ML risk scores, Platt scaling, T*=0.28, or SHAP calculations.
3. Actual project baseline 020100044 strictly remains 76.07 / HIGH / 0.7607 / true.
4. Clearly labels all output as SYNTHETIC SCENARIO data.
"""

import math
import copy
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator

from backend.app.services.project_service import get_project_details
from backend.app.services.risk_engine import risk_engine_service
from backend.app.services.environmental_service import (
    EnvironmentalService, calculate_environmental_severity, assess_project_impacts, compute_contextual_priority
)
from backend.app.services.dependency_service import dependency_service

logger = logging.getLogger("nirman.stress_test_service")


# ── Scenario Pydantic Schemas & Parameter Validators ───────────────────────────

class ScenarioChanges(BaseModel):
    additional_delay_months: float = Field(default=0.0, ge=0.0, le=120.0, description="Additional delay in months (0-120)")
    cost_overrun_percent: float = Field(default=0.0, ge=0.0, le=500.0, description="Cost overrun percentage increase (0-500%)")
    rainfall_multiplier: float = Field(default=1.0, ge=0.1, le=10.0, description="Precipitation multiplier (0.1x - 10.0x)")
    wind_multiplier: float = Field(default=1.0, ge=0.1, le=5.0, description="Wind speed multiplier (0.1x - 5.0x)")
    temperature_delta_c: float = Field(default=0.0, ge=-30.0, le=30.0, description="Temperature delta in Celsius (-30°C to +30°C)")
    clearance_delay_months: float = Field(default=0.0, ge=0.0, le=60.0, description="Clearance authority delay in months (0-60)")
    dependency_disruption: bool = Field(default=False, description="Simulate major cross-department coordination disruption")

    @validator("*", pre=True)
    def validate_numbers(cls, v):
        if isinstance(v, (int, float)):
            if math.isnan(v) or math.isinf(v):
                raise ValueError("Invalid numeric value: NaN and Infinity are not permitted.")
        return v


class StressTestRequest(BaseModel):
    scenario_name: str = Field(default="Custom", description="Scenario label (e.g. Cost Pressure, Schedule Slip, Combined Stress)")
    changes: ScenarioChanges = Field(default_factory=ScenarioChanges)


# ── Presets Registry ──────────────────────────────────────────────────────────

SCENARIO_PRESETS: Dict[str, Dict[str, Any]] = {
    "BASELINE": {
        "scenario_name": "Baseline",
        "description": "Actual production project baseline with zero synthetic modifications.",
        "changes": {
            "additional_delay_months": 0.0,
            "cost_overrun_percent": 0.0,
            "rainfall_multiplier": 1.0,
            "wind_multiplier": 1.0,
            "temperature_delta_c": 0.0,
            "clearance_delay_months": 0.0,
            "dependency_disruption": False
        }
    },
    "COST_PRESSURE": {
        "scenario_name": "Cost Pressure (+10%)",
        "description": "Simulates an immediate 10% budget overrun escalation.",
        "changes": {
            "additional_delay_months": 0.0,
            "cost_overrun_percent": 10.0,
            "rainfall_multiplier": 1.0,
            "wind_multiplier": 1.0,
            "temperature_delta_c": 0.0,
            "clearance_delay_months": 0.0,
            "dependency_disruption": False
        }
    },
    "SCHEDULE_SLIP": {
        "scenario_name": "Schedule Slip (+6 Months)",
        "description": "Simulates a 6-month execution slippage due to site impediments.",
        "changes": {
            "additional_delay_months": 6.0,
            "cost_overrun_percent": 0.0,
            "rainfall_multiplier": 1.0,
            "wind_multiplier": 1.0,
            "temperature_delta_c": 0.0,
            "clearance_delay_months": 0.0,
            "dependency_disruption": False
        }
    },
    "EXTREME_WEATHER": {
        "scenario_name": "Extreme Weather Impact",
        "description": "Simulates adverse monsoon precipitation (2.5x rain) and elevated heat (+5°C).",
        "changes": {
            "additional_delay_months": 0.0,
            "cost_overrun_percent": 0.0,
            "rainfall_multiplier": 2.5,
            "wind_multiplier": 1.2,
            "temperature_delta_c": 5.0,
            "clearance_delay_months": 0.0,
            "dependency_disruption": False
        }
    },
    "COMBINED_STRESS": {
        "scenario_name": "Combined Compound Stress",
        "description": "Simulates compound strain (+10% cost, +6m delay, 1.5x rain, clearance delay).",
        "changes": {
            "additional_delay_months": 6.0,
            "cost_overrun_percent": 10.0,
            "rainfall_multiplier": 1.5,
            "wind_multiplier": 1.0,
            "temperature_delta_c": 0.0,
            "clearance_delay_months": 3.0,
            "dependency_disruption": True
        }
    }
}


# ── Stress-Test Simulation Service ───────────────────────────────────────────

class StressTestService:
    @staticmethod
    def classify_risk_category(score: float) -> str:
        """Categorizes composite risk score based strictly on established thresholds."""
        if score < 30.0:
            return "LOW"
        elif score < 60.0:
            return "MODERATE"
        elif score < 80.0:
            return "HIGH"
        else:
            return "CRITICAL"

    @staticmethod
    def load_project_baseline(project_code: str) -> Optional[Dict[str, Any]]:
        """
        Loads actual production project baseline and deep copies all fields to ensure total in-memory isolation.
        """
        pcode = str(project_code).strip()
        p_details = get_project_details(pcode)
        if not p_details:
            return None

        ml_risk = risk_engine_service.get_project_risk_assessment(pcode) or {}
        env_rep = EnvironmentalService.get_project_environmental_report(p_details) or {}
        dep_graph = dependency_service.build_project_dependency_graph(pcode) or {}

        base_score = float(ml_risk.get("risk_score") or ml_risk.get("composite_risk_score") or 50.0)
        base_cat = str(ml_risk.get("risk_category") or "MODERATE").upper()
        base_prob = float(ml_risk.get("predicted_severe_risk_prob") or (base_score / 100.0))
        early_warn = bool(ml_risk.get("early_warning", base_prob >= 0.28))

        orig_cost = float(p_details.get("original_cost") or 0.0)
        ant_cost = float(p_details.get("latest_anticipated_cost") or orig_cost)
        cost_overrun_pct = max(0.0, ((ant_cost - orig_cost) / orig_cost * 100.0)) if orig_cost > 0 else 0.0
        delay_m = float(p_details.get("latest_delay_months") or 0.0)
        progress_pct = float(p_details.get("latest_physical_progress") or 0.0)

        env_status = env_rep.get("environmental_data_status", "UNAVAILABLE")
        env_sev = env_rep.get("environmental_assessment", {}).get("overall_severity", "UNAVAILABLE")
        cp_level = env_rep.get("contextual_priority", {}).get("level", "NORMAL")

        dep_summary = dep_graph.get("summary", {})

        return copy.deepcopy({
            "project_code": pcode,
            "project_name": p_details.get("project_name", f"Project {pcode}"),
            "agency": p_details.get("agency", "N/A"),
            "state": p_details.get("state", "N/A"),
            "original_cost": orig_cost,
            "anticipated_cost": ant_cost,
            "cost_overrun_percent": round(cost_overrun_pct, 2),
            "delay_months": delay_m,
            "physical_progress": progress_pct,
            "risk_score": base_score,
            "risk_category": base_cat,
            "predicted_severe_risk_prob": round(base_prob, 4),
            "early_warning": early_warn,
            "environmental_data_status": env_status,
            "environmental_severity": env_sev,
            "weather_observation": copy.deepcopy(env_rep.get("weather")),
            "contextual_priority_level": cp_level,
            "dependency_node_count": dep_summary.get("node_count", 0),
            "dependency_edge_count": dep_summary.get("edge_count", 0),
            "coordination_bottleneck_indicator": dep_summary.get("coordination_bottleneck_indicator", False),
            "risk_drivers": copy.deepcopy(ml_risk.get("risk_drivers", []))
        })

    @staticmethod
    def run_simulation(project_code: str, req: StressTestRequest) -> Dict[str, Any]:
        """
        Executes in-memory synthetic scenario simulation.
        ABSOLUTE INVARIANT: Zero database writes or production model mutations.
        """
        baseline = StressTestService.load_project_baseline(project_code)
        if not baseline:
            return {
                "simulation": True,
                "project_code": project_code,
                "error": f"Project code '{project_code}' not found.",
                "disclaimer": "Synthetic scenario execution failed — project not found."
            }

        ch = req.changes
        pcode = baseline["project_code"]

        # 1. Synthetic Risk Recalculation (In-Memory Feature Delta Equations)
        base_score = baseline["risk_score"]

        delta_cost_pts = ch.cost_overrun_percent * 0.45
        delta_delay_pts = ch.additional_delay_months * 0.85

        scenario_score = min(100.0, max(0.0, round(base_score + delta_cost_pts + delta_delay_pts, 2)))
        scenario_cat = StressTestService.classify_risk_category(scenario_score)
        scenario_prob = min(1.0, max(0.0, round(scenario_score / 100.0, 4)))
        scenario_early_warn = scenario_prob >= 0.28

        risk_method = "RULE_BASED_SCENARIO" if (ch.cost_overrun_percent > 0 or ch.additional_delay_months > 0) else "BASELINE_PRESERVED"

        # 2. Synthetic Environmental Recalculation
        synth_weather = None
        synth_env_sev = baseline["environmental_severity"]
        synth_env_status = baseline["environmental_data_status"]
        synth_advice = {"potential_impacts": [], "recommended_actions": []}

        if baseline["weather_observation"] and synth_env_status == "AVAILABLE":
            orig_w = baseline["weather_observation"]
            synth_weather = {
                "temperature_c": round(float(orig_w.get("temperature_c", 25.0)) + ch.temperature_delta_c, 1),
                "humidity_pct": float(orig_w.get("humidity_pct", 50.0)),
                "precipitation_mm": round(float(orig_w.get("precipitation_mm", 0.0)) * ch.rainfall_multiplier, 1),
                "wind_speed_kmh": round(float(orig_w.get("wind_speed_kmh", 10.0)) * ch.wind_multiplier, 1),
                "condition": orig_w.get("condition", "Observed"),
                "source": f"Hypothetical Scenario Weather (Simulated Context)"
            }
            sev_info = calculate_environmental_severity(synth_weather)
            synth_env_sev = sev_info["overall_severity"]
            synth_advice = assess_project_impacts(synth_weather, sev_info)
        else:
            synth_env_sev = "UNAVAILABLE"
            synth_advice = {
                "potential_impacts": ["Environmental data temporarily unavailable for weather scenario calculation."],
                "recommended_actions": ["Monitor local site weather reports directly."]
            }

        synth_cp = compute_contextual_priority(
            scenario_cat,
            synth_env_sev,
            data_available=(synth_env_status == "AVAILABLE")
        )

        # 3. Synthetic Dependency Context Recalculation
        synth_dep_bottleneck = baseline["coordination_bottleneck_indicator"] or ch.dependency_disruption or (ch.clearance_delay_months >= 3.0)
        synth_dep_note = []
        if ch.clearance_delay_months > 0:
            synth_dep_note.append(f"Simulated regulatory clearance delay of +{ch.clearance_delay_months:.1f} months.")
        if ch.dependency_disruption:
            synth_dep_note.append("Simulated cross-department coordination disruption active.")

        # 4. Impact & Deltas
        risk_delta = round(scenario_score - base_score, 2)
        prob_delta = round(scenario_prob - baseline["predicted_severe_risk_prob"], 4)

        summary_bullets = []
        if risk_delta != 0:
            summary_bullets.append(f"Synthetic composite risk score changed by {risk_delta:+.2f} points (from {base_score:.2f} to {scenario_score:.2f}).")
        if scenario_cat != baseline["risk_category"]:
            summary_bullets.append(f"Risk category escalated from {baseline['risk_category']} to {scenario_cat}.")
        if scenario_early_warn != baseline["early_warning"]:
            summary_bullets.append(f"Synthetic early warning status changed to {'BREACHED' if scenario_early_warn else 'CLEAR'}.")
        if ch.cost_overrun_percent > 0:
            summary_bullets.append(f"Simulated +{ch.cost_overrun_percent:.1f}% cost pressure added +{delta_cost_pts:.2f} risk points.")
        if ch.additional_delay_months > 0:
            summary_bullets.append(f"Simulated +{ch.additional_delay_months:.1f} months schedule slip added +{delta_delay_pts:.2f} risk points.")
        if synth_env_sev != baseline["environmental_severity"]:
            summary_bullets.append(f"Environmental severity shifted from {baseline['environmental_severity']} to {synth_env_sev}.")

        if not summary_bullets:
            summary_bullets.append("Scenario matches baseline parameters — zero synthetic impact detected.")

        return {
            "simulation": True,
            "project_code": pcode,
            "scenario_name": req.scenario_name,
            "baseline": {
                "risk_score": base_score,
                "risk_category": baseline["risk_category"],
                "predicted_severe_risk_prob": baseline["predicted_severe_risk_prob"],
                "early_warning": baseline["early_warning"],
                "cost_overrun_percent": baseline["cost_overrun_percent"],
                "delay_months": baseline["delay_months"],
                "physical_progress": baseline["physical_progress"],
                "environmental_severity": baseline["environmental_severity"],
                "contextual_priority": baseline["contextual_priority_level"],
                "coordination_bottleneck_indicator": baseline["coordination_bottleneck_indicator"]
            },
            "scenario": {
                "risk_score": scenario_score,
                "risk_category": scenario_cat,
                "predicted_severe_risk_prob": scenario_prob,
                "scenario_early_warning": scenario_early_warn,
                "cost_overrun_percent": ch.cost_overrun_percent,
                "additional_delay_months": ch.additional_delay_months,
                "simulated_cost_overrun_percent": round(baseline["cost_overrun_percent"] + ch.cost_overrun_percent, 2),
                "simulated_delay_months": round(baseline["delay_months"] + ch.additional_delay_months, 1),
                "environmental_severity": synth_env_sev,
                "environmental_context": {
                    "severity": synth_env_sev,
                    "weather": synth_weather,
                    "advice": synth_advice
                },
                "dependency_context": {
                    "synthetic_disruption": synth_dep_bottleneck,
                    "clearance_delay_months": ch.clearance_delay_months,
                    "notes": synth_dep_note
                },
                "contextual_priority": synth_cp.get("level"),
                "coordination_bottleneck_indicator": synth_dep_bottleneck,
                "weather_observation": synth_weather,
                "advice": synth_advice,
                "dependency_notes": synth_dep_note
            },
            "impact": {
                "risk_score_delta": risk_delta,
                "probability_delta": prob_delta,
                "cost_pressure_delta": ch.cost_overrun_percent,
                "schedule_delay_delta": ch.additional_delay_months,
                "category_changed": scenario_cat != baseline["risk_category"],
                "early_warning_changed": scenario_early_warn != baseline["early_warning"],
                "severity_changed": synth_env_sev != baseline["environmental_severity"],
                "summary_bullets": summary_bullets
            },
            "method": {
                "risk": risk_method,
                "environment": "CONTEXTUAL" if synth_env_status == "AVAILABLE" else "UNAVAILABLE",
                "dependencies": "CONTEXTUAL"
            },
            "disclaimer": "Synthetic scenario only. Actual project data was not modified. This simulation operates in memory and is a decision-support tool, not a prediction guarantee."
        }


stress_test_service = StressTestService()
