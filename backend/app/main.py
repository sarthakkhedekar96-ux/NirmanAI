from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
import os

from backend.app.core.logging_config import setup_logging, logger
from backend.app.core.db_resilience import check_db_health
from backend.app.middleware.security import SecurityHeadersMiddleware, RateLimitingMiddleware
from backend.app.middleware.error_handler import (
    http_exception_handler, validation_exception_handler, generic_exception_handler
)

from backend.app.routes import health, projects, risk, analytics, documents, assistant, risk_intelligence, auth, notifications, environment, dependencies, stress_test, satellite
from backend.app.core.db_init import ensure_master_tables_exist, ensure_users_table_exists, seed_bootstrap_admin_if_needed, ensure_notification_tables_exist, ensure_project_indexes_exist, ensure_environmental_tables_exist, ensure_dependency_tables_exist

# Initialize Structured Logging
setup_logging()

app = FastAPI(
    title="Project Nirman — Risk & Data Intelligence API",
    description="PAIMANA AI Infrastructure Monitoring Platform Data Intelligence & REST API",
    version="1.0.0"
)

# Configure & Register CORS Middleware
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env and cors_origins_env.strip():
    raw_origins = cors_origins_env.split(",")
else:
    raw_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

cors_origins = []
for origin in raw_origins:
    cleaned = origin.strip().rstrip("/")
    if cleaned and cleaned not in cors_origins:
        cors_origins.append(cleaned)

# Register Security & Rate Limiting Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Global Exception Handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Register REST Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(risk.router)
app.include_router(analytics.router)
app.include_router(documents.router)
app.include_router(assistant.router)
app.include_router(risk_intelligence.router)
app.include_router(notifications.router)
app.include_router(environment.router)
app.include_router(dependencies.router)
app.include_router(stress_test.router)
app.include_router(satellite.router)

from backend.app.services.cache_service import cache_service

# Startup Hook: Verify Database Vitality & Initialize Cache
@app.on_event("startup")
def on_startup():
    logger.info("CORS allowed origins:\n%s", cors_origins)
    cache_service.clear()
    ensure_master_tables_exist()
    ensure_users_table_exists()
    seed_bootstrap_admin_if_needed()
    ensure_notification_tables_exist()
    ensure_project_indexes_exist()
    ensure_environmental_tables_exist()
    ensure_dependency_tables_exist()

    db_ok = check_db_health()

    if db_ok:
        logger.info("✅ Database connectivity verified on startup.")
    else:
        logger.warning("⚠️ Database connectivity ping unverified on startup.")



from fastapi.responses import Response

@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    """
    Returns NIRMAN platform SVG favicon asset.
    Fixes GET /favicon.ico 404 response.
    """
    icon_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#0f172a"/><text x="50" y="70" font-size="65" font-weight="bold" fill="#38bdf8" text-anchor="middle" font-family="sans-serif">N</text></svg>"""
    return Response(content=icon_svg, media_type="image/svg+xml")

# Serve Frontend Integrated Web Platform Static Files
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
frontend_dist = os.path.join(base_dir, "frontend", "dist")
frontend_dir = os.path.join(base_dir, "frontend")

if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
elif os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)


