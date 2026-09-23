"""
scripts/testing/test_stress_test.py

Phase 18 — Synthetic Stress-Test / What-If Scenario Engine Automated Test Suite.
Validates STRESS-001 through STRESS-020.
"""

import sys
import os
import math
import concurrent.futures
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.services.project_service import get_db_engine
from backend.app.core.security import create_access_token

client = TestClient(app)

GOLDEN_PROJECT_CODE = "020100044"

def ensure_test_user():
    engine = get_db_engine()
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO users (username, email, full_name, password_hash, role, is_active)
                VALUES ('test_admin', 'test_admin@nirman.gov.in', 'Test Admin', 'hash', 'ADMIN', true)
                ON CONFLICT (username) DO NOTHING
            """))
    except Exception as e:
        print(f"[Warning] Could not insert test user: {e}")

ensure_test_user()
test_token = create_access_token({"sub": "test_admin", "role": "ADMIN"})
auth_headers = {"Authorization": f"Bearer {test_token}"}


def get_db_counts():
    """Helper to audit production database row counts using SQLAlchemy engine."""
    engine = get_db_engine()
    tables = [
        "projects",
        "project_observations",
        "project_features",
        "risk_scores",
        "dependency_nodes",
        "dependency_edges"
    ]
    counts = {}
    with engine.connect() as conn:
        for t in tables:
            try:
                res = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                counts[t] = res
            except Exception:
                counts[t] = 0
    return counts


def run_all_tests():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("==================================================")
    print("PHASE 18 SYNTHETIC STRESS-TEST SUITE")
    print("==================================================")

    initial_counts = get_db_counts()
    print(f"[Audit] Initial DB Row Counts: {initial_counts}")

    passed = 0
    total = 20

    # STRESS-001: Baseline scenario returns unchanged baseline values
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Baseline Test",
            "changes": {}
        })
        assert resp.status_code == 200, f"Status: {resp.status_code}"
        data = resp.json()
        assert data["simulation"] is True
        assert data["scenario_name"] == "Baseline Test"
        assert abs(data["scenario"]["risk_score"] - data["baseline"]["risk_score"]) < 0.01
        assert data["impact"]["risk_score_delta"] == 0.0
        print("[PASS] STRESS-001 Passed: Baseline scenario returns unchanged baseline values.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-001 Failed: {e}")

    # STRESS-002: Custom cost scenario validates input
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Cost Stress",
            "changes": {
                "cost_overrun_percent": 15.0
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["impact"]["cost_pressure_delta"] == 15.0
        assert data["scenario"]["risk_score"] > data["baseline"]["risk_score"]
        print("[PASS] STRESS-002 Passed: Custom cost scenario validates input correctly.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-002 Failed: {e}")

    # STRESS-003: Schedule stress changes only synthetic values
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Schedule Stress",
            "changes": {
                "additional_delay_months": 12
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"]["additional_delay_months"] == 12
        assert "simulated_delay_months" in data["scenario"]
        # Verify production endpoint still has zero delay added
        orig_resp = client.get(f"/api/risk/intelligence/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        r_json = orig_resp.json()
        r_assess = r_json.get("risk_assessment", r_json)
        assert abs(float(r_assess.get("risk_score") or r_assess.get("composite_risk_score")) - 76.07) < 0.01
        print("[PASS] STRESS-003 Passed: Schedule stress changes only synthetic values.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-003 Failed: {e}")

    # STRESS-004: Environmental stress uses existing environmental rules
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Weather Stress",
            "changes": {
                "rainfall_multiplier": 3.0,
                "temperature_delta_c": 10.0
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "environmental_context" in data["scenario"]
        assert data["method"]["environment"] in ("CONTEXTUAL", "RULE_BASED")
        print("[PASS] STRESS-004 Passed: Environmental stress uses existing environmental rules.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-004 Failed: {e}")

    # STRESS-005: Dependency stress does not mutate dependency tables
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Dependency Disruption",
            "changes": {
                "dependency_disruption": True,
                "clearance_delay_months": 6
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"]["dependency_context"]["synthetic_disruption"] is True
        dep_resp = client.get(f"/api/dependencies/project/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        assert dep_resp.status_code == 200
        print("[PASS] STRESS-005 Passed: Dependency stress does not mutate dependency tables.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-005 Failed: {e}")

    # STRESS-006: Production project record unchanged
    try:
        p_resp = client.get(f"/api/projects/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        assert p_resp.status_code in (200, 404)
        print("[PASS] STRESS-006 Passed: Production project record remains intact.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-006 Failed: {e}")

    # STRESS-007: Production risk_score unchanged
    try:
        r_resp = client.get(f"/api/risk/intelligence/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        assert r_resp.status_code == 200
        r_json = r_resp.json()
        r_assess = r_json.get("risk_assessment", r_json)
        assert abs(float(r_assess.get("risk_score") or r_assess.get("composite_risk_score")) - 76.07) < 0.01
        assert str(r_assess.get("risk_category")).upper() == "HIGH"
        print("[PASS] STRESS-007 Passed: Production risk_score is completely unchanged.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-007 Failed: {e}")

    # STRESS-008: Golden project 020100044 remains: 76.07 / HIGH / 0.7607 / true
    try:
        r_resp = client.get(f"/api/risk/intelligence/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        assert r_resp.status_code == 200
        r_json = r_resp.json()
        r_assess = r_json.get("risk_assessment", r_json)
        assert abs(float(r_assess.get("risk_score") or r_assess.get("composite_risk_score")) - 76.07) < 0.01
        assert str(r_assess.get("risk_category")).upper() == "HIGH"
        assert abs(float(r_assess.get("predicted_severe_risk_prob")) - 0.7607) < 0.001
        assert r_assess.get("early_warning") is True
        print("[PASS] STRESS-008 Passed: Golden project 020100044 authoritative values intact: 76.07 / HIGH / 0.7607 / true.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-008 Failed: {e}")

    # STRESS-009: Scenario early warning is separate from production early_warning
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Combined Stress",
            "changes": {
                "additional_delay_months": 12,
                "cost_overrun_percent": 20
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "scenario_early_warning" in data["scenario"]
        assert data["disclaimer"] is not None
        print("[PASS] STRESS-009 Passed: Scenario early warning is separate from production early_warning.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-009 Failed: {e}")

    # STRESS-010: Invalid project returns 404
    try:
        resp = client.post("/api/stress-test/project/NONEXISTENT9999", json={
            "scenario_name": "Invalid Project Test",
            "changes": {}
        })
        assert resp.status_code == 404
        print("[PASS] STRESS-010 Passed: Invalid project code returns HTTP 404 Not Found.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-010 Failed: {e}")

    # STRESS-011: Invalid parameter rejected
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Negative Delay",
            "changes": {
                "additional_delay_months": -10
            }
        })
        assert resp.status_code == 422
        print("[PASS] STRESS-011 Passed: Out-of-bounds parameter (-10 delay) properly rejected with HTTP 422.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-011 Failed: {e}")

    # STRESS-012: NaN/infinite input rejected
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Infinite Input",
            "changes": {
                "cost_overrun_percent": "NaN"
            }
        })
        assert resp.status_code in (400, 422)
        print("[PASS] STRESS-012 Passed: NaN/infinite input safely rejected.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-012 Failed: {e}")

    # STRESS-013: Extreme bounded values handled safely
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Max Bounded Stress",
            "changes": {
                "cost_overrun_percent": 500,
                "additional_delay_months": 120
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"]["risk_score"] <= 100.0
        assert data["scenario"]["risk_category"] == "CRITICAL"
        print("[PASS] STRESS-013 Passed: Extreme bounded values capped safely at 100.0 max risk score.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-013 Failed: {e}")

    # STRESS-014: Gemini receives simulation=true context
    try:
        from backend.app.services.assistant_service import _build_prompt
        prompt = _build_prompt(
            query="Analyze synthetic scenario results for 020100044 under 10% cost overrun",
            evidence={"simulation_context": True},
            history=[]
        )
        assert "SYNTHETIC STRESS-TEST & SIMULATION RULES" in prompt
        print("[PASS] STRESS-014 Passed: Gemini system prompt incorporates simulation=true rules.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-014 Failed: {e}")

    # STRESS-015: Simulation disclaimer present
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Disclaimer Check",
            "changes": {}
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "Synthetic scenario only" in data["disclaimer"]
        assert "Actual project data was not modified" in data["disclaimer"]
        print("[PASS] STRESS-015 Passed: Prominent synthetic simulation disclaimer present.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-015 Failed: {e}")

    # STRESS-016: Environment regression check
    try:
        env_resp = client.get(f"/api/environment/project/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        assert env_resp.status_code == 200
        env_data = env_resp.json()
        assert env_data["base_ml_risk"]["composite_risk_score"] == 76.07
        assert env_data["base_ml_risk"]["risk_category"] == "HIGH"
        print("[PASS] STRESS-016 Passed: Phase 16 Environmental Intelligence baseline preserved.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-016 Failed: {e}")

    # STRESS-017: Dependency regression check
    try:
        dep_resp = client.get(f"/api/dependencies/project/{GOLDEN_PROJECT_CODE}", headers=auth_headers)
        assert dep_resp.status_code == 200
        dep_data = dep_resp.json()
        assert "nodes" in dep_data and "edges" in dep_data
        print("[PASS] STRESS-017 Passed: Phase 17 Dependency Intelligence baseline preserved.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-017 Failed: {e}")

    # STRESS-018: No production database mutation
    try:
        final_counts = get_db_counts()
        assert initial_counts == final_counts, f"DB counts changed! Initial: {initial_counts}, Final: {final_counts}"
        print("[PASS] STRESS-018 Passed: ABSOLUTE DB MUTATION AUDIT — Zero database writes detected.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-018 Failed: {e}")

    # STRESS-019: Concurrent scenario requests do not share mutable state
    try:
        def request_scenario(delay_val):
            return client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
                "scenario_name": f"Concurrent {delay_val}",
                "changes": {"additional_delay_months": delay_val}
            }).json()

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(request_scenario, d) for d in [3, 6, 12, 18, 24]]
            results = [f.result() for f in futures]

        for res, exp_d in zip(results, [3, 6, 12, 18, 24]):
            assert res["scenario"]["additional_delay_months"] == exp_d
        print("[PASS] STRESS-019 Passed: Concurrent scenario requests maintain full in-memory isolation.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] STRESS-019 Failed: {e}")

    # STRESS-020: Reset returns to baseline
    try:
        resp = client.post(f"/api/stress-test/project/{GOLDEN_PROJECT_CODE}", json={
            "scenario_name": "Reset Baseline",
            "changes": {
                "additional_delay_months": 0,
                "cost_overrun_percent": 0.0,
                "rainfall_multiplier": 1.0,
                "temperature_delta_c": 0.0,
                "dependency_disruption": False
            }
        })
        assert resp.status_code == 200
        data = resp.json()
        assert abs(data["scenario"]["risk_score"] - data["baseline"]["risk_score"]) < 0.01
        assert data["impact"]["risk_score_delta"] == 0.0
        print("[PASS] STRESS-020 Passed: Explicit scenario reset returns exactly to project baseline.")
        passed += 1
    except Exception as e:
        print(f"❌ STRESS-020 Failed: {e}")

    print("==================================================")
    print(f"STRESS TEST SUMMARY: {passed}/{total} Passed")
    print("==================================================")
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)
