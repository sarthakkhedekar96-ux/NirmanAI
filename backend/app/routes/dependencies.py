"""
backend/app/routes/dependencies.py

Phase 17 — Dependency Intelligence REST API Endpoints.
Serves project-level dependency graphs, global filtered dependency networks,
coordination bottleneck indicators, and dependency system health status.

NON-REGRESSION GUARANTEE: Does NOT alter ML risk scores, risk categories,
severe risk probabilities, or existing database risk_scores tables.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, status, Depends
from backend.app.services.dependency_service import dependency_service
from backend.app.core.auth_dependencies import get_current_user, require_role
from backend.app.models.user import User

router = APIRouter(prefix="/api/dependencies", tags=["Dependency Intelligence"])


@router.get("/health", response_model=Dict[str, Any])
def get_dependency_health() -> Dict[str, Any]:
    """
    Returns dependency graph infrastructure health and edge status summary.
    """
    return dependency_service.get_dependency_health()


@router.get("/project/{project_code}", response_model=Dict[str, Any])
def get_project_dependencies(project_code: str) -> Dict[str, Any]:
    """
    Returns dependency graph network centered around a specific infrastructure project.
    """
    if not project_code or not project_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project code must be a non-empty string."
        )

    res = dependency_service.build_project_dependency_graph(project_code.strip())
    if "error" in res and res.get("project") is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project code '{project_code}' not found."
        )

    return res


@router.get("/graph", response_model=Dict[str, Any])
def get_global_dependency_graph(
    state: Optional[str] = Query(None, description="Filter nodes/edges by state"),
    agency: Optional[str] = Query(None, description="Filter nodes/edges by executing agency"),
    relationship_type: Optional[str] = Query(None, description="Filter edges by relationship type (e.g. IMPLEMENTS, OWNS, DEPENDS_ON, CLEARANCE_FROM, FUNDS, AFFECTS)"),
    evidence_status: Optional[str] = Query(None, description="Filter edges by evidence status (OBSERVED, DOCUMENTED, INFERRED)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of dependency edges to return")
) -> Dict[str, Any]:
    """
    Returns global dependency graph with safe query parameter filters and bounded limit.
    """
    return dependency_service.build_global_dependency_graph(
        state=state,
        agency=agency,
        relationship_type=relationship_type,
        evidence_status=evidence_status,
        limit=limit
    )


@router.get("/bottlenecks", response_model=List[Dict[str, Any]])
def get_coordination_bottlenecks(
    current_user: User = Depends(require_role(["ADMIN", "DECISION_MAKER", "ANALYST", "VIEWER"]))
) -> List[Dict[str, Any]]:
    """
    Identifies coordination bottleneck indicators and pressure metrics across agencies and departments.
    Uses strictly neutral, non-blame terminology.
    Requires authenticated session with valid role.
    """
    return dependency_service.calculate_bottleneck_indicators()

