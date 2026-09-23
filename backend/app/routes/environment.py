"""
backend/app/routes/environment.py

Phase 16 — Environmental Intelligence REST API Endpoints.
Endpoints:
- GET /api/environment/project/{project_code}
- GET /api/environment/project/{project_code}/forecast
- GET /api/environment/project/{project_code}/assessment
- GET /api/environment/health
"""

import logging
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Dict, Any, Optional

from backend.app.services.project_service import get_project_details
from backend.app.services.environmental_service import EnvironmentalService
from backend.app.services.weather_provider import get_weather_provider
from backend.app.schemas.environmental import EnvironmentalReportResponse, PhysicalAdviceEndpointResponse
from backend.app.core.auth_dependencies import get_current_user, require_role
from backend.app.models.user import User

logger = logging.getLogger("nirman.routes.environment")

router = APIRouter(prefix="/api/environment", tags=["Environmental Intelligence"])


@router.get("/health")
def get_environmental_health() -> Dict[str, Any]:
    """Check status of environmental intelligence service and weather provider."""
    provider = get_weather_provider()
    return {
        "status": "ok",
        "provider": provider.__class__.__name__,
        "service": "Environmental Intelligence Layer",
        "caching": "Active (10m Current / 30m Forecast)"
    }


import concurrent.futures
from backend.app.services.cache_service import cache_service


def _fetch_single_state_report(state_name: str) -> tuple:
    try:
        report = EnvironmentalService.get_project_environmental_report({"state": state_name})
        return state_name, {
            "state": state_name,
            "environmental_data_status": report.get("environmental_data_status"),
            "location": report.get("location"),
            "weather": report.get("weather"),
            "environmental_assessment": report.get("environmental_assessment"),
            "disruption_windows": report.get("disruption_windows", [])
        }
    except Exception as e:
        logger.warning(f"Failed regional overview report for state '{state_name}': {e}")
        return state_name, {
            "state": state_name,
            "environmental_data_status": "UNAVAILABLE",
            "location": {"state": state_name, "resolution": "STATE_CENTROID", "precision": "LOW"},
            "weather": None,
            "environmental_assessment": None,
            "disruption_windows": []
        }


@router.get("/regional-overview")
def get_regional_environmental_overview(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get live environmental severity summary across Indian States & Union Territories
    for the Weather / Disaster Map Overlay on the GIS map.
    Consumes live Open-Meteo weather data per state centroid concurrently without fabricating data.
    """
    cached = cache_service.get("regional_environmental_overview")
    if cached is not None:
        return cached

    canonical_states = [
        "ANDAMAN AND NICOBAR ISLANDS", "ANDHRA PRADESH", "ARUNACHAL PRADESH", "ASSAM", "BIHAR",
        "CHANDIGARH", "CHHATTISGARH", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "DELHI", "GOA",
        "GUJARAT", "HARYANA", "HIMACHAL PRADESH", "JAMMU AND KASHMIR", "JHARKHAND", "KARNATAKA",
        "KERALA", "LADAKH", "MADHYA PRADESH", "MAHARASHTRA", "MANIPUR", "MEGHALAYA",
        "MIZORAM", "NAGALAND", "ODISHA", "PUDUCHERRY", "PUNJAB", "RAJASTHAN",
        "SIKKIM", "TAMIL NADU", "TELANGANA", "TRIPURA", "UTTAR PRADESH", "UTTARAKHAND", "WEST BENGAL"
    ]

    reports = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_map = {executor.submit(_fetch_single_state_report, s): s for s in canonical_states}
        for future in concurrent.futures.as_completed(future_map):
            try:
                state_name, report_data = future.result()
                reports[state_name] = report_data
            except Exception as ex:
                s_name = future_map[future]
                reports[s_name] = {
                    "state": s_name,
                    "environmental_data_status": "UNAVAILABLE",
                    "location": {"state": s_name, "resolution": "STATE_CENTROID", "precision": "LOW"},
                    "weather": None,
                    "environmental_assessment": None,
                    "disruption_windows": []
                }

    result = {"states": reports}
    cache_service.set("regional_environmental_overview", result, ttl_seconds=600)
    return result


@router.get("/project/{project_code}", response_model=EnvironmentalReportResponse)
def get_project_environmental_report_endpoint(project_code: str):
    """
    Get full environmental intelligence report for a project.
    Includes location precision, current weather, severity assessment, physical condition advice,
    24-hour disruption windows, and Contextual Priority.
    """
    proj = get_project_details(project_code)
    if not proj:
        # Fallback dictionary for basic evaluation if project metadata is sparse
        proj = {
            "project_code": project_code,
            "project_name": f"Project {project_code}",
            "state": "Maharashtra",
            "risk_category": "MODERATE",
            "composite_risk_score": 50.0
        }
    
    report = EnvironmentalService.get_project_environmental_report(proj)
    return report


@router.get("/project/{project_code}/forecast")
def get_project_forecast_endpoint(project_code: str):
    """Get forecast outlook and disruption windows for a project."""
    proj = get_project_details(project_code) or {"project_code": project_code, "state": "Maharashtra"}
    report = EnvironmentalService.get_project_environmental_report(proj)
    return {
        "project_code": project_code,
        "environmental_data_status": report.get("environmental_data_status"),
        "location": report.get("location"),
        "disruption_windows": report.get("disruption_windows", []),
        "forecast_outlook": report.get("forecast_outlook", []),
        "source": report.get("source")
    }


@router.get("/project/{project_code}/assessment")
def get_project_assessment_endpoint(project_code: str):
    """Get environmental severity assessment, impacts, and physical advice."""
    proj = get_project_details(project_code) or {"project_code": project_code, "state": "Maharashtra"}
    report = EnvironmentalService.get_project_environmental_report(proj)
    return {
        "project_code": project_code,
        "environmental_data_status": report.get("environmental_data_status"),
        "environmental_assessment": report.get("environmental_assessment"),
        "physical_condition_advice": report.get("physical_condition_advice"),
        "contextual_priority": report.get("contextual_priority")
    }


@router.get("/project/{project_code}/physical-advice", response_model=PhysicalAdviceEndpointResponse)
def get_project_physical_advice_endpoint(
    project_code: str,
    current_user: User = Depends(require_role(["ADMIN", "DECISION_MAKER", "ANALYST"]))
):
    """Get dedicated physical-condition operational advice for a project across 6 categories."""
    proj = get_project_details(project_code) or {"project_code": project_code, "state": "Maharashtra"}
    report = EnvironmentalService.get_project_environmental_report(proj)
    adv = report.get("physical_condition_advice", {})
    cats = adv.get("categories", {}) if isinstance(adv, dict) else {}
    
    categorized_advice = {
        "worker_safety": cats.get("worker_safety", []),
        "materials": cats.get("materials", []),
        "equipment": cats.get("equipment", []),
        "site_operations": cats.get("site_operations", []),
        "access_mobility": cats.get("access_mobility", []),
        "concrete_construction": cats.get("concrete_construction", [])
    }
    
    recs = adv.get("recommended_actions", [])
    
    return {
        "project_code": project_code,
        "status": adv.get("status", report.get("environmental_data_status", "AVAILABLE")),
        "priority": adv.get("priority", report.get("environmental_assessment", {}).get("overall_severity", "NORMAL")),
        "hazards": adv.get("hazards", []),
        "categories": categorized_advice,
        "recommendations": recs,
        "advice_basis": adv.get("advice_basis", []),
        "generated_by": adv.get("generated_by", "RULE_BASED_ENVIRONMENTAL_ENGINE")
    }


