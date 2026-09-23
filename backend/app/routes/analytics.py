from typing import List, Optional
from fastapi import APIRouter, Query, Depends
from backend.app.schemas.analytics import (
    ExecutiveSummaryResponse, RiskCategoryDistributionItem,
    StateStatisticsItem, AgencyStatisticsItem, CostDelayAnalyticsResponse,
    GeographicRiskResponse
)
from backend.app.services.analytics_service import (
    get_executive_summary, get_risk_distribution,
    get_state_statistics, get_agency_statistics, get_cost_delay_analytics,
    get_geographic_risk
)

from backend.app.services.cache_service import cache_service
from backend.app.core.auth_dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"], dependencies=[Depends(get_current_user)])



@router.get("/summary", response_model=ExecutiveSummaryResponse)
@router.get("/portfolio_kpis", response_model=ExecutiveSummaryResponse)
def get_summary():
    cached = cache_service.get("analytics:portfolio_kpis")
    if cached:
        return cached
    res = get_executive_summary()
    cache_service.set("analytics:portfolio_kpis", res, ttl_seconds=60)
    return res




@router.get("/risk-distribution", response_model=List[RiskCategoryDistributionItem])
def get_risk_dist():
    cached = cache_service.get("analytics:risk_distribution")
    if cached is not None:
        return cached
    res = get_risk_distribution()
    cache_service.set("analytics:risk_distribution", res, ttl_seconds=60)
    return res


@router.get("/by-state", response_model=List[StateStatisticsItem])
def get_by_state(limit: int = Query(50, ge=1, le=500)):
    cache_key = f"analytics:by_state:{limit}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached
    res = get_state_statistics(limit=limit)
    cache_service.set(cache_key, res, ttl_seconds=60)
    return res


@router.get("/by-agency", response_model=List[AgencyStatisticsItem])
def get_by_agency(limit: int = Query(50, ge=1, le=500)):
    cache_key = f"analytics:by_agency:{limit}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached
    res = get_agency_statistics(limit=limit)
    cache_service.set(cache_key, res, ttl_seconds=60)
    return res


@router.get("/cost-delay-stats", response_model=CostDelayAnalyticsResponse)
def get_cost_delay():
    cached = cache_service.get("analytics:cost_delay_stats")
    if cached is not None:
        return cached
    res = get_cost_delay_analytics()
    cache_service.set("analytics:cost_delay_stats", res, ttl_seconds=60)
    return res


@router.get("/geographic_risk", response_model=GeographicRiskResponse)
@router.get("/geographic-risk", response_model=GeographicRiskResponse)
def get_geo_risk():
    cached = cache_service.get("analytics:geographic_risk")
    if cached is not None:
        return cached
    res = get_geographic_risk()
    cache_service.set("analytics:geographic_risk", res, ttl_seconds=60)
    return res

