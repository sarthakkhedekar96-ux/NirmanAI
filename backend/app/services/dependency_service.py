"""
backend/app/services/dependency_service.py

Phase 17 — Dependency Intelligence & Cross-Department Dependency Graph Service.
Provides deterministic graph extraction, evidence classification, bottleneck indicators,
and graph health metrics based strictly on master infrastructure project data.

STRICT INVARIANTS:
1. Does NOT mutate composite_risk_score, risk_category, severe_risk_probability, SHAP, or DB risk_scores.
2. Every edge carries an explicit evidence_status (OBSERVED, DOCUMENTED, INFERRED).
3. Bottleneck indicators use neutral, objective terminology (coordination pressure index).
"""

import json
import logging
from enum import Enum
from typing import Dict, Any, List, Optional
import sqlalchemy
import pandas as pd
from backend.app.services.project_service import get_db_engine, get_project_details
from backend.app.core.db_init import ensure_dependency_tables_exist

logger = logging.getLogger("nirman.dependency_service")


class NodeType(str, Enum):
    PROJECT = "PROJECT"
    AGENCY = "AGENCY"
    DEPARTMENT = "DEPARTMENT"
    CONTRACTOR = "CONTRACTOR"
    FUNDING_ENTITY = "FUNDING_ENTITY"
    CLEARANCE_AUTHORITY = "CLEARANCE_AUTHORITY"
    SECTOR = "SECTOR"
    STATE = "STATE"


class RelationshipType(str, Enum):
    OWNS = "OWNS"
    IMPLEMENTS = "IMPLEMENTS"
    DEPENDS_ON = "DEPENDS_ON"
    CLEARANCE_FROM = "CLEARANCE_FROM"
    FUNDS = "FUNDS"
    AFFECTS = "AFFECTS"


class EvidenceStatus(str, Enum):
    OBSERVED = "OBSERVED"
    DOCUMENTED = "DOCUMENTED"
    INFERRED = "INFERRED"


