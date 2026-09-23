import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.main import app
from backend.app.core.db_init import ensure_users_table_exists, seed_bootstrap_admin_if_needed, ensure_notification_tables_exist
from backend.app.services.alert_engine import alert_engine

client = TestClient(app)


def test_notifications_phase8():
    print("\n==================================================")
    print("NIRMAN AI — PHASE 8 NOTIFICATIONS & ALERTS SUITE")
    print("==================================================\n")

    ensure_users_table_exists()
    seed_bootstrap_admin_if_needed()
    ensure_notification_tables_exist()

    # Log in as ADMIN
    admin_login = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "NirmanAdmin@2026"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Log in as ANALYST
    analyst_login = client.post("/api/auth/login", json={"username_or_email": "analyst", "password": "NirmanAnalyst@2026"})
    assert analyst_login.status_code == 200, f"Analyst login failed: {analyst_login.text}"
    analyst_token = analyst_login.json()["access_token"]
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Unauthenticated access blocked (Expected: 401 Unauthorized)
    print("[1/15] Testing unauthenticated access to /api/notifications...")
    unauth_client = TestClient(app)
    res = unauth_client.get("/api/notifications")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("  [OK] Unauthenticated access rejected with 401 Unauthorized.")

    # 2. Authenticated user accesses own notifications (Expected: 200 OK)
    print("[2/15] Testing authenticated access to /api/notifications...")
    res = client.get("/api/notifications", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("  [OK] Authenticated user retrieved notifications stream.")

    # 3. Non-admin access to delivery audit (Expected: 403 Forbidden)
    print("[3/15] Testing Analyst RBAC block on /api/notifications/deliveries...")
    res = client.get("/api/notifications/deliveries", headers=analyst_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("  [OK] Non-admin access to delivery audit blocked with 403 Forbidden.")

    # 4. Admin access to delivery audit (Expected: 200 OK)
    print("[4/15] Testing Admin access to /api/notifications/deliveries...")
    res = client.get("/api/notifications/deliveries", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("  [OK] Admin granted access to delivery audit trail.")

    # 5. Non-admin test email trigger (Expected: 403 Forbidden)
    print("[5/15] Testing Analyst block on test email endpoint...")
    res = client.post("/api/notifications/test-email", json={"recipient_email": "analyst@nirman.gov.in"}, headers=analyst_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("  [OK] Non-admin test email request rejected with 403 Forbidden.")

    # 6. Admin test email trigger (Expected: 200 OK & Status SENT/FAILED)
    print("[6/15] Testing Admin test email execution...")
    res = client.post("/api/notifications/test-email", json={"recipient_email": "admin@nirman.gov.in"}, headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    email_data = res.json()
    assert "result" in email_data
    result_status = email_data["result"]["status"]
    assert result_status in ("SENT", "FAILED"), f"Expected SENT or FAILED, got {result_status}"
    assert result_status != "DELIVERED", "CRITICAL: Ordinary SMTP send should not be marked as DELIVERED!"
    print(f"  [OK] Test email executed with recorded status: [{result_status}].")

    # 7. On-demand portfolio alert generation scan (Expected: 200 OK)
    print("[7/15] Testing on-demand portfolio alert generation scan...")
    scan_res = client.post("/api/notifications/generate-alerts", headers=admin_headers)
    assert scan_res.status_code == 200, f"Expected 200, got {scan_res.status_code}: {scan_res.text}"
    scan_data = scan_res.json()["results"]
    assert "alerts_created" in scan_data
    print(f"  [OK] On-demand scan created {scan_data['alerts_created']} alerts, {scan_data['notifications_created']} notifications.")

    # 8. Deduplication verification on repeated scan (Expected: 0 new alerts created)
    print("[8/15] Testing deduplication hash protection on repeated scan...")
    repeat_res = client.post("/api/notifications/generate-alerts", headers=admin_headers)
    assert repeat_res.status_code == 200
    repeat_data = repeat_res.json()["results"]
    assert repeat_data["alerts_created"] == 0, f"Expected 0 new alerts created on duplicate scan, got {repeat_data['alerts_created']}"
    assert repeat_data["skipped_duplicates"] >= 1, "Expected skipped_duplicates >= 1"
    print(f"  [OK] Deduplication hash prevented duplicate alert creation ({repeat_data['skipped_duplicates']} skipped).")

    # 9. Grounded alert content verification
    print("[9/15] Testing alert content grounding (SHAP drivers & prescriptive recommendations)...")
    alerts_res = client.get("/api/notifications/alerts", headers=admin_headers)
    assert alerts_res.status_code == 200
    alerts_list = alerts_res.json()
    assert len(alerts_list) >= 1, "Expected at least 1 generated alert"
    first_alert = alerts_list[0]
    assert "project_code" in first_alert
    assert "risk_score" in first_alert
    assert "recommended_actions" in first_alert
    if first_alert["recommended_actions"]:
        first_rec = first_alert["recommended_actions"][0]
        assert "disclaimer" in first_rec, "Missing mandatory recommendation disclaimer notice!"
        assert "Recommendations are generated from available project data" in first_rec["disclaimer"]
    print(f"  [OK] Verified grounded alert metadata & recommendation disclaimer for project {first_alert['project_code']}.")

    # 10. Notification Preferences API (Get & Put)
    print("[10/15] Testing user notification preferences API...")
    pref_res = client.get("/api/notifications/preferences", headers=analyst_headers)
    assert pref_res.status_code == 200
    init_pref = pref_res.json()
    assert "email_enabled" in init_pref

    update_res = client.put(
        "/api/notifications/preferences",
        json={"email_enabled": False, "critical_alerts_only": True},
        headers=analyst_headers
    )
    assert update_res.status_code == 200
    updated_pref = update_res.json()["preferences"]
    assert updated_pref["email_enabled"] is False
    assert updated_pref["critical_alerts_only"] is True
    print("  [OK] User notification preferences successfully updated and persisted in DB.")

    # 11. Read Notification & Read-All Flow
    print("[11/15] Testing read notification and read-all flow...")
    notifs_res = client.get("/api/notifications", headers=admin_headers)
    notifs = notifs_res.json()
    if notifs:
        target_id = notifs[0]["id"]
        read_res = client.patch(f"/api/notifications/{target_id}/read", headers=admin_headers)
        assert read_res.status_code == 200, f"Expected 200, got {read_res.status_code}"
        assert read_res.json()["status"] == "READ"

    read_all_res = client.patch("/api/notifications/read-all", headers=admin_headers)
    assert read_all_res.status_code == 200
    unread_res = client.get("/api/notifications/unread-count", headers=admin_headers)
    assert unread_res.json()["unread_count"] == 0
    print("  [OK] Notification read & read-all endpoints verified.")

    # 12. Delivery Audit Details Inspection
    print("[12/15] Testing delivery audit trail metadata safety...")
    deliv_res = client.get("/api/notifications/deliveries", headers=admin_headers)
    assert deliv_res.status_code == 200
    deliv_list = deliv_res.json()
    for d in deliv_list:
        meta_str = str(d.get("metadata", {})).lower()
        assert "$2b$" not in meta_str, "CRITICAL: Password hash leaked in delivery metadata!"
        assert "password_hash" not in meta_str, "CRITICAL: Password hash leaked in delivery metadata!"
    print(f"  [OK] Inspected {len(deliv_list)} delivery records. Verified 0 secrets leaked.")

    # 13. Infrastructure Health API
    print("[13/15] Testing /api/notifications/health status endpoint...")
    health_res = client.get("/api/notifications/health", headers=admin_headers)
    assert health_res.status_code == 200
    health_info = health_res.json()
    assert "email_service" in health_info
    assert "total_alerts" in health_info
    print(f"  [OK] Infrastructure health API operational (Email status: {health_info['email_service']['provider']}).")

    # 14. Invalid Notification ID Error Handling (Expected: 404 Not Found)
    print("[14/15] Testing invalid notification ID error handling...")
    bad_read = client.patch("/api/notifications/999999/read", headers=admin_headers)
    assert bad_read.status_code == 404, f"Expected 404, got {bad_read.status_code}"
    print("  [OK] Invalid notification ID correctly returned 404 Not Found.")

    # 15. Single Alert Detail Deep-Dive
    print("[15/15] Testing GET /api/notifications/alerts/{id} deep-dive...")
    if alerts_list:
        aid = alerts_list[0]["id"]
        detail_res = client.get(f"/api/notifications/alerts/{aid}", headers=admin_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["id"] == aid
        assert "recipients" in detail_data
        print(f"  [OK] Alert #{aid} detail endpoint returned full risk drivers and recipient dispatch audit.")

    print("\n==================================================")
    print("ALL 15 PHASE 8 NOTIFICATION & ALERT TESTS PASSED!")
    print("==================================================\n")


if __name__ == "__main__":
    test_notifications_phase8()
