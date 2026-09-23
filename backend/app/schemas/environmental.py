"""
backend/app/schemas/environmental.py

Phase 16 — Pydantic Schemas for Environmental Intelligence Endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class LocationMetadata(BaseModel):
    latitude: float
    longitude: float
    location_source: str = Field(..., description="PROJECT_COORDINATES, DISTRICT_COORDINATES, or STATE_CENTROID")
    location_precision: str = Field(..., description="HIGH, MEDIUM, or LOW")
    state: Optional[str] = None
    district: Optional[str] = None
    display_location: str


class CurrentWeatherSchema(BaseModel):
    temperature_c: float
    humidity_pct: float
    precipitation_mm: float
    wind_speed_kmh: float
    condition: str
    weather_code: int
    observed_at: str
    source: str


class EnvironmentalAssessmentSchema(BaseModel):
    overall_severity: str = Field(..., description="NORMAL, WATCH, ELEVATED, HIGH, SEVERE, or UNAVAILABLE")
    precipitation_severity: Optional[str] = None
    wind_severity: Optional[str] = None
    temperature_severity: Optional[str] = None
    humidity_severity: Optional[str] = None
    active_hazard_factors: List[str] = []
    assessment_label: str = "Nirman AI operational assessment"


class CategorizedAdviceSchema(BaseModel):
    worker_safety: List[str] = []
    materials: List[str] = []
    equipment: List[str] = []
    site_operations: List[str] = []
    access_mobility: List[str] = []
    concrete_construction: List[str] = []


class PhysicalConditionAdviceSchema(BaseModel):
    potential_impacts: List[str] = []
    recommended_actions: List[str] = []
    status: str = "AVAILABLE"
    priority: str = "NORMAL"
    hazards: List[str] = []
    categories: Optional[CategorizedAdviceSchema] = None
    advice_basis: List[str] = []
    generated_by: str = "RULE_BASED_ENVIRONMENTAL_ENGINE"


class PhysicalAdviceEndpointResponse(BaseModel):
    project_code: str
    status: str = Field(..., description="AVAILABLE or UNAVAILABLE")
    priority: str
    hazards: List[str] = []
    categories: CategorizedAdviceSchema
    recommendations: List[str] = []
    advice_basis: List[str] = []
    generated_by: str = "RULE_BASED_ENVIRONMENTAL_ENGINE"


class DisruptionWindowSchema(BaseModel):
    time: str
    hour_offset: int
    hazard_type: str
    intensity: str
    advisory: str


class ContextualPrioritySchema(BaseModel):
    level: str = Field(..., description="NORMAL, ELEVATED, HIGH ATTENTION, or CRITICAL ATTENTION")
    escalated: bool
    reason: str
    label: str = "Contextual Priority"


class BaseMLRiskSummarySchema(BaseModel):
    composite_risk_score: float
    risk_category: str
    unaltered_guarantee: bool = True


class EnvironmentalReportResponse(BaseModel):
    project_code: str
    environmental_data_status: str = Field(..., description="AVAILABLE or UNAVAILABLE")
    location: LocationMetadata
    weather: Optional[CurrentWeatherSchema] = None
    environmental_assessment: EnvironmentalAssessmentSchema
    physical_condition_advice: PhysicalConditionAdviceSchema
    disruption_windows: List[DisruptionWindowSchema] = []
    contextual_priority: ContextualPrioritySchema
    base_ml_risk: BaseMLRiskSummarySchema
    observed_at: str
    source: str

