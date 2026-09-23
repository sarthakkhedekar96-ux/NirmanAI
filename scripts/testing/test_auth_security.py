import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.main import app
from backend.app.core.db_init import ensure_users_table_exists, seed_bootstrap_admin_if_needed

client = TestClient(app)


def test_auth_security():
    print("\n==================================================")
    print("NIRMAN AI — BACKEND AUTHENTICATION & SECURITY TEST SUITE")
    print("==================================================\n")

    ensure_users_table_exists()
    seed_bootstrap_admin_if_needed()

    # Test 1: Public Health Endpoint (200 OK without auth)
    print("[1/10] Testing public /api/health endpoint...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    health_data = res.json()
    assert "status" in health_data, "Health check output missing status"
    assert "password" not in health_data, "Health check leaked sensitive information"
    print("  [OK] Public health endpoint returns 200 OK without leaking secrets.")

    # Test 2: Protected Endpoint Unauthenticated (Expected: 401 Unauthorized)
    print("[2/10] Testing protected /api/projects without token...")
    res = client.get("/api/projects")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("  [OK] Unauthenticated access to /api/projects rejected with 401 Unauthorized.")

    # Test 3: Protected Endpoint with Invalid Token (Expected: 401 Unauthorized)
    print("[3/10] Testing protected endpoint with invalid bearer token...")
    headers = {"Authorization": "Bearer invalid_token_xyz_123"}
    res = client.get("/api/projects", headers=headers)
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("  [OK] Invalid token rejected with 401 Unauthorized.")

    # Test 4: Invalid Credentials Login (Expected: 401 Unauthorized)
    print("[4/10] Testing login with invalid credentials...")
    res = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "wrong_password_999"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("  [OK] Login with invalid password rejected with 401 Unauthorized.")

    # Test 5: Valid Login (Expected: 200 OK + Bearer Token)
    print("[5/10] Testing login with bootstrapped credentials...")
    login_res = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "NirmanAdmin@2026"})
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}: {login_res.text}"
    token_data = login_res.json()
    assert "access_token" in token_data, "Login response missing access_token"
    token = token_data["access_token"]
    user_info = token_data["user"]
    assert "password_hash" not in user_info, "CRITICAL: Password hash leaked in login response!"
    print(f"  [OK] Valid login succeeded for '{user_info['username']}' with role [{user_info['role']}].")

    # Test 6: Access Protected Endpoint with Valid Bearer Token (Expected: 200 OK)
    print("[6/10] Testing protected API with valid JWT token...")
    auth_headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/projects", headers=auth_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("  [OK] Valid token granted access to /api/projects.")

    # Test 7: Analyst Role Access to Admin Endpoint (Expected: 403 Forbidden)
    print("[7/10] Testing RBAC role authorization (Analyst accessing Admin endpoint)...")
    analyst_login = client.post("/api/auth/login", json={"username_or_email": "analyst", "password": "NirmanAnalyst@2026"})
    assert analyst_login.status_code == 200
    analyst_token = analyst_login.json()["access_token"]
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

    res = client.get("/api/auth/users", headers=analyst_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"
    print("  [OK] Analyst access to /api/auth/users rejected with 403 Forbidden.")

    # Test 8: Admin Role Access to Admin Endpoint (Expected: 200 OK)
    print("[8/10] Testing Admin access to /api/auth/users...")
    res = client.get("/api/auth/users", headers=auth_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    users_list = res.json()
    assert len(users_list) >= 3, "Expected at least 3 users"
    for u in users_list:
        assert "password_hash" not in u, "CRITICAL: Password hash leaked in users list API!"
    print(f"  [OK] Admin access granted to /api/auth/users. Verified 0 password hashes leaked.")

    # Test 9: Change Password Flow & Invalid Old Password Rejection
    print("[9/10] Testing Change Password flow...")
    # Change password with wrong current password (Expected: 400 Bad Request)
    bad_change = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong_old_pwd", "new_password": "NewSecretPwd@2026", "confirm_password": "NewSecretPwd@2026"},
        headers=auth_headers
    )
    assert bad_change.status_code == 400, f"Expected 400, got {bad_change.status_code}"
    print("  [OK] Change password with incorrect current password rejected.")

    # Test 10: Logout Verification (Expected: 200 OK + cookie cleared)
    print("[10/10] Testing Logout endpoint...")
    logout_res = client.post("/api/auth/logout", headers=auth_headers)
    assert logout_res.status_code == 200, f"Expected 200, got {logout_res.status_code}"
    print("  [OK] Logout endpoint succeeded.")

    print("\n==================================================")
    print("ALL 10 BACKEND AUTH & SECURITY VERIFICATIONS PASSED!")
    print("==================================================\n")


if __name__ == "__main__":
    test_auth_security()
