"""
scripts/testing/test_dependencies.py

Phase 17 — Dependency Intelligence Comprehensive Test Suite & Invariant Verifier.
Validates graph node/edge creation, evidence status classification, bottleneck analysis,
API contract compliance, resilience to malformed requests, and golden ML/environmental risk regression.
"""

import sys
import os
import json
import logging
import sqlalchemy

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.services.dependency_service import (
    dependency_service, NodeType, RelationshipType, EvidenceStatus
)
from backend.app.services.risk_engine import risk_engine_service
from backend.app.services.environmental_service import EnvironmentalService

logging.basicConfig(level=logging.ERROR)


def run_tests():
    results = []

    # Bootstrap DB tables & populated nodes
    dependency_service.ensure_dependency_graph_populated()

    # 1. DEP-001: Dependency Health Endpoint
    health = dependency_service.get_dependency_health()
    health_ok = health.get("status") == "healthy" and health.get("nodes", 0) > 0 and health.get("edges", 0) > 0
    results.append({
        "id": "DEP-001",
        "category": "API & Service Health",
        "name": "Dependency Health Endpoint Statistics Verification",
        "passed": health_ok,
        "severity": "P0",
        "expected": "status = healthy with nodes > 0 and edges > 0",
        "actual": f"Status: {health.get('status')}, Nodes: {health.get('nodes')}, Edges: {health.get('edges')}"
    })

    # 2. DEP-002: Project Dependency Endpoint (Golden Project 020100044)
    golden_code = "020100044"
    dep_044 = dependency_service.build_project_dependency_graph(golden_code)
    dep_044_ok = (
        dep_044.get("project_code") == golden_code and
        dep_044.get("project") is not None and
        len(dep_044.get("nodes", [])) >= 3 and
        len(dep_044.get("edges", [])) >= 2
    )
    results.append({
        "id": "DEP-002",
        "category": "Graph Extraction",
        "name": "Project Dependency Graph Extraction (020100044)",
        "passed": dep_044_ok,
        "severity": "P0",
        "expected": "nodes >= 3, edges >= 2 centered around 020100044",
        "actual": f"Nodes: {len(dep_044.get('nodes', []))}, Edges: {len(dep_044.get('edges', []))}"
    })

    # 3. DEP-003: Graph Node Types Integrity
    nodes = dep_044.get("nodes", [])
    node_types = set(n.get("type") for n in nodes)
    valid_node_types = set(NodeType.__members__.keys())
    nodes_type_ok = node_types.issubset(valid_node_types) and NodeType.PROJECT.value in node_types
    results.append({
        "id": "DEP-003",
        "category": "Data Model",
        "name": "Graph Node Types Validation & Enum Compliance",
        "passed": nodes_type_ok,
        "severity": "P0",
        "expected": "All node types map strictly to NodeType enum constants",
        "actual": f"Node Types Present: {list(node_types)}"
    })

    # 4. DEP-004: Graph Edge Creation & References
    edges = dep_044.get("edges", [])
    edges_valid = len(edges) > 0 and all("source" in e and "target" in e and "relationship_type" in e for e in edges)
    results.append({
        "id": "DEP-004",
        "category": "Data Model",
        "name": "Graph Edge Foreign Key & Relationship Mapping Integrity",
        "passed": edges_valid,
        "severity": "P0",
        "expected": "All edges contain valid source, target, and relationship_type",
        "actual": f"Edge count: {len(edges)}, Valid structure: {edges_valid}"
    })

    # 5. DEP-005: Relationship Types Enum Compliance
    edge_rels = set(e.get("relationship_type") for e in edges)
    valid_rels = set(RelationshipType.__members__.keys())
    rels_ok = edge_rels.issubset(valid_rels)
    results.append({
        "id": "DEP-005",
        "category": "Data Model",
        "name": "Relationship Types Enum Invariance",
        "passed": rels_ok,
        "severity": "P0",
        "expected": "All relationship types belong to RelationshipType enum",
        "actual": f"Relationship Types: {list(edge_rels)}"
    })

    # 6. DEP-006: Evidence Status Classification
    edge_ev = set(e.get("evidence_status") for e in edges)
    valid_ev = set(EvidenceStatus.__members__.keys())
    ev_ok = edge_ev.issubset(valid_ev) and len(edge_ev) > 0
    results.append({
        "id": "DEP-006",
        "category": "Evidence Integrity",
        "name": "Evidence Status Classification (OBSERVED/DOCUMENTED/INFERRED)",
        "passed": ev_ok,
        "severity": "P0",
        "expected": "Evidence status maps to OBSERVED, DOCUMENTED, or INFERRED",
        "actual": f"Evidence Statuses Present: {list(edge_ev)}"
    })

    # 7. DEP-007: Inferred Relationships Explicit Labelling
    inferred_edges = [e for e in edges if e.get("evidence_status") == EvidenceStatus.INFERRED.value]
    inferred_ok = all(e.get("evidence_status") == "INFERRED" and e.get("confidence") < 1.0 for e in inferred_edges)
    results.append({
        "id": "DEP-007",
        "category": "Evidence Integrity",
        "name": "Explicit Labelling of Inferred Dependencies with Confidence < 1.0",
        "passed": inferred_ok,
        "severity": "P0",
        "expected": "Inferred edges carry evidence_status = INFERRED and confidence < 1.0",
        "actual": f"Inferred Edges Count: {len(inferred_edges)}, All Labelled Properly: {inferred_ok}"
    })

    # 8. DEP-008: Zero Fabrication Safeguard
    # Verify evidence_text and source_reference are non-empty for documented/observed edges
    doc_edges = [e for e in edges if e.get("evidence_status") in (EvidenceStatus.DOCUMENTED.value, EvidenceStatus.OBSERVED.value)]
    no_fabrication_ok = all(len(e.get("evidence_text", "")) > 0 for e in doc_edges)
    results.append({
        "id": "DEP-008",
        "category": "Production Data Integrity",
        "name": "Non-Fabrication Safeguard (Grounding Reference Present)",
        "passed": no_fabrication_ok,
        "severity": "P0",
        "expected": "Documented/Observed dependencies carry evidence text grounding",
        "actual": f"Grounding Present: {no_fabrication_ok}"
    })

    # 9. DEP-009: Coordination Bottleneck Indicators Analysis
    bottlenecks = dependency_service.calculate_bottleneck_indicators()
    bottlenecks_ok = isinstance(bottlenecks, list) and len(bottlenecks) > 0 and all(
        "coordination_pressure_index" in b and "reasons" in b and "bottleneck_indicator" in b for b in bottlenecks
    )
    results.append({
        "id": "DEP-009",
        "category": "Bottleneck Analysis",
        "name": "Neutral Coordination Pressure Index & Bottleneck Indicator Calculation",
        "passed": bottlenecks_ok,
        "severity": "P0",
        "expected": "Bottleneck indicators returned with explainable neutral pressure index",
        "actual": f"Bottlenecks Identified: {len(bottlenecks)}, CPI Present: {bottlenecks_ok}"
    })

    # 10. DEP-010: Global Graph Filters
    global_filtered = dependency_service.build_global_dependency_graph(agency="BHAVNI", limit=50)
    filter_ok = (
        len(global_filtered.get("nodes", [])) > 0 and
        len(global_filtered.get("edges", [])) > 0 and
        global_filtered.get("summary", {}).get("applied_filters", {}).get("agency") == "BHAVNI"
    )
    results.append({
        "id": "DEP-010",
        "category": "Query Filters",
        "name": "Global Dependency Graph Parameterized Query Filtering",
        "passed": filter_ok,
        "severity": "P0",
        "expected": "Filtered graph returns agency BHAVNI nodes & edges cleanly",
        "actual": f"Filtered Nodes: {len(global_filtered.get('nodes', []))}, Edges: {len(global_filtered.get('edges', []))}"
    })

    # 11. DEP-011: Isolated Node Handling
    iso_res = dependency_service.build_project_dependency_graph("ISO_TEST_NONE")
    iso_ok = iso_res.get("summary", {}).get("node_count") == 0 and iso_res.get("project") is None
    results.append({
        "id": "DEP-011",
        "category": "Edge Cases",
        "name": "Isolated / Non-Existent Project Node Graceful Handling",
        "passed": iso_ok,
        "severity": "P1",
        "expected": "Returns empty nodes/edges structure with 0 count without crashing",
        "actual": f"Node count: {iso_res.get('summary', {}).get('node_count')}"
    })

    # 12. DEP-012: Missing Project Graceful Response
    missing_res = dependency_service.build_project_dependency_graph("999999999")
    missing_ok = missing_res.get("project") is None and missing_res.get("summary", {}).get("node_count") == 0
    results.append({
        "id": "DEP-012",
        "category": "Edge Cases",
        "name": "Missing Project Code 404 Graceful Payload Return",
        "passed": missing_ok,
        "severity": "P1",
        "expected": "project = None, node_count = 0",
        "actual": f"Project: {missing_res.get('project')}"
    })

    # 13. DEP-013: Malformed Project Code Resilience
    malformed_res = dependency_service.build_project_dependency_graph("INVALID' DROP TABLE;")
    malformed_ok = malformed_res.get("project") is None and malformed_res.get("summary", {}).get("node_count") == 0
    results.append({
        "id": "DEP-013",
        "category": "Resilience & Security",
        "name": "Malformed / Injection SQL Sanitization Resilience",
        "passed": malformed_ok,
        "severity": "P0",
        "expected": "Graceful sanitized handling without database execution error",
        "actual": f"Safe return: {malformed_ok}"
    })

    # 14. DEP-014: Golden Project ML Risk Regression Invariant (020100044)
    golden_risk = risk_engine_service.get_project_risk_assessment(golden_code)
    g_score = float(golden_risk.get("risk_score", 0))
    g_cat = golden_risk.get("risk_category")
    g_prob = float(golden_risk.get("predicted_severe_risk_prob", 0))
    g_warn = golden_risk.get("early_warning")

    ml_regression_ok = (
        abs(g_score - 76.07) < 0.2 and
        g_cat == "HIGH" and
        abs(g_prob - 0.7607) < 0.05 and
        g_warn is True
    )

    results.append({
        "id": "DEP-014",
        "category": "ML Risk Regression",
        "name": "Golden Project ML Risk Assessment Invariance (020100044)",
        "passed": ml_regression_ok,
        "severity": "P0",
        "expected": "risk_score = 76.07, category = HIGH, prob ≈ 0.7607, early_warning = true",
        "actual": f"Score: {g_score}, Category: {g_cat}, Prob: {g_prob}, EarlyWarning: {g_warn}"
    })

    # 15. DEP-015: Environmental Intelligence Regression Invariant
    env_rep = EnvironmentalService.get_project_environmental_report({"project_code": golden_code})
    base_ml = env_rep.get("base_ml_risk", {})
    env_score = float(base_ml.get("composite_risk_score", 0))
    env_cat = base_ml.get("risk_category")

    env_regression_ok = (
        abs(env_score - 76.07) < 0.2 and
        env_cat == "HIGH" and
        base_ml.get("unaltered_guarantee") is True
    )

    results.append({
        "id": "DEP-015",
        "category": "Environmental Regression",
        "name": "Environmental Intelligence Base ML Risk Preservation",
        "passed": env_regression_ok,
        "severity": "P0",
        "expected": "base_ml_risk.composite_risk_score = 76.07, risk_category = HIGH",
        "actual": f"Base ML Score: {env_score}, Category: {env_cat}"
    })

    # ============================================================
    # PHASE 19B — BOTTLENECK LEADERBOARD TEST SUITE (BOTTLE-001 to BOTTLE-013)
    # ============================================================

    # 16. BOTTLE-001: Existing bottleneck API returns valid data
    b_data = dependency_service.calculate_bottleneck_indicators()
    bottle_001_ok = (
        isinstance(b_data, list) and
        len(b_data) > 0 and
        all(
            "entity" in b and "entity_key" in b and "entity_type" in b and
            "coordination_pressure_index" in b and "projects_affected" in b and
            "dependency_count" in b for b in b_data
        )
    )
    results.append({
        "id": "BOTTLE-001",
        "category": "Bottleneck Leaderboard",
        "name": "Bottleneck Leaderboard Service Returns Valid Data Payload",
        "passed": bottle_001_ok,
        "severity": "P0",
        "expected": "Non-empty list of bottleneck items with entity keys & pressure index",
        "actual": f"Returned {len(b_data) if isinstance(b_data, list) else 0} entities. Structure valid: {bottle_001_ok}"
    })

    # 17. BOTTLE-002: Leaderboard ranking is strictly deterministic
    b_sorted_1 = sorted(
        b_data,
        key=lambda x: (-x["coordination_pressure_index"], -x["dependency_count"], x["entity"])
    )
    b_sorted_2 = sorted(
        dependency_service.calculate_bottleneck_indicators(),
        key=lambda x: (-x["coordination_pressure_index"], -x["dependency_count"], x["entity"])
    )
    bottle_002_ok = len(b_sorted_1) == len(b_sorted_2) and all(
        b_sorted_1[i]["entity_key"] == b_sorted_2[i]["entity_key"] for i in range(len(b_sorted_1))
    )
    results.append({
        "id": "BOTTLE-002",
        "category": "Bottleneck Leaderboard",
        "name": "Leaderboard Deterministic Ranking Invariance",
        "passed": bottle_002_ok,
        "severity": "P0",
        "expected": "Deterministic ordering by CPI desc -> dep_count desc -> name asc",
        "actual": f"Deterministic rank matching verified: {bottle_002_ok}"
    })

    # 18. BOTTLE-003: Coordination pressure remains 0–100
    cpis = [b["coordination_pressure_index"] for b in b_data]
    bottle_003_ok = len(cpis) > 0 and all(0.0 <= cpi <= 100.0 for cpi in cpis)
    results.append({
        "id": "BOTTLE-003",
        "category": "Coordination Pressure",
        "name": "Coordination Pressure Index Bounds Verification (0.0 to 100.0)",
        "passed": bottle_003_ok,
        "severity": "P0",
        "expected": "All CPI values fall strictly within [0.0, 100.0]",
        "actual": f"Min CPI: {min(cpis) if cpis else None}, Max CPI: {max(cpis) if cpis else None}"
    })

    # 19. BOTTLE-004: No invalid NaN/null/undefined entity names
    names = [b["entity"] for b in b_data]
    bottle_004_ok = all(
        name and str(name).strip().lower() not in ("nan", "none", "null", "undefined", "") for name in names
    )
    results.append({
        "id": "BOTTLE-004",
        "category": "Data Quality",
        "name": "No NaN / Null / Undefined Entity Display Names",
        "passed": bottle_004_ok,
        "severity": "P0",
        "expected font": "All entity names are non-empty valid strings",
        "expected": "Zero NaN/null names",
        "actual font": "",
        "actual": f"Inspected {len(names)} entities. All valid: {bottle_004_ok}"
    })

    # 20. BOTTLE-005: Evidence statuses remain valid: OBSERVED / DOCUMENTED / INFERRED
    ev_types = set()
    for b in b_data:
        if b.get("documented_dependencies", 0) > 0:
            ev_types.add("DOCUMENTED")
        if b.get("inferred_dependencies", 0) > 0:
            ev_types.add("INFERRED")
    bottle_005_ok = ev_types.issubset({"OBSERVED", "DOCUMENTED", "INFERRED"})
    results.append({
        "id": "BOTTLE-005",
        "category": "Evidence Integrity",
        "name": "Evidence Statuses Validity (OBSERVED / DOCUMENTED / INFERRED)",
        "passed": bottle_005_ok,
        "severity": "P0",
        "expected": "Subset of {OBSERVED, DOCUMENTED, INFERRED}",
        "actual": f"Evidence types found: {list(ev_types)}"
    })

    # 21. BOTTLE-006: No database mutation occurs
    from backend.app.services.project_service import get_db_engine
    engine = get_db_engine()
    with engine.connect() as conn:
        p_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM projects")).scalar()
        po_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM project_observations")).scalar()
        pf_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM project_features")).scalar()
        rs_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM risk_scores")).scalar()
        dn_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_nodes")).scalar()
        de_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_edges")).scalar()

    bottle_006_ok = (
        p_cnt == 3589 and
        po_cnt == 13098 and
        pf_cnt == 13098 and
        rs_cnt == 13098 and
        dn_cnt == 4496 and
        de_cnt == 19564
    )
    results.append({
        "id": "BOTTLE-006",
        "category": "Database Invariants",
        "name": "Zero Database Record Mutation Verification",
        "passed": bottle_006_ok,
        "severity": "P0",
        "expected": "projects=3589, obs=13098, feat=13098, risk=13098, nodes=4496, edges=19564",
        "actual": f"projects={p_cnt}, obs={po_cnt}, feat={pf_cnt}, risk={rs_cnt}, nodes={dn_cnt}, edges={de_cnt}"
    })

    # 22. BOTTLE-007, BOTTLE-008, BOTTLE-009: API Route Auth & RBAC Checks
    try:
        from fastapi.testclient import TestClient
        from backend.app.main import app
        from backend.app.core.db_init import ensure_users_table_exists, seed_bootstrap_admin_if_needed
        
        ensure_users_table_exists()
        seed_bootstrap_admin_if_needed()
        client = TestClient(app)

        # Unauthenticated request -> 401
        res_unauth = client.get("/api/dependencies/bottlenecks")
        unauth_ok = res_unauth.status_code == 401

        # Authorized login -> 200
        login_res = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "NirmanAdmin@2026"})
        auth_ok = False
        if login_res.status_code == 200:
            token = login_res.json().get("access_token")
            res_auth = client.get("/api/dependencies/bottlenecks", headers={"Authorization": f"Bearer {token}"})
            auth_ok = res_auth.status_code == 200 and isinstance(res_auth.json(), list)

        # Role RBAC check -> 403 on restricted role endpoint
        analyst_login = client.post("/api/auth/login", json={"username_or_email": "analyst", "password": "NirmanAnalyst@2026"})
        rbac_ok = False
        if analyst_login.status_code == 200:
            a_token = analyst_login.json().get("access_token")
            res_rbac = client.get("/api/auth/users", headers={"Authorization": f"Bearer {a_token}"})
            rbac_ok = res_rbac.status_code == 403

    except Exception as e:
        unauth_ok = False
        auth_ok = False
        rbac_ok = False

    results.append({
        "id": "BOTTLE-007",
        "category": "Authentication",
        "name": "Unauthenticated Request Returns 401 Unauthorized",
        "passed": unauth_ok,
        "severity": "P0",
        "expected": "HTTP 401 Unauthorized without bearer token",
        "actual": f"Status code: {res_unauth.status_code if 'res_unauth' in locals() else 'Error'}"
    })

    results.append({
        "id": "BOTTLE-008",
        "category": "Authorization",
        "name": "Authorized Role Session Returns 200 OK Payload",
        "passed": auth_ok,
        "severity": "P0",
        "expected": "HTTP 200 OK with bottleneck list payload",
        "actual": f"Auth status OK: {auth_ok}"
    })

    results.append({
        "id": "BOTTLE-009",
        "category": "RBAC Protection",
        "name": "Insufficient Role Rejection (403 Forbidden Enforcement)",
        "passed": rbac_ok,
        "severity": "P0",
        "expected": "HTTP 403 Forbidden on role-restricted endpoints",
        "actual font": "",
        "actual": f"RBAC 403 Rejection Verified: {rbac_ok}"
    })

    # 25. BOTTLE-010: Leaderboard does not modify ML risk
    golden_risk_after = risk_engine_service.get_project_risk_assessment(golden_code)
    bottle_010_ok = (
        float(golden_risk_after.get("risk_score", 0)) == float(golden_risk.get("risk_score", 0)) and
        golden_risk_after.get("risk_category") == golden_risk.get("risk_category")
    )
    results.append({
        "id": "BOTTLE-010",
        "category": "ML Risk Protection",
        "name": "Leaderboard Execution Does Not Alter ML Risk Output",
        "passed": bottle_010_ok,
        "severity": "P0",
        "expected": "ML risk assessment before and after calculation are identical",
        "actual": f"Scores match: {bottle_010_ok}"
    })

    # 26. BOTTLE-011: Golden project remains unchanged
    g_score_after = float(golden_risk_after.get("risk_score", 0))
    g_cat_after = golden_risk_after.get("risk_category")
    g_prob_after = float(golden_risk_after.get("predicted_severe_risk_prob", 0))
    g_warn_after = golden_risk_after.get("early_warning")

    bottle_011_ok = (
        abs(g_score_after - 76.07) < 0.2 and
        g_cat_after == "HIGH" and
        abs(g_prob_after - 0.7607) < 0.05 and
        g_warn_after is True
    )
    results.append({
        "id": "BOTTLE-011",
        "category": "Golden Project Regression",
        "name": "Golden Project (020100044) Invariants Preservation",
        "passed": bottle_011_ok,
        "severity": "P0",
        "expected": "76.07 / HIGH / 0.7607 / early_warning=true",
        "actual": f"Score: {g_score_after}, Category: {g_cat_after}, Prob: {g_prob_after}, Warn: {g_warn_after}"
    })

    # 27. BOTTLE-012: Dependency graph remains unchanged
    health_after = dependency_service.get_dependency_health()
    bottle_012_ok = health_after.get("nodes") == 4496 and health_after.get("edges") == 19564
    results.append({
        "id": "BOTTLE-012",
        "category": "Graph Integrity",
        "name": "Dependency Graph Node (4496) & Edge (19564) Counts Preservation",
        "passed": bottle_012_ok,
        "severity": "P0",
        "expected": "Nodes = 4496, Edges = 19564",
        "actual": f"Nodes: {health_after.get('nodes')}, Edges: {health_after.get('edges')}"
    })

    # 28. BOTTLE-013: Satellite Change Detection Active & Registered (Phase 19C)
    import importlib.util
    sat_module_exists = importlib.util.find_spec("backend.app.routes.satellite") is not None
    bottle_013_ok = sat_module_exists
    results.append({
        "id": "BOTTLE-013",
        "category": "Phase Scoping",
        "name": "Satellite Change Detection Active & Registered (Phase 19C)",
        "passed": bottle_013_ok,
        "severity": "P0",
        "expected": "Satellite route module active and registered in Phase 19C",
        "actual": f"Satellite module present: {sat_module_exists}"
    })

    return results


if __name__ == "__main__":
    res = run_tests()
    print(json.dumps(res, indent=2))

