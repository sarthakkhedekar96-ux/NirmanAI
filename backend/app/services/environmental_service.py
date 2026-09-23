"""
backend/app/services/environmental_service.py

Phase 16 — Environmental Intelligence & Physical-Condition Advice Service.
Provides deterministic severity rules, project impact assessments, 24-hour disruption window identification,
and Contextual Priority calculation.

CRITICAL INVARIANT: Environmental Intelligence NEVER overwrites composite_risk_score,
predicted_severe_risk_prob, risk_category, or SHAP driver contributions.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.services.location_service import resolve_project_location
from backend.app.services.weather_provider import get_weather_provider
from backend.app.services.cache_service import cache_service
from backend.app.services.physical_condition_advice_service import get_physical_condition_advice

logger = logging.getLogger("nirman.environmental_service")

# ── Deterministic Environmental Severity Engine ─────────────────────────────────

SEVERITY_LEVELS = ["NORMAL", "WATCH", "ELEVATED", "HIGH", "SEVERE"]

def _rank_severity(sev: str) -> int:
    try:
        return SEVERITY_LEVELS.index(sev.upper())
    except ValueError:
        return 0

def calculate_environmental_severity(weather_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes transparent rule-based environmental severity from current weather observations.
    Thresholds are labeled as 'Nirman AI operational assessment'.
    """
    if not weather_data:
        weather_data = {}

    precip = float(weather_data.get("precipitation_mm") or 0.0)
    wind = float(weather_data.get("wind_speed_kmh") or 0.0)
    temp = float(weather_data.get("temperature_c") or 25.0)
    humidity = float(weather_data.get("humidity_pct") or 50.0)

    precip_sev = "NORMAL"
    if precip >= 50.0:
        precip_sev = "SEVERE"
    elif precip >= 25.0:
        precip_sev = "HIGH"
    elif precip >= 15.0:
        precip_sev = "ELEVATED"
    elif precip >= 5.0:
        precip_sev = "WATCH"

    wind_sev = "NORMAL"
    if wind >= 60.0:
        wind_sev = "SEVERE"
    elif wind >= 45.0:
        wind_sev = "HIGH"
    elif wind >= 30.0:
        wind_sev = "ELEVATED"
    elif wind >= 20.0:
        wind_sev = "WATCH"

    temp_sev = "NORMAL"
    if temp >= 44.0 or temp <= 0.0:
        temp_sev = "SEVERE"
    elif temp >= 40.0 or temp <= 3.0:
        temp_sev = "HIGH"
    elif temp >= 37.0 or temp <= 5.0:
        temp_sev = "ELEVATED"
    elif temp >= 35.0:
        temp_sev = "WATCH"

    # Compound humidity factor: High temp (>35C) combined with High Humidity (>75%) increases thermal stress
    humidity_factor = "NORMAL"
    if temp >= 38.0 and humidity >= 70.0:
        humidity_factor = "HIGH"
    elif temp >= 35.0 and humidity >= 75.0:
        humidity_factor = "ELEVATED"

    # Overall severity is the maximum of individual factor severities
    factors = [precip_sev, wind_sev, temp_sev, humidity_factor]
    overall_sev = max(factors, key=_rank_severity)

    active_factors = []
    if precip_sev != "NORMAL":
        active_factors.append(f"Precipitation ({precip:.1f} mm - {precip_sev})")
    if wind_sev != "NORMAL":
        active_factors.append(f"Wind Speed ({wind:.1f} km/h - {wind_sev})")
    if temp_sev != "NORMAL":
        active_factors.append(f"Temperature ({temp:.1f}°C - {temp_sev})")
    if humidity_factor != "NORMAL":
        active_factors.append(f"Heat & Humidity ({humidity:.1f}% humidity - {humidity_factor})")

    return {
        "overall_severity": overall_sev,
        "precipitation_severity": precip_sev,
        "wind_severity": wind_sev,
        "temperature_severity": temp_sev,
        "humidity_severity": humidity_factor,
        "active_hazard_factors": active_factors,
        "assessment_label": "Nirman AI operational assessment"
    }


