from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
import sqlalchemy
import pandas as pd
import math

from backend.app.core.db_resilience import get_resilient_db_engine as get_db_engine
from backend.app.services.analytics_service import (
    get_executive_summary,
    get_geographic_risk
)
from backend.app.services.project_service import get_project_details
from backend.app.services.risk_engine import risk_engine_service
from backend.app.services.risk_decomposition_service import RiskDecompositionService

router = APIRouter(prefix="/api/public/landing", tags=["Public Landing Page (Unauthenticated Read-Only)"])


def safe_float(val: Any, round_digits: Optional[int] = None) -> Optional[float]:
    """Safely converts database metric to finite float, returning None instead of NaN/Inf."""
    if val is None or pd.isna(val):
        return None
    try:
        f = float(val)
        if not math.isfinite(f):
            return None
        return round(f, round_digits) if round_digits is not None else f
    except (ValueError, TypeError):
        return None


@router.get("/summary")
def get_public_summary() -> Dict[str, Any]:
    """
    Public read-only summary statistics for the public landing page.
    Requires no JWT authentication. Does not mutate database data.
    """
    summary = get_executive_summary()
    return {
        "total_master_projects": summary.get("total_master_projects", 0),
        "total_live_projects_2026": summary.get("total_live_projects_2026", 0),
        "total_original_cost_crore": safe_float(summary.get("total_original_cost_crore"), 2) or 0.0,
        "total_anticipated_cost_crore": safe_float(summary.get("total_anticipated_cost_crore"), 2) or 0.0,
        "total_cost_overrun_crore": safe_float(summary.get("total_cost_overrun_crore"), 2) or 0.0,
        "overall_cost_overrun_percent": safe_float(summary.get("overall_cost_overrun_percent"), 2) or 0.0,
        "critical_risk_project_count": summary.get("critical_risk_project_count", 0),
        "high_risk_project_count": summary.get("high_risk_project_count", 0),
        "moderate_risk_project_count": summary.get("moderate_risk_project_count", 0),
        "low_risk_project_count": summary.get("low_risk_project_count", 0),
        "total_projects": summary.get("total_projects", 0),
        "high_critical_risk_count": summary.get("high_critical_risk_count", 0),
        "avg_delay_months": safe_float(summary.get("avg_delay_months"), 1) or 0.0
    }


