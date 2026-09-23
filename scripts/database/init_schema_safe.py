#!/usr/bin/env python3
"""
scripts/database/init_schema_safe.py

Phase 1 Safe Database Schema Initializer for Nirman AI.
Executes database/schema.sql against the configured DATABASE_URL using additive DDL only.
Never prints or logs database credentials/passwords.
"""
import os
import sys
import json
from pathlib import Path
from sqlalchemy import create_engine, text

# Base Directory Setup
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

SCHEMA_FILE = BASE_DIR / "database" / "schema.sql"

# Load .env file manually
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _, _val = _line.partition("=")
            _key = _key.strip()
            _val = _val.strip().strip('"\'')
            if _key and _key not in os.environ:
                os.environ[_key] = _val

from backend.app.config import normalize_database_url

def init_schema():
    database_url = normalize_database_url(os.getenv("DATABASE_URL"))
    if not database_url:
        print("[ERROR] DATABASE_URL environment variable is missing. Set DATABASE_URL before running.")
        sys.exit(1)

    if not SCHEMA_FILE.exists():
        print(f"[ERROR] Schema file missing at {SCHEMA_FILE}")
        sys.exit(1)

    schema_sql = SCHEMA_FILE.read_text(encoding="utf-8")

    # Double check no destructive statements exist in SQL string
    lower_sql = schema_sql.lower()
    for forbidden in ["drop table", "drop database", "truncate", "delete from", "update "]:
        if forbidden in lower_sql:
            print(f"[CRITICAL ERROR] Forbidden destructive keyword '{forbidden}' detected in schema.sql! Aborting.")
            sys.exit(1)

    print("==================================================")
    print("NIRMAN AI — PHASE 1: SAFE SCHEMA INITIALIZATION")
    print("==================================================")

    # Create SQLAlchemy Engine
    engine = create_engine(database_url, connect_args={"connect_timeout": 10})

    print("\n[1/3] Executing schema DDL against PostgreSQL database...")
    with engine.begin() as conn:
        conn.execute(text(schema_sql))
    print("  [OK] Schema DDL executed successfully.")

    # ----------------------------------------------------
    # Verification Steps
    # ----------------------------------------------------
    print("\n[2/3] Verifying table creation & database indexes...")
    target_tables = [
        "projects",
        "project_observations",
        "project_features",
        "risk_scores",
        "environmental_observations",
        "dependency_nodes",
        "dependency_edges"
    ]

    existing_tables = []
    indexes_found = []
    row_counts = {}
    db_size = "Unknown"

    with engine.connect() as conn:
        # Check tables in public schema
        table_res = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        existing_tables = [r[0] for r in table_res.fetchall()]

        # Check indexes
        index_res = conn.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public'
        """))
        indexes_found = [r[0] for r in index_res.fetchall()]

        # Query row counts
        for tbl in target_tables:
            if tbl in existing_tables:
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
                row_counts[tbl] = cnt
            else:
                row_counts[tbl] = None

        # Query database size
        db_size_res = conn.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))"))
        db_size = db_size_res.scalar()

    print("\n[3/3] Verification Results:")
    print("--------------------------------------------------")
    print("Tables verified in database:")
    for tbl in target_tables:
        status = "EXISTS" if tbl in existing_tables else "MISSING"
        count_str = f"{row_counts.get(tbl, 0)} rows" if tbl in existing_tables else "N/A"
        print(f"  - {tbl}: {status} ({count_str})")

    print(f"\nTotal indexes verified in public schema: {len(indexes_found)}")
    print(f"PostgreSQL Database Size: {db_size}")
    print("--------------------------------------------------")
    print("PHASE 1 SCHEMA INITIALIZATION COMPLETED SUCCESSFULLY.")
    print("==================================================\n")

    return {
        "existing_tables": existing_tables,
        "row_counts": row_counts,
        "indexes_found": indexes_found,
        "db_size": db_size
    }

if __name__ == "__main__":
    init_schema()