# Deterministic mappings from agency codes to Ministries/Departments, Funding Bodies, and Clearances
AGENCY_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "BHAVNI": {
        "agency_name": "BHAVINI - Bharatiya Nabhikiya Vidyut Nigam Limited",
        "department_key": "DEPT:DAE",
        "department_name": "Department of Atomic Energy (DAE)",
        "funding_key": "FUND:DAE_CAPITAL",
        "funding_name": "Department of Atomic Energy Capital Grant",
        "clearance_authorities": [
            {"key": "CLEARANCE:AERB", "name": "Atomic Energy Regulatory Board (AERB)", "status": EvidenceStatus.DOCUMENTED.value, "text": "Nuclear safety and commissioning clearance"},
            {"key": "CLEARANCE:MOEFCC", "name": "Ministry of Environment, Forest and Climate Change", "status": EvidenceStatus.INFERRED.value, "text": "Environmental and coastal regulation zone clearance"}
        ]
    },
    "NR": {
        "agency_name": "Northern Railway Zone",
        "department_key": "DEPT:MOR",
        "department_name": "Ministry of Railways (Railway Board)",
        "funding_key": "FUND:RAILWAY_CAPEX",
        "funding_name": "Central Railway Gross Budgetary Support",
        "clearance_authorities": [
            {"key": "CLEARANCE:FOREST_DEPT", "name": "State Forest Department", "status": EvidenceStatus.DOCUMENTED.value, "text": "Forest diversion and right-of-way clearance"},
            {"key": "CLEARANCE:LAND_REV", "name": "State Land Revenue Department", "status": EvidenceStatus.DOCUMENTED.value, "text": "Land acquisition and ROW handovers"}
        ]
    },
    "SR": {
        "agency_name": "Southern Railway Zone",
        "department_key": "DEPT:MOR",
        "department_name": "Ministry of Railways (Railway Board)",
        "funding_key": "FUND:RAILWAY_CAPEX",
        "funding_name": "Central Railway Gross Budgetary Support",
        "clearance_authorities": [
            {"key": "CLEARANCE:FOREST_DEPT", "name": "State Forest Department", "status": EvidenceStatus.DOCUMENTED.value, "text": "Forest diversion and right-of-way clearance"},
            {"key": "CLEARANCE:LAND_REV", "name": "State Land Revenue Department", "status": EvidenceStatus.DOCUMENTED.value, "text": "Land acquisition and ROW handovers"}
        ]
    },
    "NHAI": {
        "agency_name": "National Highways Authority of India",
        "department_key": "DEPT:MORTH",
        "department_name": "Ministry of Road Transport and Highways (MoRTH)",
        "funding_key": "FUND:CRIF",
        "funding_name": "Central Road and Infrastructure Fund (CRIF)",
        "clearance_authorities": [
            {"key": "CLEARANCE:MOEFCC", "name": "Ministry of Environment, Forest and Climate Change", "status": EvidenceStatus.DOCUMENTED.value, "text": "Environmental & forest clearance"},
            {"key": "CLEARANCE:LAND_REV", "name": "State Land Acquisition Authority", "status": EvidenceStatus.DOCUMENTED.value, "text": "3a/3d Land Acquisition Notifications"}
        ]
    },
    "NTPC": {
        "agency_name": "NTPC Limited",
        "department_key": "DEPT:MOP",
        "department_name": "Ministry of Power",
        "funding_key": "FUND:POWER_CAPEX",
        "funding_name": "NTPC Internal Resources & Debt Facilities",
        "clearance_authorities": [
            {"key": "CLEARANCE:CEA", "name": "Central Electricity Authority (CEA)", "status": EvidenceStatus.DOCUMENTED.value, "text": "Techno-economic concurrence & grid connectivity"},
            {"key": "CLEARANCE:MOEFCC", "name": "Ministry of Environment, Forest and Climate Change", "status": EvidenceStatus.DOCUMENTED.value, "text": "Thermal/Environmental clearance"}
        ]
    },
    "PGCIL": {
        "agency_name": "Power Grid Corporation of India Limited",
        "department_key": "DEPT:MOP",
        "department_name": "Ministry of Power",
        "funding_key": "FUND:POWER_CAPEX",
        "funding_name": "Power Grid Capital Outlay",
        "clearance_authorities": [
            {"key": "CLEARANCE:FOREST_DEPT", "name": "State Forest Department", "status": EvidenceStatus.DOCUMENTED.value, "text": "Forest clearance for transmission line corridor"},
            {"key": "CLEARANCE:CEA", "name": "Central Electricity Authority (CEA)", "status": EvidenceStatus.DOCUMENTED.value, "text": "Grid interconnection approval"}
        ]
    }
}


def _get_default_agency_knowledge(agency_code: str) -> Dict[str, Any]:
    clean_code = (agency_code or "UNSPECIFIED").strip().upper()
    if clean_code in AGENCY_KNOWLEDGE_BASE:
        return AGENCY_KNOWLEDGE_BASE[clean_code]
    
    # Generic deterministic fallback for unrecognized agencies
    return {
        "agency_name": f"Executing Agency ({clean_code})",
        "department_key": f"DEPT:{clean_code}_ADMIN",
        "department_name": f"Administrative Ministry for {clean_code}",
        "funding_key": f"FUND:{clean_code}_ALLOC",
        "funding_name": f"Budgetary Allocation ({clean_code})",
        "clearance_authorities": [
            {"key": "CLEARANCE:MOEFCC", "name": "Ministry of Environment, Forest and Climate Change", "status": EvidenceStatus.INFERRED.value, "text": "Standard environmental compliance clearance"},
            {"key": "CLEARANCE:LAND_REV", "name": "State Land Revenue Department", "status": EvidenceStatus.INFERRED.value, "text": "Local right-of-way and site handover"}
        ]
    }


def _is_invalid_str(val: Any) -> bool:
    if val is None or pd.isna(val):
        return True
    s = str(val).strip().lower()
    return s in ("", "nan", "none", "null", "undefined")


def _clean_display_name(val: Any, default_fallback: str = "Unknown / Not Available") -> str:
    if _is_invalid_str(val):
        return default_fallback
    return str(val).strip()


