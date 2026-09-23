import sys
import os
import json
import urllib.request
import urllib.parse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

_cached_auth_headers = None

def get_test_auth_headers(api_host="http://127.0.0.1:8000", username="admin", password="NirmanAdmin@2026"):
    """
    Obtains a valid JWT access token for testing by calling the application's
    official /api/auth/login endpoint. Caches the result in memory.
    """
    global _cached_auth_headers
    if _cached_auth_headers is not None:
        return dict(_cached_auth_headers)

    login_url = f"{api_host}/api/auth/login"
    payload = json.dumps({"username_or_email": username, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        login_url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                token = body.get("access_token")
                if token:
                    _cached_auth_headers = {"Authorization": f"Bearer {token}"}
                    return dict(_cached_auth_headers)
    except Exception as e:
        # Fallback to TestClient if server is not listening on HTTP port 8000
        try:
            from fastapi.testclient import TestClient
            from backend.app.main import app
            client = TestClient(app)
            r = client.post("/api/auth/login", json={"username_or_email": username, "password": password})
            if r.status_code == 200:
                token = r.json().get("access_token")
                if token:
                    _cached_auth_headers = {"Authorization": f"Bearer {token}"}
                    return dict(_cached_auth_headers)
        except Exception as inner_e:
            print(f"Warning: Could not obtain test auth token: {inner_e}")

    return {}

def make_authenticated_request(url, method="GET", data=None, headers=None, api_host="http://127.0.0.1:8000", timeout=5):
    """
    Helper to execute urllib HTTP request attached with Bearer JWT token.
    """
    req_headers = get_test_auth_headers(api_host=api_host)
    if headers:
        req_headers.update(headers)

    encoded_data = None
    if data is not None:
        if isinstance(data, (dict, list)):
            encoded_data = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        elif isinstance(data, str):
            encoded_data = data.encode("utf-8")
        else:
            encoded_data = data

    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "")
            body = resp.read().decode("utf-8", errors="replace")
            if "application/json" in content_type:
                try:
                    return resp.status, json.loads(body)
                except Exception:
                    return resp.status, body
            return resp.status, body
    except urllib.error.HTTPError as e:
        if e.code == 401:
            global _cached_auth_headers
            _cached_auth_headers = None
            fresh_headers = get_test_auth_headers(api_host=api_host)
            if headers:
                fresh_headers.update(headers)
            req2 = urllib.request.Request(url, data=encoded_data, headers=fresh_headers, method=method)
            try:
                with urllib.request.urlopen(req2, timeout=timeout) as resp2:
                    body2 = resp2.read().decode("utf-8", errors="replace")
                    try:
                        return resp2.status, json.loads(body2)
                    except Exception:
                        return resp2.status, body2
            except Exception:
                pass
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body
    except Exception as e:
        try:
            from fastapi.testclient import TestClient
            from backend.app.main import app
            client = TestClient(app)
            path = url.replace("http://127.0.0.1:8000", "").replace("http://localhost:8000", "")
            auth_headers = get_test_auth_headers(api_host=api_host)
            if method.upper() == "GET":
                r = client.get(path, headers=auth_headers)
            elif method.upper() == "POST":
                r = client.post(path, json=data if isinstance(data, dict) else None, headers=auth_headers)
            else:
                r = client.request(method, path, headers=auth_headers)
            try:
                return r.status_code, r.json()
            except Exception:
                return r.status_code, r.text
        except Exception as inner_e:
            return 0, {"error": str(e)}
            from fastapi.testclient import TestClient
            from backend.app.main import app
            client = TestClient(app)
            path = url.replace("http://127.0.0.1:8000", "").replace("http://localhost:8000", "")
            auth_headers = get_test_auth_headers(api_host=api_host)
            if method.upper() == "GET":
                r = client.get(path, headers=auth_headers)
            elif method.upper() == "POST":
                r = client.post(path, json=data if isinstance(data, dict) else None, headers=auth_headers)
            else:
                r = client.request(method, path, headers=auth_headers)
            try:
                return r.status_code, r.json()
            except Exception:
                return r.status_code, r.text
        except Exception as inner_e:
            return 0, {"error": str(e)}