@router.get("/agencies")
def get_public_agencies(limit: int = Query(20, ge=1, le=100)) -> List[Dict[str, Any]]:
    """
    Public read-only nodal agency statistics for PAIMANA monitoring panel.
    Uses real PostgreSQL / database aggregate queries.
    """
    engine = get_db_engine()
    sql = """
        SELECT
            p.agency,
            COUNT(DISTINCT p.project_code) as project_count,
            COALESCE(SUM(p.original_cost), 0) as total_original_cost_crore,
            COALESCE(SUM(o.anticipated_cost), SUM(p.original_cost), 0) as total_anticipated_cost_crore,
            COALESCE(SUM(GREATEST(0, o.anticipated_cost - p.original_cost)), 0) as total_cost_overrun_crore,
            SUM(o.cumulative_expenditure) as cumulative_expenditure_crore,
            COALESCE(AVG(CASE WHEN COALESCE(o.original_delay_months, o.revised_delay_months) > 0 THEN COALESCE(o.original_delay_months, o.revised_delay_months)::float END), 0) as avg_delay_months,
            AVG(r.risk_score) as avg_risk_score
        FROM projects p
        LEFT JOIN (
            SELECT DISTINCT ON (project_code) project_code, anticipated_cost, cumulative_expenditure, original_delay_months, revised_delay_months
            FROM project_observations
            ORDER BY project_code, reporting_month DESC
        ) o ON p.project_code = o.project_code
        LEFT JOIN (
            SELECT DISTINCT ON (project_code) project_code, composite_risk_score AS risk_score
            FROM risk_scores
            ORDER BY project_code, reporting_month DESC
        ) r ON p.project_code = r.project_code
        WHERE p.agency IS NOT NULL AND TRIM(p.agency) != ''
        GROUP BY p.agency
        ORDER BY project_count DESC
        LIMIT :limit
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"limit": limit})

    results = []
    for _, row in df.iterrows():
        orig = safe_float(row["total_original_cost_crore"], 2) or 0.0
        antic = safe_float(row["total_anticipated_cost_crore"], 2) or orig
        overrun = safe_float(row["total_cost_overrun_crore"], 2) or max(0.0, antic - orig)
        cum_exp = safe_float(row["cumulative_expenditure_crore"], 2)
        results.append({
            "agency": str(row["agency"]),
            "project_count": int(row["project_count"]),
            "total_original_cost_crore": orig,
            "total_anticipated_cost_crore": antic,
            "total_cost_overrun_crore": overrun,
            "cumulative_expenditure_crore": cum_exp,
            "completed_during_month": None,
            "newly_added": None,
            "avg_delay_months": safe_float(row["avg_delay_months"], 1) or 0.0,
            "avg_risk_score": safe_float(row["avg_risk_score"], 1)
        })
    return results


@router.get("/sectors")
def get_public_sectors(limit: int = Query(20, ge=1, le=100)) -> List[Dict[str, Any]]:
    """
    Public read-only sector-wise infrastructure statistics for PAIMANA monitoring panel.
    Uses real PostgreSQL / database aggregate queries with MoSPI infrastructure sector categorization.
    """
    engine = get_db_engine()
    sql = """
        SELECT
            CASE
                WHEN UPPER(p.agency) IN ('NHAI', 'MORTH', 'NHIDCL', 'NHDP', 'PWD', 'DORTH', 'PUBLIC WORKS DEPARTMENT') OR UPPER(p.agency) LIKE '%HIGHWAY%' OR UPPER(p.agency) LIKE '%ROAD%' THEN 'Road Transport & Highways'
                WHEN UPPER(p.agency) IN ('IOCL', 'ONGC', 'BPCL', 'HPCL', 'GAIL', 'OIL', 'NRL', 'CPCL', 'MRPL', 'ISPRL', 'HPCLRRL(JV') OR UPPER(p.agency) LIKE '%PETROLEUM%' OR UPPER(p.agency) LIKE '%OIL%' OR UPPER(p.agency) LIKE '%REFINERY%' THEN 'Petroleum & Natural Gas'
                WHEN UPPER(p.agency) IN ('PGCIL', 'NTPC', 'NHPC', 'SJVN', 'NEEPCO', 'THDC', 'DVC', 'POSOCO', 'GRIDCONT') OR UPPER(p.agency) LIKE '%POWER%' OR UPPER(p.agency) LIKE '%ELECTRIC%' THEN 'Power & Energy'
                WHEN UPPER(p.agency) IN ('WCL', 'SECL', 'CCL', 'SCCL', 'NCL', 'MCL', 'BCCL', 'ECL', 'CIL', 'NLC', 'COAL INDIA') OR UPPER(p.agency) LIKE '%COAL%' THEN 'Coal'
                WHEN UPPER(p.agency) IN ('ER', 'SR', 'ECR', 'NFR', 'NR', 'WR', 'NER', 'SER', 'SCR', 'SWR', 'SECR', 'ECOR', 'WCR', 'NCR', 'CR', 'RVNL', 'IRCON', 'DFCCIL', 'MRVC', 'RAILWAY', 'NEFR', 'RAILWAYS') OR UPPER(p.agency) LIKE '%RAILWAY%' THEN 'Railways'
                WHEN UPPER(p.agency) IN ('AAI', 'BCAS', 'DGCA') OR UPPER(p.agency) LIKE '%AIRPORT%' OR UPPER(p.agency) LIKE '%AVIATION%' THEN 'Civil Aviation'
                WHEN UPPER(p.agency) IN ('CPWD', 'DMRC', 'LMRCL', 'BMRCL', 'KMRCL', 'NMRCL', 'MMRCL', 'MPMRCL', 'CMRL', 'UPMRC', 'DMRCL', 'NCRTC', 'NATIS', 'JNNURM') OR UPPER(p.agency) LIKE '%METRO%' OR UPPER(p.agency) LIKE '%URBAN%' THEN 'Urban Development'
                WHEN UPPER(p.agency) IN ('BHAVINI', 'BHAVNI', 'NPCIL', 'DAE', 'IGCAR') OR UPPER(p.agency) LIKE '%ATOMIC%' OR UPPER(p.agency) LIKE '%NUCLEAR%' THEN 'Atomic Energy'
                WHEN UPPER(p.agency) IN ('NALCO', 'SAIL', 'RINL', 'HCL', 'MECL', 'KIOCL', 'NMDC') OR UPPER(p.agency) LIKE '%STEEL%' OR UPPER(p.agency) LIKE '%MINES%' THEN 'Mines & Steel'
                WHEN UPPER(p.agency) IN ('BRPL', 'HURL', 'FACT', 'RCF', 'NFL', 'PDIL') OR UPPER(p.agency) LIKE '%FERTILIZER%' OR UPPER(p.agency) LIKE '%CHEMICAL%' THEN 'Fertilizers & Chemicals'
                WHEN UPPER(p.agency) IN ('BSNL', 'MTNL', 'TCIL', 'ITI', 'DOT') OR UPPER(p.agency) LIKE '%TELECOM%' THEN 'Telecommunications'
                WHEN UPPER(p.agency) IN ('IWAI', 'CSL', 'HSL', 'GSL', 'KPL', 'VOCPT', 'MBPT', 'DEPA', 'SMPT', 'PORT') OR UPPER(p.agency) LIKE '%PORT%' OR UPPER(p.agency) LIKE '%SHIPPING%' THEN 'Shipping & Ports'
                WHEN p.sector IS NOT NULL AND TRIM(p.sector) != '' THEN p.sector
                ELSE 'Other Infrastructure'
            END as sector,
            COUNT(DISTINCT p.project_code) as project_count,
            COALESCE(SUM(p.original_cost), 0) as total_original_cost_crore,
            COALESCE(SUM(o.anticipated_cost), SUM(p.original_cost), 0) as total_anticipated_cost_crore,
            COALESCE(SUM(GREATEST(0, o.anticipated_cost - p.original_cost)), 0) as total_cost_overrun_crore,
            SUM(o.cumulative_expenditure) as cumulative_expenditure_crore,
            COALESCE(AVG(CASE WHEN COALESCE(o.original_delay_months, o.revised_delay_months) > 0 THEN COALESCE(o.original_delay_months, o.revised_delay_months)::float END), 0) as avg_delay_months,
            AVG(r.risk_score) as avg_risk_score
        FROM projects p
        LEFT JOIN (
            SELECT DISTINCT ON (project_code) project_code, anticipated_cost, cumulative_expenditure, original_delay_months, revised_delay_months
            FROM project_observations
            ORDER BY project_code, reporting_month DESC
        ) o ON p.project_code = o.project_code
        LEFT JOIN (
            SELECT DISTINCT ON (project_code) project_code, composite_risk_score AS risk_score
            FROM risk_scores
            ORDER BY project_code, reporting_month DESC
        ) r ON p.project_code = r.project_code
        GROUP BY 1
        ORDER BY project_count DESC
        LIMIT :limit
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"limit": limit})

    results = []
    for _, row in df.iterrows():
        orig = safe_float(row["total_original_cost_crore"], 2) or 0.0
        antic = safe_float(row["total_anticipated_cost_crore"], 2) or orig
        overrun = safe_float(row["total_cost_overrun_crore"], 2) or max(0.0, antic - orig)
        cum_exp = safe_float(row["cumulative_expenditure_crore"], 2)
        results.append({
            "sector": str(row["sector"]),
            "project_count": int(row["project_count"]),
            "total_original_cost_crore": orig,
            "total_anticipated_cost_crore": antic,
            "total_cost_overrun_crore": overrun,
            "cumulative_expenditure_crore": cum_exp,
            "completed_during_month": None,
            "newly_added": None,
            "avg_delay_months": safe_float(row["avg_delay_months"], 1) or 0.0,
            "avg_risk_score": safe_float(row["avg_risk_score"], 1)
        })
    return results


