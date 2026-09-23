#!/usr/bin/env python3
"""
scripts/testing/test_cors.py

FastAPI TestClient suite to verify production & local CORS middleware configuration:
- GET /api/health with Origin: https://nirmanai-amber.vercel.app
- GET /api/health with Origin: http://localhost:3000
- GET /api/analytics/portfolio_kpis with Origin: https://nirmanai-amber.vercel.app (verifies 401 response retains CORS header)
- Origin normalization (trimming whitespace and removing trailing slashes)
- Strict adherence to explicit CORS_ORIGINS environment variable
"""
import os
import sys
import importlib
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def run_cors_tests():
    print("\n==================================================")
    print("NIRMAN AI — BACKEND CORS VERIFICATION TEST SUITE")
    print("==================================================\n")

    # Save original env
    orig_cors_env = os.environ.get("CORS_ORIGINS")

    try:
        # ----------------------------------------------------
        # Test Case 1: Default / Production Origins
        # Set CORS_ORIGINS to include production Vercel frontend & local dev
        # ----------------------------------------------------
        test_origins_str = "http://localhost:3000, http://127.0.0.1:3000, https://nirmanai-amber.vercel.app/"
        os.environ["CORS_ORIGINS"] = test_origins_str

        # Reload main module to apply new CORS_ORIGINS
        import backend.app.main
        importlib.reload(backend.app.main)
        from backend.app.main import app

        client = TestClient(app)

        # 1.1 Test GET /api/health with Vercel Origin
        print("[1/5] Testing GET /api/health with Origin: https://nirmanai-amber.vercel.app ...")
        res = client.get("/api/health", headers={"Origin": "https://nirmanai-amber.vercel.app"})
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}"
        assert res.headers.get("access-control-allow-origin") == "https://nirmanai-amber.vercel.app", (
            f"Expected CORS header 'https://nirmanai-amber.vercel.app', got '{res.headers.get('access-control-allow-origin')}'"
        )
        assert res.headers.get("access-control-allow-credentials") == "true", "Expected allow-credentials=true"
        print("  [OK] Vercel origin header returned correctly on /api/health")

        # 1.2 Test GET /api/health with Localhost Origin
        print("[2/5] Testing GET /api/health with Origin: http://localhost:3000 ...")
        res_local = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        assert res_local.status_code == 200, f"Expected 200 OK, got {res_local.status_code}"
        assert res_local.headers.get("access-control-allow-origin") == "http://localhost:3000", (
            f"Expected CORS header 'http://localhost:3000', got '{res_local.headers.get('access-control-allow-origin')}'"
        )
        print("  [OK] Localhost 3000 origin header returned correctly on /api/health")

        # 1.3 Test Protected Endpoint GET /api/analytics/portfolio_kpis with Vercel Origin (Expected: 401 + CORS Header)
        print("[3/5] Testing GET /api/analytics/portfolio_kpis with Origin: https://nirmanai-amber.vercel.app (Unauthenticated) ...")
        res_kpis = client.get("/api/analytics/portfolio_kpis", headers={"Origin": "https://nirmanai-amber.vercel.app"})
        assert res_kpis.status_code == 401, f"Expected 401 Unauthorized, got {res_kpis.status_code}"
        assert res_kpis.headers.get("access-control-allow-origin") == "https://nirmanai-amber.vercel.app", (
            f"Expected CORS header on 401 response, got '{res_kpis.headers.get('access-control-allow-origin')}'"
        )
        print("  [OK] Protected endpoint 401 response retains CORS header")

        # 1.4 Test Preflight OPTIONS request
        print("[4/5] Testing OPTIONS preflight request for /api/analytics/portfolio_kpis ...")
        res_options = client.options(
            "/api/analytics/portfolio_kpis",
            headers={
                "Origin": "https://nirmanai-amber.vercel.app",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization, content-type"
            }
        )
        assert res_options.status_code == 200, f"Expected 200 OK for OPTIONS preflight, got {res_options.status_code}"
        assert res_options.headers.get("access-control-allow-origin") == "https://nirmanai-amber.vercel.app"
        print("  [OK] Preflight OPTIONS request handled correctly")

        # ----------------------------------------------------
        # Test Case 2: Strict Environment Override
        # ----------------------------------------------------
        print("[5/5] Testing strict environment override (CORS_ORIGINS=https://nirmanai-amber.vercel.app) ...")
        os.environ["CORS_ORIGINS"] = "https://nirmanai-amber.vercel.app"
        importlib.reload(backend.app.main)
        from backend.app.main import app as strict_app

        strict_client = TestClient(strict_app)

        # Allowed origin succeeds
        res_prod = strict_client.get("/api/health", headers={"Origin": "https://nirmanai-amber.vercel.app"})
        assert res_prod.headers.get("access-control-allow-origin") == "https://nirmanai-amber.vercel.app"

        # Localhost must NOT be allowed when CORS_ORIGINS is strictly set to Vercel
        res_unauth = strict_client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        assert res_unauth.headers.get("access-control-allow-origin") is None, (
            "Localhost origin should NOT be allowed when CORS_ORIGINS is strictly set to production domain"
        )
        print("  [OK] Strict CORS_ORIGINS enforcement verified (only specified origin allowed)")

        print("\n==================================================")
        print("ALL CORS VERIFICATIONS PASSED SUCCESSFULLY!")
        print("==================================================\n")

    finally:
        # Restore environment
        if orig_cors_env is not None:
            os.environ["CORS_ORIGINS"] = orig_cors_env
        else:
            os.environ.pop("CORS_ORIGINS", None)
        importlib.reload(backend.app.main)


if __name__ == "__main__":
    run_cors_tests()
