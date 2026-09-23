from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.risk import RiskPredictionResponse
from backend.app.services.risk_engine import risk_engine_service
from backend.app.core.auth_dependencies import get_current_user

router = APIRouter(prefix="/api/risk", tags=["Risk Intelligence"], dependencies=[Depends(get_current_user)])


@router.get("/predict/{project_code}", response_model=RiskPredictionResponse)
def get_risk_assessment(project_code: str):
    assessment = risk_engine_service.get_project_risk_assessment(project_code)
    if not assessment:
        raise HTTPException(status_code=404, detail=f"Risk assessment for project '{project_code}' not found")
    return assessment
