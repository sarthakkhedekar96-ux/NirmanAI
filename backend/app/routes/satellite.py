"""
backend/app/routes/satellite.py

Phase 19C — Satellite Change Detection REST API Endpoints.
Exposes project-level Earth observation temporal change detection analysis, Sentinel-2 spectral metrics,
quality control metadata, and satellite system health status.

NON-REGRESSION GUARANTEE: Does NOT alter ML risk scores, risk categories, severe risk probabilities,
or existing database risk_scores / dependency_nodes tables.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from backend.app.schemas.satellite import SatelliteChangeResponse, SatelliteHealthResponse
from backend.app.services.satellite_change_service import satellite_change_service
from backend.app.core.auth_dependencies import get_current_user, require_role
from backend.app.models.user import User

router = APIRouter(prefix="/api/satellite", tags=["Satellite Change Detection"])


@router.get("/health", response_model=SatelliteHealthResponse)
def get_satellite_health() -> SatelliteHealthResponse:
    """
    Returns satellite Earth Observation infrastructure health, provider status, and operational bounds.
    """
    return satellite_change_service.get_satellite_health()


@router.get("/project/{project_code}/health", response_model=SatelliteHealthResponse)
def get_project_satellite_health(project_code: str) -> SatelliteHealthResponse:
    """
    Returns satellite service health status for a specific project.
    """
    return satellite_change_service.get_satellite_health()


@router.get("/project/{project_code}", response_model=SatelliteChangeResponse)
def get_project_satellite_change(
    project_code: str,
    skip_cache: bool = Query(False, alias="skipCache"),
    current_user: User = Depends(require_role(["ADMIN", "DECISION_MAKER", "ANALYST", "VIEWER"]))
) -> SatelliteChangeResponse:
    """
    Retrieves satellite multispectral change detection evidence for an infrastructure project.
    Protected by Role-Based Access Control (RBAC).
    """
    if not project_code or not project_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project code must be a non-empty string."
        )

    res = satellite_change_service.get_satellite_change_detection(project_code.strip(), skip_cache=skip_cache)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with code '{project_code}' not found."
        )

    return res

