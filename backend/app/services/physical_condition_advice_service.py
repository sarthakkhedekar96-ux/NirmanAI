"""
backend/app/services/physical_condition_advice_service.py

Phase 19A — Dedicated Deterministic Physical-Condition Advice Engine.
Translates live environmental observations and operational severity into practical,
traceable, hazard-driven site/worker/material guidance across 6 core construction categories:
1. worker_safety
2. materials
3. equipment
4. site_operations
5. access_mobility
6. concrete_construction

STRICT INVARIANTS:
- Deterministic & rule-based (zero ML dependencies).
- Traceable via `advice_basis` and `generated_by`.
- Deduplicated & prioritized for combined hazards.
- Returns explicit UNAVAILABLE structure when weather provider data is absent.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("nirman.physical_condition_advice")

ADVICE_GENERATOR_ID = "RULE_BASED_ENVIRONMENTAL_ENGINE"


def get_physical_condition_advice(
    weather_data: Optional[Dict[str, Any]],
    severity_info: Optional[Dict[str, Any]],
    sector: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes categorized, traceable operational advice from weather observations.
    """
    if not weather_data or not severity_info or severity_info.get("overall_severity") == "UNAVAILABLE":
        return {
            "status": "UNAVAILABLE",
            "priority": "UNAVAILABLE",
            "hazards": [],
            "categories": {
                "worker_safety": ["Environmental data temporarily unavailable. Maintain standard baseline safety."],
                "materials": ["Ensure standard weatherproof material storage."],
                "equipment": ["Follow manufacturer operational guidelines."],
                "site_operations": ["Monitor local meteorological bulletins."],
                "access_mobility": ["Maintain standard haul road maintenance."],
                "concrete_construction": ["Follow standard curing protocols."]
            },
            "recommendations": ["Environmental data temporarily unavailable."],
            "advice_basis": ["Weather provider data unavailable"],
            "generated_by": ADVICE_GENERATOR_ID
        }

    precip = float(weather_data.get("precipitation_mm") or 0.0)
    wind = float(weather_data.get("wind_speed_kmh") or 0.0)
    temp = float(weather_data.get("temperature_c") or 25.0)
    humidity = float(weather_data.get("humidity_pct") or 50.0)

    overall_sev = (severity_info.get("overall_severity") or "NORMAL").upper()
    precip_sev = (severity_info.get("precipitation_severity") or "NORMAL").upper()
    wind_sev = (severity_info.get("wind_severity") or "NORMAL").upper()
    temp_sev = (severity_info.get("temperature_severity") or "NORMAL").upper()
    humidity_sev = (severity_info.get("humidity_severity") or "NORMAL").upper()

    worker_safety: List[str] = []
    materials: List[str] = []
    equipment: List[str] = []
    site_operations: List[str] = []
    access_mobility: List[str] = []
    concrete_construction: List[str] = []

    hazards: List[str] = []
    advice_basis: List[str] = []

    # 1. HEAVY RAINFALL
    if precip >= 15.0:
        hazards.append(f"Heavy rainfall ({precip:.1f} mm - {precip_sev})")
        advice_basis.append(f"Triggered by rainfall severity: {precip_sev}")

        worker_safety.append("Provide waterproof rain gear and slip-resistant safety boots for essential site personnel.")
        materials.append("Cover exposed cement bags, aggregate stockpiles, and water-sensitive building supplies.")
        equipment.append("Park heavy machinery on elevated, well-drained ground away from excavation edges.")
        site_operations.append("Inspect site drainage channels, sumps, and temporary dewatering pump capacity.")
        access_mobility.append("Reassess unpaved site haul-road stability, slope integrity, and mud accumulation.")
        concrete_construction.append("Suspend open-air concrete pouring and asphalt laying during high rainfall windows.")

    elif precip >= 5.0:
        hazards.append(f"Moderate rainfall ({precip:.1f} mm - {precip_sev})")
        advice_basis.append(f"Triggered by rainfall severity: {precip_sev}")

        site_operations.append("Ensure site drainage channels remain unblocked and clear of debris.")
        access_mobility.append("Monitor unpaved haul roads for surface mud accumulation.")

    # 2. HIGH WIND
    if wind >= 35.0:
        hazards.append(f"Strong wind ({wind:.1f} km/h - {wind_sev})")
        advice_basis.append(f"Triggered by wind severity: {wind_sev}")

        worker_safety.append("Suspend high-altitude structural work, scaffolding assembly, and exposed roofing tasks.")
        materials.append("Secure lightweight cladding, roofing sheets, formwork panels, and loose debris.")
        equipment.append("Halt tower crane operations, boom arm extensions, and heavy lifting activities.")
        site_operations.append("Conduct site-wide wind-load inspection for temporary hoarding, fencing, and signboards.")
        access_mobility.append("Restrict high-level walkways and exposed perimeter access routes during wind gusts.")

    elif wind >= 20.0:
        hazards.append(f"Elevated wind ({wind:.1f} km/h - {wind_sev})")
        advice_basis.append(f"Triggered by wind severity: {wind_sev}")

        materials.append("Secure lightweight material sheets and apply water suppression for dust dispersal.")

    # 3. EXTREME HEAT
    if temp >= 38.0 or humidity_sev in ("HIGH", "ELEVATED"):
        hazards.append(f"Extreme heat ({temp:.1f}°C, {humidity:.0f}% humidity - {temp_sev})")
        advice_basis.append(f"Triggered by temperature severity: {temp_sev}")

        worker_safety.append("Adjust outdoor work shifts to early morning or late afternoon hours. Establish shaded rest stations and mandatory hydration breaks.")
        materials.append("Protect temperature-sensitive materials, asphalt mix, and aggregates from direct solar radiation.")
        equipment.append("Monitor hydraulic fluid temperatures and cooling systems on heavy earthmoving machinery.")
        site_operations.append("Reduce exposed high-intensity physical tasks during peak midday thermal hours.")
        concrete_construction.append("Apply wet curing, shading, or concrete curing compounds to prevent rapid moisture loss and thermal cracking.")

    elif temp >= 35.0:
        hazards.append(f"Elevated heat ({temp:.1f}°C - {temp_sev})")
        advice_basis.append(f"Triggered by temperature severity: {temp_sev}")

        worker_safety.append("Ensure adequate hydration facilities and monitor site personnel for thermal discomfort.")

    # 4. FREEZING / COLD
    if temp <= 0.0:
        hazards.append(f"Freezing temperature ({temp:.1f}°C - {temp_sev})")
        advice_basis.append(f"Triggered by temperature: <=0°C ({temp_sev})")

        worker_safety.append("Provide cold-weather PPE, insulated gloves, windproof thermal gear, and warm break facilities.")
        materials.append("Protect exposed water supply lines, raw aggregates, and wet materials from freezing.")
        equipment.append("Inspect hydraulics, battery power, and engine block heaters in freezing ambient temperatures.")
        site_operations.append("Inspect site haul roads and walkways for icing or sub-zero slip hazards.")
        access_mobility.append("Manage slip hazards on access stairways, scaffolds, and unpaved haul roads.")
        concrete_construction.append("Implement cold-weather concrete curing, insulated blankets, or heated enclosures to prevent freezing damage.")

    elif temp <= 5.0:
        hazards.append(f"Cold temperature ({temp:.1f}°C - {temp_sev})")
        advice_basis.append(f"Triggered by temperature: <=5°C ({temp_sev})")

        worker_safety.append("Provide windbreaks and warm break facilities for site personnel.")
        concrete_construction.append("Monitor concrete setting times and insulate exposed pipework.")

    # 5. NORMAL / FALLBACK
    if overall_sev == "NORMAL" or not advice_basis:
        advice_basis.append("Baseline environmental parameters within normal bounds")
        worker_safety.append("Maintain standard site safety and personal protective equipment (PPE) compliance.")
        materials.append("Follow standard weather-resistant storage guidelines for on-site inventory.")
        equipment.append("Perform routine equipment inspection and standard preventive maintenance.")
        site_operations.append("Continue regular construction schedule and standard operational monitoring.")
        access_mobility.append("Maintain clear access corridors and standard site haul road upkeep.")
        concrete_construction.append("Apply standard concrete curing and quality control procedures.")

    # Deduplicate advice lists while preserving order
    def _dedup(items: List[str]) -> List[str]:
        seen = set()
        out = []
        for x in items:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    cat_dict = {
        "worker_safety": _dedup(worker_safety),
        "materials": _dedup(materials),
        "equipment": _dedup(equipment),
        "site_operations": _dedup(site_operations),
        "access_mobility": _dedup(access_mobility),
        "concrete_construction": _dedup(concrete_construction)
    }

    # Consolidated flat recommendations list (prioritized top items across categories)
    all_recs: List[str] = []
    for cat in ["worker_safety", "site_operations", "materials", "equipment", "access_mobility", "concrete_construction"]:
        all_recs.extend(cat_dict[cat])
    recommendations = _dedup(all_recs)

    return {
        "status": "AVAILABLE",
        "priority": overall_sev,
        "hazards": hazards,
        "categories": cat_dict,
        "recommendations": recommendations,
        "advice_basis": advice_basis,
        "generated_by": ADVICE_GENERATOR_ID
    }