class DependencyService:
    @staticmethod
    def ensure_dependency_graph_populated() -> None:
        """
        Populates dependency nodes and edges deterministically from master projects if table is empty.
        """
        ensure_dependency_tables_exist()
        engine = get_db_engine()

        try:
            with engine.connect() as conn:
                count_res = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_nodes")).scalar()
                if count_res and count_res > 0:
                    return

            logger.info("⚡ Initializing Phase 17 Dependency Graph from master project metadata...")

            # Load projects
            with engine.connect() as conn:
                df_p = pd.read_sql(sqlalchemy.text("SELECT project_code, project_name, agency, state, sector FROM projects"), conn)

            if df_p.empty:
                return

            nodes_to_insert = {}
            edges_to_insert = []

            for _, row in df_p.iterrows():
                pcode = str(row["project_code"]).strip()
                pname = str(row.get("project_name") or f"Project {pcode}").strip()
                
                raw_agency = row.get("agency")
                agency_code = "UNSPECIFIED" if _is_invalid_str(raw_agency) else str(raw_agency).strip().upper()

                raw_state = row.get("state")
                state_name = None if _is_invalid_str(raw_state) else str(raw_state).strip()

                raw_sector = row.get("sector")
                sector_name = None if _is_invalid_str(raw_sector) else str(raw_sector).strip()

                # Project Node
                pnode_key = f"PROJECT:{pcode}"
                nodes_to_insert[pnode_key] = (NodeType.PROJECT.value, pnode_key, f"{pcode} - {pname[:60]}", json.dumps({"project_code": pcode}))

                # State Node & Edge
                if state_name:
                    st_key = f"STATE:{state_name.upper()}"
                    nodes_to_insert[st_key] = (NodeType.STATE.value, st_key, state_name.title(), json.dumps({"state": state_name}))
                    edges_to_insert.append((pnode_key, st_key, RelationshipType.AFFECTS.value, EvidenceStatus.OBSERVED.value, 1.0, f"Project located in {state_name}", "Master Project Record"))

                # Sector Node & Edge
                if sector_name:
                    sec_key = f"SECTOR:{sector_name.upper()}"
                    nodes_to_insert[sec_key] = (NodeType.SECTOR.value, sec_key, sector_name.title(), json.dumps({"sector": sector_name}))
                    edges_to_insert.append((pnode_key, sec_key, RelationshipType.DEPENDS_ON.value, EvidenceStatus.OBSERVED.value, 1.0, f"Project categorized under {sector_name} sector", "Master Project Record"))

                # Agency Node & Edge
                agency_info = _get_default_agency_knowledge(agency_code)
                ag_key = f"AGENCY:{agency_code}"
                nodes_to_insert[ag_key] = (NodeType.AGENCY.value, ag_key, agency_info["agency_name"], json.dumps({"agency_code": agency_code}))
                edges_to_insert.append((pnode_key, ag_key, RelationshipType.IMPLEMENTS.value, EvidenceStatus.OBSERVED.value, 1.0, f"Executed by {agency_info['agency_name']}", "Master Project Agency Record"))

                # Department Node & Edge
                dept_key = agency_info["department_key"]
                nodes_to_insert[dept_key] = (NodeType.DEPARTMENT.value, dept_key, agency_info["department_name"], json.dumps({"department": agency_info["department_name"]}))
                edges_to_insert.append((ag_key, dept_key, RelationshipType.OWNS.value, EvidenceStatus.DOCUMENTED.value, 0.95, "Administrative oversight", "Ministry Allocation Rules"))
                edges_to_insert.append((pnode_key, dept_key, RelationshipType.DEPENDS_ON.value, EvidenceStatus.DOCUMENTED.value, 0.90, "Central department policy & budget sanction", "Administrative Hierarchy"))

                # Funding Entity Node & Edge
                fund_key = agency_info["funding_key"]
                nodes_to_insert[fund_key] = (NodeType.FUNDING_ENTITY.value, fund_key, agency_info["funding_name"], json.dumps({"funding_entity": agency_info["funding_name"]}))
                edges_to_insert.append((fund_key, pnode_key, RelationshipType.FUNDS.value, EvidenceStatus.DOCUMENTED.value, 0.90, "Capital outlay and grant allocation", "Central Budget Outlay"))

                # Clearance Authorities
                for ca in agency_info.get("clearance_authorities", []):
                    ca_key = ca["key"]
                    nodes_to_insert[ca_key] = (NodeType.CLEARANCE_AUTHORITY.value, ca_key, ca["name"], json.dumps({"clearance_authority": ca["name"]}))
                    edges_to_insert.append((pnode_key, ca_key, RelationshipType.CLEARANCE_FROM.value, ca["status"], 0.85 if ca["status"] == EvidenceStatus.INFERRED.value else 0.95, ca["text"], "Regulatory Compliance Requirements"))

            # Save nodes into DB
            with engine.begin() as conn:
                for n_type, n_key, d_name, meta in nodes_to_insert.values():
                    conn.execute(sqlalchemy.text("""
                        INSERT INTO dependency_nodes (node_type, node_key, display_name, metadata_json)
                        VALUES (:ntype, :nkey, :dname, :meta)
                        ON CONFLICT (node_key) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = CURRENT_TIMESTAMP
                    """), {"ntype": n_type, "nkey": n_key, "dname": d_name, "meta": meta})

                # Fetch node ID mapping
                df_nodes = pd.read_sql(sqlalchemy.text("SELECT id, node_key FROM dependency_nodes"), conn)
                node_id_map = dict(zip(df_nodes["node_key"], df_nodes["id"]))

                # Insert edges
                for src_key, tgt_key, rel_type, ev_stat, conf, ev_txt, src_ref in edges_to_insert:
                    src_id = node_id_map.get(src_key)
                    tgt_id = node_id_map.get(tgt_key)
                    if src_id and tgt_id:
                        conn.execute(sqlalchemy.text("""
                            INSERT INTO dependency_edges (source_node_id, target_node_id, relationship_type, evidence_status, confidence, evidence_text, source_reference)
                            VALUES (:src, :tgt, :rel, :ev_stat, :conf, :ev_txt, :src_ref)
                            ON CONFLICT (source_node_id, target_node_id, relationship_type) DO UPDATE
                            SET evidence_status = EXCLUDED.evidence_status, confidence = EXCLUDED.confidence, evidence_text = EXCLUDED.evidence_text
                        """), {"src": src_id, "tgt": tgt_id, "rel": rel_type, "ev_stat": ev_stat, "conf": conf, "ev_txt": ev_txt, "src_ref": src_ref})

            logger.info("✅ Phase 17 Dependency Graph successfully bootstrapped in database.")

        except Exception as e:
            logger.error(f"Error populating dependency graph: {e}")

    @staticmethod
    def build_project_dependency_graph(project_code: str) -> Dict[str, Any]:
        """
        Builds graph network centered around a specific project.
        """
        DependencyService.ensure_dependency_graph_populated()
        engine = get_db_engine()
        pcode = str(project_code).strip()

        # Check if project exists
        p_details = get_project_details(pcode)
        if not p_details:
            return {
                "project_code": pcode,
                "project": None,
                "nodes": [],
                "edges": [],
                "summary": {
                    "node_count": 0,
                    "edge_count": 0,
                    "documented_dependencies": 0,
                    "inferred_dependencies": 0,
                    "coordination_bottleneck_indicator": False
                },
                "error": "Project not found"
            }

        pnode_key = f"PROJECT:{pcode}"

        try:
            with engine.connect() as conn:
                # Find project node ID
                res = conn.execute(sqlalchemy.text("SELECT id, node_type, node_key, display_name FROM dependency_nodes WHERE node_key = :key"), {"key": pnode_key}).fetchone()
                if not res:
                    return {
                        "project_code": pcode,
                        "project": {"node_id": None, "name": p_details.get("project_name")},
                        "nodes": [],
                        "edges": [],
                        "summary": {"node_count": 0, "edge_count": 0, "documented_dependencies": 0, "inferred_dependencies": 0, "coordination_bottleneck_indicator": False}
                    }

                p_node_id, p_type, p_key, p_name = res

                # Get connected edges (incoming & outgoing)
                edge_query = """
                SELECT e.id, e.source_node_id, e.target_node_id, e.relationship_type, e.evidence_status,
                       e.confidence, e.evidence_text, e.source_reference,
                       sn.node_key as source_key, sn.display_name as source_name, sn.node_type as source_type,
                       tn.node_key as target_key, tn.display_name as target_name, tn.node_type as target_type
                FROM dependency_edges e
                JOIN dependency_nodes sn ON e.source_node_id = sn.id
                JOIN dependency_nodes tn ON e.target_node_id = tn.id
                WHERE e.source_node_id = :pid OR e.target_node_id = :pid
                """
                df_edges = pd.read_sql(sqlalchemy.text(edge_query), conn, params={"pid": p_node_id})

            nodes_dict = {
                p_node_id: {
                    "id": str(p_node_id),
                    "type": p_type,
                    "key": p_key,
                    "name": p_name,
                    "evidence_status": EvidenceStatus.OBSERVED.value
                }
            }

            edges_list = []
            documented_cnt = 0
            inferred_cnt = 0

            for _, r in df_edges.iterrows():
                src_id = int(r["source_node_id"])
                tgt_id = int(r["target_node_id"])
                ev_status = str(r["evidence_status"])

                if ev_status in (EvidenceStatus.DOCUMENTED.value, EvidenceStatus.OBSERVED.value):
                    documented_cnt += 1
                else:
                    inferred_cnt += 1

                if src_id not in nodes_dict:
                    nodes_dict[src_id] = {
                        "id": str(src_id),
                        "type": str(r["source_type"]),
                        "key": str(r["source_key"]),
                        "name": str(r["source_name"]),
                        "evidence_status": ev_status
                    }
                if tgt_id not in nodes_dict:
                    nodes_dict[tgt_id] = {
                        "id": str(tgt_id),
                        "type": str(r["target_type"]),
                        "key": str(r["target_key"]),
                        "name": str(r["target_name"]),
                        "evidence_status": ev_status
                    }

                edges_list.append({
                    "id": str(r["id"]),
                    "source": str(src_id),
                    "target": str(tgt_id),
                    "source_key": str(r["source_key"]),
                    "target_key": str(r["target_key"]),
                    "relationship_type": str(r["relationship_type"]),
                    "evidence_status": ev_status,
                    "confidence": float(r["confidence"]),
                    "evidence_text": str(r.get("evidence_text") or ""),
                    "source_reference": str(r.get("source_reference") or "")
                })

            bottleneck_flag = len(edges_list) >= 4 or inferred_cnt > 1

            return {
                "project_code": pcode,
                "project": {
                    "node_id": str(p_node_id),
                    "name": p_name
                },
                "nodes": list(nodes_dict.values()),
                "edges": edges_list,
                "summary": {
                    "node_count": len(nodes_dict),
                    "edge_count": len(edges_list),
                    "documented_dependencies": documented_cnt,
                    "inferred_dependencies": inferred_cnt,
                    "coordination_bottleneck_indicator": bottleneck_flag
                }
            }

        except Exception as e:
            logger.error(f"Error building project dependency graph for {pcode}: {e}")
            return {
                "project_code": pcode,
                "project": {"node_id": None, "name": p_details.get("project_name")},
                "nodes": [],
                "edges": [],
                "summary": {"node_count": 0, "edge_count": 0, "documented_dependencies": 0, "inferred_dependencies": 0, "coordination_bottleneck_indicator": False}
            }

    @staticmethod
    def build_global_dependency_graph(
        state: Optional[str] = None,
        agency: Optional[str] = None,
        relationship_type: Optional[str] = None,
        evidence_status: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Retrieves global dependency graph with safe parameters and limit bounds.
        """
        DependencyService.ensure_dependency_graph_populated()
        engine = get_db_engine()
        safe_limit = max(10, min(int(limit), 500))

        query = """
        SELECT e.id, e.source_node_id, e.target_node_id, e.relationship_type, e.evidence_status,
               e.confidence, e.evidence_text, e.source_reference,
               sn.node_key as source_key, sn.display_name as source_name, sn.node_type as source_type,
               tn.node_key as target_key, tn.display_name as target_name, tn.node_type as target_type
        FROM dependency_edges e
        JOIN dependency_nodes sn ON e.source_node_id = sn.id
        JOIN dependency_nodes tn ON e.target_node_id = tn.id
        WHERE 1=1
        """
        params: Dict[str, Any] = {"limit": safe_limit}

        if relationship_type:
            query += " AND e.relationship_type = :rel_type"
            params["rel_type"] = relationship_type.strip().upper()

        if evidence_status:
            query += " AND e.evidence_status = :ev_stat"
            params["ev_stat"] = evidence_status.strip().upper()

        if agency:
            query += " AND (sn.node_key LIKE :ag_pattern OR tn.node_key LIKE :ag_pattern)"
            params["ag_pattern"] = f"%AGENCY:{agency.strip().upper()}%"

        if state:
            query += " AND (sn.node_key LIKE :st_pattern OR tn.node_key LIKE :st_pattern)"
            params["st_pattern"] = f"%STATE:{state.strip().upper()}%"

        query += " LIMIT :limit"

        try:
            with engine.connect() as conn:
                df_edges = pd.read_sql(sqlalchemy.text(query), conn, params=params)

            nodes_dict = {}
            edges_list = []
            doc_cnt = 0
            inf_cnt = 0

            for _, r in df_edges.iterrows():
                src_id = int(r["source_node_id"])
                tgt_id = int(r["target_node_id"])
                ev_status = str(r["evidence_status"])

                if ev_status in (EvidenceStatus.DOCUMENTED.value, EvidenceStatus.OBSERVED.value):
                    doc_cnt += 1
                else:
                    inf_cnt += 1

                if src_id not in nodes_dict:
                    nodes_dict[src_id] = {
                        "id": str(src_id),
                        "type": str(r["source_type"]),
                        "key": str(r["source_key"]),
                        "name": str(r["source_name"]),
                        "evidence_status": ev_status
                    }
                if tgt_id not in nodes_dict:
                    nodes_dict[tgt_id] = {
                        "id": str(tgt_id),
                        "type": str(r["target_type"]),
                        "key": str(r["target_key"]),
                        "name": str(r["target_name"]),
                        "evidence_status": ev_status
                    }

                edges_list.append({
                    "id": str(r["id"]),
                    "source": str(src_id),
                    "target": str(tgt_id),
                    "source_key": str(r["source_key"]),
                    "target_key": str(r["target_key"]),
                    "relationship_type": str(r["relationship_type"]),
                    "evidence_status": ev_status,
                    "confidence": float(r["confidence"]),
                    "evidence_text": str(r.get("evidence_text") or ""),
                    "source_reference": str(r.get("source_reference") or "")
                })

            return {
                "nodes": list(nodes_dict.values()),
                "edges": edges_list,
                "summary": {
                    "total_nodes": len(nodes_dict),
                    "total_edges": len(edges_list),
                    "documented_edges": doc_cnt,
                    "inferred_edges": inf_cnt,
                    "applied_filters": {
                        "state": state,
                        "agency": agency,
                        "relationship_type": relationship_type,
                        "evidence_status": evidence_status,
                        "limit": safe_limit
                    }
                }
            }
        except Exception as e:
            logger.error(f"Error building global dependency graph: {e}")
            return {"nodes": [], "edges": [], "summary": {"total_nodes": 0, "total_edges": 0, "documented_edges": 0, "inferred_edges": 0}}

    @staticmethod
    def calculate_bottleneck_indicators() -> List[Dict[str, Any]]:
        """
        Identifies entities with high dependency concentration using neutral, explainable coordination pressure metrics.
        """
        DependencyService.ensure_dependency_graph_populated()
        engine = get_db_engine()

        query = """
        SELECT n.id, n.node_type, n.node_key, n.display_name,
               COUNT(DISTINCT e.id) as total_dependencies,
               COUNT(DISTINCT CASE WHEN e.source_node_id = n.id THEN e.target_node_id ELSE e.source_node_id END) as connected_entities,
               COUNT(DISTINCT CASE WHEN e.evidence_status IN ('DOCUMENTED', 'OBSERVED') THEN e.id END) as doc_count,
               COUNT(DISTINCT CASE WHEN e.evidence_status = 'INFERRED' THEN e.id END) as inf_count,
               COUNT(DISTINCT CASE WHEN e.relationship_type = 'CLEARANCE_FROM' THEN e.id END) as clearance_count
        FROM dependency_nodes n
        JOIN dependency_edges e ON n.id = e.source_node_id OR n.id = e.target_node_id
        WHERE n.node_type IN ('DEPARTMENT', 'AGENCY', 'CLEARANCE_AUTHORITY', 'FUNDING_ENTITY')
        GROUP BY n.id, n.node_type, n.node_key, n.display_name
        HAVING COUNT(DISTINCT e.id) >= 2
        ORDER BY total_dependencies DESC
        """

        try:
            with engine.connect() as conn:
                df = pd.read_sql(sqlalchemy.text(query), conn)

            bottlenecks = []
            for _, r in df.iterrows():
                total_dep = int(r["total_dependencies"])
                conn_ent = int(r["connected_entities"])
                doc_c = int(r["doc_count"])
                inf_c = int(r["inf_count"])
                clr_c = int(r["clearance_count"])
                ntype = str(r["node_type"])

                # Coordination Pressure Index (0-100 deterministic formula)
                cpi = min(100.0, round(total_dep * 12.5 + conn_ent * 8.0 + clr_c * 15.0, 1))

                reasons = []
                if conn_ent >= 3:
                    reasons.append("Multiple projects depend on this entity for operational progress")
                if clr_c >= 2:
                    reasons.append("Repeated clearance & regulatory dependency observed across projects")
                if total_dep >= 4:
                    reasons.append("High multi-project dependency concentration")

                if not reasons:
                    reasons.append("Active coordination node with multiple project links")

                bottlenecks.append({
                    "entity": str(r["display_name"]),
                    "entity_key": str(r["node_key"]),
                    "entity_type": ntype,
                    "projects_affected": conn_ent,
                    "dependency_count": total_dep,
                    "documented_dependencies": doc_c,
                    "inferred_dependencies": inf_c,
                    "coordination_pressure_index": cpi,
                    "bottleneck_indicator": cpi >= 40.0,
                    "reasons": reasons
                })

            return bottlenecks

        except Exception as e:
            logger.error(f"Error calculating bottleneck indicators: {e}")
            return []

    @staticmethod
    def get_dependency_health() -> Dict[str, Any]:
        """
        Returns operational summary statistics of the dependency graph service.
        """
        DependencyService.ensure_dependency_graph_populated()
        engine = get_db_engine()

        try:
            with engine.connect() as conn:
                node_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_nodes")).scalar() or 0
                edge_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_edges")).scalar() or 0
                proj_cnt = conn.execute(sqlalchemy.text("SELECT COUNT(DISTINCT source_node_id) FROM dependency_edges JOIN dependency_nodes n ON source_node_id = n.id WHERE n.node_type = 'PROJECT'")).scalar() or 0
                doc_edges = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_edges WHERE evidence_status IN ('DOCUMENTED', 'OBSERVED')")).scalar() or 0
                inf_edges = conn.execute(sqlalchemy.text("SELECT COUNT(*) FROM dependency_edges WHERE evidence_status = 'INFERRED'")).scalar() or 0

            return {
                "status": "healthy",
                "nodes": int(node_cnt),
                "edges": int(edge_cnt),
                "projects_with_dependencies": int(proj_cnt),
                "documented_edges": int(doc_edges),
                "inferred_edges": int(inf_edges)
            }
        except Exception as e:
            logger.error(f"Error fetching dependency health: {e}")
            return {
                "status": "degraded",
                "nodes": 0,
                "edges": 0,
                "projects_with_dependencies": 0,
                "documented_edges": 0,
                "inferred_edges": 0,
                "error": str(e)
            }


dependency_service = DependencyService()