# ── Physical-Condition Advice Engine ───────────────────────────────────────────

def assess_project_impacts(weather_data: Dict[str, Any], severity_info: Dict[str, Any], sector: Optional[str] = None) -> Dict[str, Any]:
    """
    Deterministic advice engine mapping environmental conditions to potential construction impacts
    and evidence-based operational precautions using non-causal advisory terminology.
    """
    if not weather_data:
        weather_data = {}

    precip = float(weather_data.get("precipitation_mm") or 0.0)
    wind = float(weather_data.get("wind_speed_kmh") or 0.0)
    temp = float(weather_data.get("temperature_c") or 25.0)

    potential_impacts = []
    recommended_actions = []

    # Rainfall impacts
    if precip >= 15.0:
        potential_impacts.extend([
            "Possible excavation disruption and earthwork delays due to ground saturation",
            "Potential access-road waterlogging restricting heavy equipment movement",
            "Concrete pouring and asphalt paving activities may require rescheduling",
            "Site drainage and temporary pumping capacity overload risk"
        ])
        recommended_actions.extend([
            "Review outdoor work planned during the rainfall window",
            "Inspect temporary drainage, silt traps, and pumping arrangements",
            "Protect exposed construction materials, aggregate stockpiles, and cement storage",
            "Reassess site haul-road access conditions and slope stability"
        ])
    elif precip >= 5.0:
        potential_impacts.append("Minor site waterlogging and mud accumulation on haul roads")
        recommended_actions.append("Ensure site drainage channels remain unblocked and clear")

    # Wind impacts
    if wind >= 35.0:
        potential_impacts.extend([
            "Tower crane and heavy lifting operation safety restrictions",
            "Scaffolding, formwork, and temporary structure wind-load vulnerability",
            "High-altitude work safety hazards and elevated dust dispersal"
        ])
        recommended_actions.extend([
            "Halt tower crane operations and secure loose site materials",
            "Inspect scaffolding anchors, bracing, and debris netting",
            "Suspend high-altitude structural work during peak wind gusts"
        ])
    elif wind >= 20.0:
        potential_impacts.append("Light material displacement and dust during elevated gusts")
        recommended_actions.append("Secure lightweight material sheets and apply water suppression for dust")

    # Extreme Heat impacts
    if temp >= 38.0:
        potential_impacts.extend([
            "Worker heat exposure, dehydration, and reduced physical work efficiency",
            "Rapid concrete moisture loss and potential thermal cracking during curing",
            "Overheating risks for heavy equipment hydraulic systems"
        ])
        recommended_actions.extend([
            "Adjust outdoor work shifts to early morning or late afternoon hours",
            "Establish shaded rest stations and mandatory hydration breaks for site personnel",
            "Apply wet curing methods, shading, or concrete curing compounds"
        ])
    elif temp >= 35.0:
        potential_impacts.append("Elevated ambient thermal stress on outdoor site personnel")
        recommended_actions.append("Ensure adequate hydration facilities and monitor worker thermal discomfort")

    # Extreme Cold / Sub-zero temperature impacts
    if temp <= 0.0:
        potential_impacts.extend([
            "Cold-weather worker safety concerns, potential cold stress risks, and reduced physical dexterity",
            "Frost and freezing risks for exposed water lines, wet materials, and equipment hydraulic systems where applicable",
            "Sub-zero concrete curing complications and potential mortar freeze risks",
            "Possible outdoor work disruption and haul road icing or slip hazards"
        ])
        recommended_actions.extend([
            "Review outdoor work schedules and implement shift rotations with warm rest facilities",
            "Provide appropriate cold-weather PPE, insulated gloves, and windproof thermal gear",
            "Increase worker safety monitoring for cold stress symptoms",
            "Protect exposed water supply lines, equipment hydraulics, and wet materials from freezing where applicable"
        ])
    elif temp <= 5.0:
        potential_impacts.extend([
            "Worker thermal discomfort and reduced dexterity during prolonged outdoor tasks",
            "Potential concrete setting delay and cold-temperature material vulnerability"
        ])
        recommended_actions.extend([
            "Provide windbreaks and warm break facilities for site personnel",
            "Monitor concrete curing temperatures and insulate exposed pipework where applicable"
        ])

    # Defensive safety check: ensure generic NORMAL message is ONLY returned when overall_severity is NORMAL
    overall_sev = (severity_info.get("overall_severity") or "NORMAL").upper() if severity_info else "NORMAL"
    active_hazards = severity_info.get("active_hazard_factors", []) if severity_info else []

    if not potential_impacts:
        if overall_sev != "NORMAL" or active_hazards:
            potential_impacts.append(f"Potential operational impacts related to active environmental condition: {', '.join(active_hazards) if active_hazards else overall_sev}")
        else:
            potential_impacts.append("No significant adverse physical impacts detected under current weather conditions")

    if not recommended_actions:
        if overall_sev != "NORMAL" or active_hazards:
            recommended_actions.append(f"Monitor site safety procedures for active weather conditions ({overall_sev})")
        else:
            recommended_actions.append("Maintain standard site safety and environmental monitoring procedures")

    return {
        "potential_impacts": potential_impacts,
        "recommended_actions": recommended_actions
    }


