#!/usr/bin/env python3
"""
scripts/testing/test_db_url_normalization.py

Automated unit & regression tests for DATABASE_URL normalization and database engine resiliency:
A. postgres://user:pass@host/db -> normalized to postgresql://user:pass@host/db
B. postgresql://user:pass@host/db -> unchanged
C. Query parameters preserved (e.g. sslmode=require)
D. Password/username/host/port/database preserved
E. Password masking for logging (mask_database_url)
F. Explicit DATABASE_URL prevents silent SQLite fallback
G. Local SQLite fallback when DATABASE_URL is genuinely absent
"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.config import normalize_database_url, mask_database_url


def run_normalization_tests():
    print("\n==================================================")
    print("NIRMAN AI — DATABASE URL NORMALIZATION TEST SUITE")
    print("==================================================\n")

    # 1. Test postgres:// scheme normalization
    print("[1/7] Testing 'postgres://' scheme normalization...")
    raw_1 = "postgres://user_admin:secret_pass_123@dpg-abc1234-a.oregon-postgres.render.com:5432/nirman_db"
    expected_1 = "postgresql://user_admin:secret_pass_123@dpg-abc1234-a.oregon-postgres.render.com:5432/nirman_db"
    norm_1 = normalize_database_url(raw_1)
    assert norm_1 == expected_1, f"Expected '{expected_1}', got '{norm_1}'"
    print("  [OK] 'postgres://' converted to 'postgresql://'")

    # 2. Test postgresql:// scheme unchanged
    print("[2/7] Testing 'postgresql://' scheme idempotency...")
    raw_2 = "postgresql://user_admin:secret_pass_123@dpg-abc1234-a.oregon-postgres.render.com:5432/nirman_db"
    norm_2 = normalize_database_url(raw_2)
    assert norm_2 == raw_2, f"Expected '{raw_2}', got '{norm_2}'"
    print("  [OK] 'postgresql://' scheme preserved unchanged")

    # 3. Test query parameters preservation
    print("[3/7] Testing query parameters & SSL mode preservation...")
    raw_3 = "postgres://user_admin:secret_pass_123@dpg-abc1234-a.oregon-postgres.render.com:5432/nirman_db?sslmode=require&connect_timeout=10"
    expected_3 = "postgresql://user_admin:secret_pass_123@dpg-abc1234-a.oregon-postgres.render.com:5432/nirman_db?sslmode=require&connect_timeout=10"
    norm_3 = normalize_database_url(raw_3)
    assert norm_3 == expected_3, f"Expected '{expected_3}', got '{norm_3}'"
    print("  [OK] Query parameters '?sslmode=require&connect_timeout=10' preserved")

    # 4. Test credential & host components preservation
    print("[4/7] Testing exact preservation of credentials, host, port, and database name...")
    raw_4 = "postgres://custom_user:P%40ssw0rd!@10.0.0.15:5433/custom_db_name"
    expected_4 = "postgresql://custom_user:P%40ssw0rd!@10.0.0.15:5433/custom_db_name"
    norm_4 = normalize_database_url(raw_4)
    assert norm_4 == expected_4, f"Expected '{expected_4}', got '{norm_4}'"
    print("  [OK] Custom username, URL-encoded password, host, port, and database name preserved")

    # 5. Test password masking for safe logging
    print("[5/7] Testing password masking for logging (mask_database_url)...")
    secret_url = "postgresql://user_admin:SUPER_SECRET_PASSWORD@db.render.com:5432/nirman_db?sslmode=require"
    masked = mask_database_url(secret_url)
    assert "SUPER_SECRET_PASSWORD" not in masked, f"Password leaked in masked string: '{masked}'"
    assert ":***@" in masked or ":***" in masked, f"Expected password mask in '{masked}'"
    print(f"  [OK] Password masked safely in log output: '{masked}'")

    # 6. Test behavior with None / empty string
    print("[6/7] Testing None and empty string handling...")
    assert normalize_database_url(None) == "", "Expected empty string for None"
    assert normalize_database_url("") == "", "Expected empty string for ''"
    assert mask_database_url(None) == "", "Expected empty string for None"
    print("  [OK] Empty and None inputs handled safely")

    # 7. Test SQLite fallback behavior when DATABASE_URL is absent vs present
    print("[7/7] Testing strict fallback enforcement when DATABASE_URL is present vs absent...")

    # Test explicit invalid DATABASE_URL throws RuntimeError rather than silent SQLite fallback
    import backend.app.core.db_resilience as db_res
    orig_engine = db_res._engine
    orig_has_explicit = db_res.HAS_EXPLICIT_DB_URL
    orig_db_url = db_res.DATABASE_URL

    try:
        # Simulate explicit invalid PostgreSQL URL
        db_res._engine = None
        db_res.HAS_EXPLICIT_DB_URL = True
        db_res.DATABASE_URL = "postgresql://invalid_user:invalid_pass@127.0.0.1:59999/non_existent_db"

        caught = False
        try:
            db_res.get_resilient_db_engine()
        except RuntimeError as re:
            caught = True
            assert "Failed to connect to configured PostgreSQL database" in str(re)
        assert caught, "Expected RuntimeError when explicit DATABASE_URL connection fails"
        print("  [OK] Explicit DATABASE_URL connection failure correctly raises RuntimeError (no silent SQLite fallback)")

        # Simulate absent DATABASE_URL -> local SQLite fallback
        db_res._engine = None
        db_res.HAS_EXPLICIT_DB_URL = False
        db_res.DATABASE_URL = ""

        sqlite_engine = db_res.get_resilient_db_engine()
        assert sqlite_engine.dialect.name == "sqlite", f"Expected SQLite dialect when DATABASE_URL is absent, got {sqlite_engine.dialect.name}"
        print("  [OK] Local SQLite fallback correctly selected when DATABASE_URL is genuinely absent")

    finally:
        # Restore original state
        db_res._engine = orig_engine
        db_res.HAS_EXPLICIT_DB_URL = orig_has_explicit
        db_res.DATABASE_URL = orig_db_url

    print("\n==================================================")
    print("ALL DATABASE URL NORMALIZATION TESTS PASSED!")
    print("==================================================\n")


if __name__ == "__main__":
    run_normalization_tests()