@router.get("/states")
def get_public_states(limit: int = Query(50, ge=1, le=200)) -> List[Dict[str, Any]]:
    """
    Public read-only state-wise infrastructure statistics.
    Uses real PostgreSQL / database aggregate queries.
    """
    engine = get_db_engine()
    sql = """
        SELECT
            p.state,
            COUNT(DISTINCT p.project_code) as project_count,
            COALESCE(SUM(p.original_cost), 0) as total_original_cost_crore,
            COALESCE(SUM(o.anticipated_cost), SUM(p.original_cost), 0) as total_anticipated_cost_crore,
            COALESCE(SUM(GREATEST(0, o.anticipated_cost - p.original_cost)), 0) as total_cost_overrun_crore,
            COALESCE(AVG(CASE WHEN COALESCE(o.original_delay_months, o.revised_delay_months) > 0 THEN COALESCE(o.original_delay_months, o.revised_delay_months)::float END), 0) as avg_delay_months,
            AVG(r.risk_score) as avg_risk_score,
            SUM(CASE WHEN r.risk_category IN ('HIGH', 'CRITICAL') THEN 1 ELSE 0 END) as high_critical_risk_count
        FROM projects p
        LEFT JOIN (
            SELECT DISTINCT ON (project_code) project_code, anticipated_cost, original_delay_months, revised_delay_months
            FROM project_observations
            ORDER BY project_code, reporting_month DESC
        ) o ON p.project_code = o.project_code
        LEFT JOIN (
            SELECT DISTINCT ON (project_code) project_code, composite_risk_score AS risk_score, risk_category
            FROM risk_scores
            ORDER BY project_code, reporting_month DESC
        ) r ON p.project_code = r.project_code
        WHERE p.state IS NOT NULL AND TRIM(p.state) != ''
        GROUP BY p.state
        ORDER BY project_count DESC
        LIMIT :limit
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"limit": limit})

    results = []
    for _, row in df.iterrows():
        orig = safe_float(row["total_original_cost_crore"], 2) or 0.0
        antic = safe_float(row["total_anticipated_cost_crore"], 2) or orig
        overrun = safe_float(row["total_cost_overrun_crore"], 2) or max(0.0, antic - orig)
        results.append({
            "state": str(row["state"]),
            "project_count": int(row["project_count"]),
            "total_original_cost_crore": orig,
            "total_anticipated_cost_crore": antic,
            "total_cost_overrun_crore": overrun,
            "avg_delay_months": safe_float(row["avg_delay_months"], 1) or 0.0,
            "avg_risk_score": safe_float(row["avg_risk_score"], 1),
            "high_critical_risk_count": int(row["high_critical_risk_count"]) if pd.notna(row["high_critical_risk_count"]) else 0
        })
    return results


@router.get("/geographic-risk")
def get_public_geographic_risk() -> Dict[str, Any]:
    """
    Public read-only state geographic risk data for IndiaMapSvg.
    """
    return get_geographic_risk()


@router.get("/major-projects")
def get_public_major_projects(limit: int = Query(6, ge=1, le=50)) -> List[Dict[str, Any]]:
    """
    Public read-only list of major monitored capital projects.
    Returns candidate projects with complete, verified database records.
    """
    engine = get_db_engine()
    sql = """
        SELECT
            p.project_code,
            p.project_name,
            p.agency,
            p.state,
            p.sector,
            p.original_cost as original_cost_crore,
            COALESCE(o.anticipated_cost, p.original_cost) as latest_cost_crore,
            GREATEST(0, COALESCE(o.anticipated_cost, p.original_cost) - COALESCE(p.original_cost, 0)) as cost_overrun_crore,
            COALESCE(o.original_delay_months, o.revised_delay_months, 0) as delay_months,
            o.physical_progress as physical_progress_pct,
            r.risk_category,
            r.composite_risk_score as risk_score
        FROM projects p
        INNER JOIN (
            SELECT DISTINCT ON (project_code) project_code, anticipated_cost, original_delay_months, revised_delay_months, physical_progress
            FROM project_observations
            WHERE anticipated_cost IS NOT NULL AND physical_progress IS NOT NULL
            ORDER BY project_code, reporting_month DESC
        ) o ON p.project_code = o.project_code
        INNER JOIN (
            SELECT DISTINCT ON (project_code) project_code, composite_risk_score, risk_category
            FROM risk_scores
            WHERE composite_risk_score IS NOT NULL AND risk_category IS NOT NULL
            ORDER BY project_code, reporting_month DESC
        ) r ON p.project_code = r.project_code
        WHERE p.original_cost IS NOT NULL
          AND p.original_cost > 0
          AND p.project_name IS NOT NULL AND TRIM(p.project_name) != ''
          AND p.agency IS NOT NULL AND TRIM(p.agency) != ''
          AND p.state IS NOT NULL AND TRIM(p.state) != ''
        ORDER BY cost_overrun_crore DESC NULLS LAST
        LIMIT :limit
    """
    with engine.connect() as conn:
        df = pd.read_sql(sqlalchemy.text(sql), conn, params={"limit": limit * 2})

    results = []
    for _, row in df.iterrows():
        orig = safe_float(row["original_cost_crore"], 2)
        latest = safe_float(row["latest_cost_crore"], 2)
        overrun = safe_float(row["cost_overrun_crore"], 2)
        delay = safe_float(row["delay_months"], 1)
        prog = safe_float(row["physical_progress_pct"], 1)
        score = safe_float(row["risk_score"], 1)

        if orig is None or latest is None or overrun is None or delay is None or prog is None or score is None:
            continue

        results.append({
            "project_code": str(row["project_code"]),
            "project_name": str(row["project_name"]),
            "agency": str(row["agency"]),
            "state": str(row["state"]),
            "sector": str(row["sector"]) if pd.notna(row["sector"]) else None,
            "original_cost_crore": orig,
            "latest_cost_crore": latest,
            "cost_overrun_crore": overrun,
            "delay_months": delay,
            "physical_progress_pct": prog,
            "risk_category": str(row["risk_category"]),
            "risk_score": score
        })

        if len(results) >= limit:
            break

    return results


@router.get("/project/{project_code}")
def get_public_project_spotlight(project_code: str) -> Dict[str, Any]:
    """
    Public read-only project spotlight details for project_code (e.g. 020100044).
    Uses real project & risk service without requiring JWT auth.
    """
    meta = get_project_details(project_code)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Project '{project_code}' not found.")

    risk = risk_engine_service.get_project_risk_assessment(project_code) or {}
    decomp = RiskDecompositionService().decompose_project_risk(project_code) or {}

    top_drivers = []
    if isinstance(decomp, dict) and isinstance(decomp.get("top_risk_drivers"), list) and len(decomp["top_risk_drivers"]) > 0:
        for dr in decomp["top_risk_drivers"][:3]:
            top_drivers.append({
                "feature": dr.get("feature_name") or dr.get("feature") or "Factor",
                "impact": "Increases Risk" if (dr.get("shap_value") or 0) > 0 else (dr.get("impact") or "Risk Driver"),
                "value": str(dr.get("feature_value")) if dr.get("feature_value") is not None else ""
            })
    elif isinstance(risk.get("risk_drivers"), list) and len(risk["risk_drivers"]) > 0:
        for dr in risk["risk_drivers"][:3]:
            top_drivers.append({
                "feature": dr.get("factor") or dr.get("feature") or "Factor",
                "impact": dr.get("impact") or "Risk Driver",
                "value": str(dr.get("value")) if dr.get("value") is not None else ""
            })

    orig_cost = meta.get("original_cost") if meta.get("original_cost") is not None else meta.get("original_cost_crore")
    antic_cost = meta.get("anticipated_cost") if meta.get("anticipated_cost") is not None else meta.get("latest_cost_crore")

    orig_val = safe_float(orig_cost, 2)
    antic_val = safe_float(antic_cost, 2) or orig_val
    overrun_val = max(0.0, antic_val - orig_val) if (antic_val is not None and orig_val is not None) else None

    delay_m = safe_float(meta.get("delay_months") if meta.get("delay_months") is not None else meta.get("latest_delay_months"), 1)
    prog_pct = safe_float(meta.get("physical_progress") if meta.get("physical_progress") is not None else meta.get("latest_physical_progress"), 1)

    return {
        "project_code": str(meta.get("project_code") or project_code),
        "project_name": str(meta.get("project_name") or f"Project {project_code}"),
        "sector": str(meta.get("sector")) if meta.get("sector") else None,
        "state": str(meta.get("state")) if meta.get("state") else None,
        "agency": str(meta.get("agency")) if meta.get("agency") else None,
        "risk_category": str(risk.get("risk_category") or meta.get("risk_category")) if (risk.get("risk_category") or meta.get("risk_category")) else None,
        "risk_score": safe_float(risk.get("risk_score"), 1) or (safe_float(risk.get("predicted_severe_risk_prob"), 2) * 100 if risk.get("predicted_severe_risk_prob") is not None else None),
        "original_cost_cr": orig_val,
        "latest_cost_cr": antic_val,
        "cost_overrun_cr": overrun_val,
        "delay_months": delay_m,
        "physical_progress_pct": prog_pct,
        "top_drivers": top_drivers if len(top_drivers) > 0 else None
    }
