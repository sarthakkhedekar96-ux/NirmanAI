"""
backend/app/schemas/satellite.py

Phase 19C — Satellite Change Detection Pydantic Schemas.
Provides structured contract schemas for Earth observation spectral change detection,
Sentinel-2 metadata, quality indicators, and service health status.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class SatelliteChangeResponse(BaseModel):
    """Structured response schema for project-level satellite change detection."""
    project_code: str = Field(..., description="Canonical project code")
    status: str = Field("AVAILABLE", description="Data availability status: AVAILABLE, UNAVAILABLE, INSUFFICIENT_DATA")
    location_precision: str = Field("HIGH", description="Location precision: HIGH (Exact Coordinates), MEDIUM (District), LOW (State Centroid)")
    
    before_date: Optional[str] = Field(None, description="ISO date string of baseline BEFORE satellite observation")
    after_date: Optional[str] = Field(None, description="ISO date string of target AFTER satellite observation")
    time_difference_days: Optional[int] = Field(None, description="Temporal gap between BEFORE and AFTER observations in days")
    
    before_cloud_percentage: Optional[float] = Field(None, description="Cloud coverage percentage in BEFORE scene (0.0 - 100.0)")
    after_cloud_percentage: Optional[float] = Field(None, description="Cloud coverage percentage in AFTER scene (0.0 - 100.0)")
    
    changed_area_percentage: Optional[float] = Field(None, description="Percentage of AOI surface area exhibiting significant spectral change (0.0 - 100.0)")
    change_score: Optional[float] = Field(None, description="Bounded spectral change intensity score (0.0 - 100.0)")
    
    change_category: str = Field("NO_SIGNIFICANT_CHANGE", description="Change classification: NO_SIGNIFICANT_CHANGE, LOW_CHANGE, MODERATE_CHANGE, HIGH_CHANGE, INSUFFICIENT_DATA, UNAVAILABLE")
    quality_status: str = Field("GOOD", description="Imagery quality classification: GOOD, LIMITED, INSUFFICIENT_DATA, UNAVAILABLE")
    
    processing_stage: str = Field("COMPLETE", description="Pipeline execution stage: PROJECT_LOCATION, STAC_SEARCH, SCENE_SELECTION, COG_HEADER, COG_WINDOW, TIFF_DECODE, GEOREPROJECTION, SCL_MASK, SPECTRAL_INDICES, CHANGE_DETECTION, COMPLETE")
    indices: Dict[str, Any] = Field(default_factory=dict, description="Calculated multispectral indices (e.g. NDVI, NDWI, NDBI, spectral delta)")
    limitations: List[str] = Field(default_factory=list, description="Explicit data quality or spatial precision limitation notices")
    source: str = Field("Sentinel-2 L2A Multispectral", description="Satellite imagery provider and sensor product")
    methodology: str = Field("Deterministic Sentinel-2 multispectral surface change analysis over AOI", description="Analytical approach description")
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO timestamp of response synthesis")


class SatelliteHealthResponse(BaseModel):
    """Health check response for satellite graph and provider integration."""
    status: str = Field("healthy", description="Infrastructure status")
    provider: str = Field("Copernicus Sentinel-2 L2A Catalog", description="Satellite provider name")
    cached_entries: int = Field(0, description="Number of active cached satellite analysis entries")
    operational_thresholds: Dict[str, Any] = Field(default_factory=dict, description="Configured cloud and temporal filtering bounds")