# ── 24-Hour Forecast Disruption Window Identification ───────────────────────────

def extract_disruption_windows(forecast_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Processes 24-hour forecast data to identify potential upcoming disruption windows.
    Thresholds: precipitation > 15 mm, wind > 35 km/h, temperature > 38°C or <= 0°C.
    """
    if not forecast_data or "hourly_forecast" not in forecast_data:
        return []

    hourly = forecast_data.get("hourly_forecast", [])
    if not hourly:
        return []

    disruption_windows = []
    
    for idx, h in enumerate(hourly[:24]):
        p_val = float(h.get("precipitation_mm", 0.0))
        w_val = float(h.get("wind_speed_kmh", 0.0))
        t_val = float(h.get("temperature_c", 25.0))
        time_str = h.get("time", "")

        if p_val > 15.0 or w_val > 35.0 or t_val > 38.0 or t_val <= 0.0:
            hazard_type = "Precipitation" if p_val > 15.0 else ("High Wind" if w_val > 35.0 else ("Extreme Heat" if t_val > 38.0 else "Extreme Cold"))
            disruption_windows.append({
                "time": time_str,
                "hour_offset": idx + 1,
                "hazard_type": hazard_type,
                "intensity": f"{p_val:.1f} mm rain" if p_val > 15.0 else (f"{w_val:.1f} km/h wind" if w_val > 35.0 else (f"{t_val:.1f}°C heat" if t_val > 38.0 else f"{t_val:.1f}°C cold")),
                "advisory": f"{hazard_type} disruption window forecast in {idx + 1} hours. Outdoor tasks may require rescheduling."
            })

    return disruption_windows[:5]



# ── Contextual Priority Deterministic Escalation Matrix ────────────────────────

def compute_contextual_priority(base_risk_category: str, env_severity: str, data_available: bool = True) -> Dict[str, Any]:
    """
    Computes Contextual Priority combining Base ML Risk Category and Environmental Severity.
    STRICT COMPLIANCE:
    - Does NOT modify base ML risk score or risk_category.
    - If data is UNAVAILABLE, contextual_priority is NOT escalated due to weather.
    """
    category_clean = (base_risk_category or "LOW").upper()

    if not data_available or env_severity.upper() == "UNAVAILABLE":
        return {
            "level": "NORMAL",
            "escalated": False,
            "reason": "Environmental context unavailable. Base ML project risk score remains unchanged.",
            "label": "Contextual Priority"
        }

    env_clean = env_severity.upper()

    # Contextual Escalation Matrix:
    # LOW/MODERATE + NORMAL/WATCH -> NORMAL
    # LOW/MODERATE + ELEVATED/HIGH/SEVERE -> ELEVATED
    # HIGH + NORMAL/WATCH -> ELEVATED
    # HIGH + ELEVATED/HIGH/SEVERE -> HIGH ATTENTION
    # CRITICAL + NORMAL/WATCH -> HIGH ATTENTION
    # CRITICAL + ELEVATED/HIGH/SEVERE -> CRITICAL ATTENTION

    if category_clean in ("LOW", "MODERATE"):
        if env_clean in ("HIGH", "SEVERE", "ELEVATED"):
            level = "ELEVATED"
            reason = f"Moderate base project risk coincides with {env_clean.lower()} environmental conditions."
            escalated = True
        else:
            level = "NORMAL"
            reason = "Base project risk and environmental conditions are within standard operational limits."
            escalated = False

    elif category_clean == "HIGH":
        if env_clean in ("HIGH", "SEVERE", "ELEVATED"):
            level = "HIGH ATTENTION"
            reason = "High base project risk coincides with adverse environmental conditions."
            escalated = True
        else:
            level = "ELEVATED"
            reason = "High base project risk requires attention under current weather conditions."
            escalated = False

    elif category_clean == "CRITICAL":
        if env_clean in ("HIGH", "SEVERE", "ELEVATED"):
            level = "CRITICAL ATTENTION"
            reason = "Critical base project risk coincides with severe environmental conditions requiring immediate priority."
            escalated = True
        else:
            level = "HIGH ATTENTION"
            reason = "Critical base project risk under standard weather conditions."
            escalated = False
    else:
        level = "NORMAL"
        reason = "Base project risk within standard parameters."
        escalated = False

    return {
        "level": level,
        "escalated": escalated,
        "reason": reason,
        "label": "Contextual Priority"
    }


# ── Full Environmental Report Orchestrator ─────────────────────────────────────

class EnvironmentalService:
    @staticmethod
    def get_project_environmental_report(project: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gathers live environmental data, location precision, assessment, physical advice,
        forecast disruption windows, and Contextual Priority for a project.
        Consumes authoritative ML risk assessment directly from RiskEngineService.
        """
        from backend.app.services.risk_engine import risk_engine_service

        project_code = project.get("project_code", "UNKNOWN")

        # Authoritative existing ML risk evaluation retrieval
        risk_assessment = risk_engine_service.get_project_risk_assessment(project_code)
        if risk_assessment:
            base_score = float(risk_assessment.get("composite_risk_score") or risk_assessment.get("risk_score") or 0.0)
            base_category = str(risk_assessment.get("risk_category") or "LOW")
        elif project.get("composite_risk_score") is not None or project.get("risk_score") is not None:
            base_score = float(project.get("composite_risk_score") or project.get("risk_score") or 0.0)
            base_category = str(project.get("risk_category") or project.get("category") or "LOW")
        else:
            orig_cost = float(project.get("original_cost") or 1.0)
            antic_cost = float(project.get("latest_anticipated_cost") or project.get("anticipated_cost") or orig_cost)
            cost_overrun_pct = max(0.0, (antic_cost - orig_cost) / orig_cost * 100) if orig_cost > 0 else 0.0
            delay_m = float(project.get("latest_delay_months") or project.get("delay_months") or 0.0)

            if cost_overrun_pct > 50 or delay_m > 36:
                base_category = "CRITICAL"
                base_score = 85.0
            elif cost_overrun_pct > 20 or delay_m > 12:
                base_category = "HIGH"
                base_score = 60.0
            elif cost_overrun_pct > 5 or delay_m > 3:
                base_category = "MODERATE"
                base_score = 35.0
            else:
                base_category = "LOW"
                base_score = 15.0

        # Resolve location precision (HIGH / MEDIUM / LOW)
        loc_meta = resolve_project_location(project)
        lat = loc_meta["latitude"]
        lng = loc_meta["longitude"]

        # Cache key based on rounded lat/lng
        cache_key_current = f"env:current:{lat:.2f}:{lng:.2f}"
        cache_key_forecast = f"env:forecast:{lat:.2f}:{lng:.2f}"

        # Fetch Weather Data with Cache Check
        current_weather = cache_service.get(cache_key_current)
        provider = get_weather_provider()

        if current_weather is None:
            current_weather = provider.get_current_weather(lat, lng)
            if current_weather:
                cache_service.set(cache_key_current, current_weather, ttl_seconds=600)  # 10 minutes

        forecast_data = cache_service.get(cache_key_forecast)
        if forecast_data is None and current_weather is not None:
            forecast_data = provider.get_forecast(lat, lng)
            if forecast_data:
                cache_service.set(cache_key_forecast, forecast_data, ttl_seconds=1800)  # 30 minutes

        # Check Data Availability
        data_available = current_weather is not None
        environmental_status = "AVAILABLE" if data_available else "UNAVAILABLE"

        if not data_available:
            severity_info = {
                "overall_severity": "UNAVAILABLE",
                "precipitation_severity": "NORMAL",
                "wind_severity": "NORMAL",
                "temperature_severity": "NORMAL",
                "humidity_severity": "NORMAL",
                "active_hazard_factors": [],
                "assessment_label": "Nirman AI operational assessment"
            }
            advice_details = get_physical_condition_advice(None, severity_info, sector=project.get("sector"))
            advice = {
                "potential_impacts": ["Environmental data temporarily unavailable."],
                "recommended_actions": ["Monitor local meteorological reports directly if severe weather occurs."],
                "status": "UNAVAILABLE",
                "priority": "UNAVAILABLE",
                "hazards": [],
                "categories": advice_details.get("categories", {}),
                "advice_basis": advice_details.get("advice_basis", []),
                "generated_by": advice_details.get("generated_by", "RULE_BASED_ENVIRONMENTAL_ENGINE")
            }
            disruption_windows = []
            contextual_priority = compute_contextual_priority(base_category, "UNAVAILABLE", data_available=False)
            weather_payload = None
        else:
            severity_info = calculate_environmental_severity(current_weather)
            advice_details = get_physical_condition_advice(current_weather, severity_info, sector=project.get("sector"))
            legacy_impacts_actions = assess_project_impacts(current_weather, severity_info, sector=project.get("sector"))
            advice = {
                "potential_impacts": legacy_impacts_actions.get("potential_impacts", []),
                "recommended_actions": legacy_impacts_actions.get("recommended_actions", []),
                "status": advice_details.get("status", "AVAILABLE"),
                "priority": advice_details.get("priority", "NORMAL"),
                "hazards": advice_details.get("hazards", []),
                "categories": advice_details.get("categories", {}),
                "advice_basis": advice_details.get("advice_basis", []),
                "generated_by": advice_details.get("generated_by", "RULE_BASED_ENVIRONMENTAL_ENGINE")
            }
            disruption_windows = extract_disruption_windows(forecast_data)
            contextual_priority = compute_contextual_priority(base_category, severity_info["overall_severity"], data_available=True)
            weather_payload = current_weather


        return {
            "project_code": project_code,
            "environmental_data_status": environmental_status,
            "location": loc_meta,
            "weather": weather_payload,
            "environmental_assessment": severity_info,
            "physical_condition_advice": advice,
            "disruption_windows": disruption_windows,
            "contextual_priority": contextual_priority,
            "base_ml_risk": {
                "composite_risk_score": base_score,
                "risk_category": base_category,
                "unaltered_guarantee": True
            },
            "forecast_outlook": forecast_data.get("hourly_forecast", [])[:24] if forecast_data else [],
            "observed_at": weather_payload.get("observed_at") if weather_payload else datetime.now(timezone.utc).isoformat(),
            "source": weather_payload.get("source") if weather_payload else "None (Unavailable)"
        }
