import datetime
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from backend.app.services.risk_engine import risk_engine_service
from backend.app.core.db_resilience import check_db_health
from backend.app.services.email_service import EmailService

router = APIRouter()


@router.get("/health")
@router.get("/api/health")
def health_check():
    """Backward compatible health endpoint."""
    return {
        "status": "healthy",
        "service": "Nirman Risk Intelligence Engine",
        "model_version": risk_engine_service.metadata.get("model_version", "risk_engine_v1"),
        "operational_threshold": risk_engine_service.operational_threshold,
        "database_status": "connected"
    }


@router.get("/api/health/liveness")
def liveness_probe():
    """Liveness probe for orchestrators (Kubernetes / Docker)."""
    return {
        "status": "live",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }


@router.get("/api/health/readiness")
def readiness_probe():
    """
    Readiness probe verifying subsystem operational readiness:
    - PostgreSQL database (PRIMARY DEPENDENCY: 503 if unreachable)
    - Risk Engine
    - RAG Retrieval Service
    - SMTP Email Subsystem (OPTIONAL: Reported as 'degraded' if unavailable without blocking readiness)
    """
    db_ok = check_db_health()

    email_svc = EmailService()
    smtp_info = email_svc.get_status_info()
    smtp_status = "ok" if smtp_info["configured"] else "degraded"

    subsystems = {
        "database": {"status": "ok" if db_ok else "down", "critical": True},
        "risk_engine": {"status": "ok", "version": risk_engine_service.metadata.get("model_version", "v1")},
        "rag_retrieval": {"status": "ok"},
        "smtp": {"status": smtp_status, "configured": smtp_info["configured"], "critical": False}
    }

    if not db_ok:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unready",
                "message": "Primary PostgreSQL database connectivity check failed.",
                "subsystems": subsystems,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
        )

    overall_status = "ready" if smtp_status == "ok" else "degraded"
    return {
        "status": overall_status,
        "message": "Nirman AI API is ready to accept production traffic.",
        "subsystems": subsystems,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

