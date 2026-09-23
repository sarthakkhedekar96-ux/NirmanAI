"""
backend/app/routes/stress_test.py

Phase 18 — Synthetic Stress-Test / What-If Scenario REST API Router.
Provides endpoints for executing isolated in-memory decision-support simulations,
fetching scenario presets, and checking stress-test engine health.

STRICT INVARIANTS:
1. Zero database writes during scenario execution.
2. Production ML risk scores, Platt scaling, T*=0.28, and risk_scores DB remain untouched.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, status
from backend.app.services.stress_test_service import (
    stress_test_service, StressTestRequest, SCENARIO_PRESETS
)

router = APIRouter(prefix="/api/stress-test", tags=["Synthetic Stress Test"])


@router.get("/health", response_model=Dict[str, Any])
def get_stress_test_health() -> Dict[str, Any]:
    """
    Returns synthetic stress-test simulation engine operational health.
    """
    return {
        "status": "healthy",
        "engine": "In-Memory Synthetic Stress-Test Engine v1",
        "database_mutation": "NONE (Zero Writes)",
        "presets_count": len(SCENARIO_PRESETS)
    }


@router.get("/presets", response_model=Dict[str, Any])
def get_scenario_presets() -> Dict[str, Any]:
    """
    Returns predefined hypothetical scenario presets (Baseline, Cost Pressure, Schedule Slip, Extreme Weather, Combined Stress).
    """
    return SCENARIO_PRESETS


@router.post("/project/{project_code}", response_model=Dict[str, Any])
def run_project_stress_test(project_code: str, req: StressTestRequest) -> Dict[str, Any]:
    """
    Executes an isolated, in-memory synthetic stress-test simulation for a project.
    """
    if not project_code or not project_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project code must be a non-empty string."
        )

    res = stress_test_service.run_simulation(project_code.strip(), req)

    if "error" in res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=res["error"]
        )

    return res
