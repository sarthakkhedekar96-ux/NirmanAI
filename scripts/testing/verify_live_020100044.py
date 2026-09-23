import os
import sys
import json
sys.path.insert(0, os.path.abspath('.'))
os.environ['JWT_SECRET_KEY'] = 'nirman_qa_secret_key_2026_test_suite_invariance'
import sqlalchemy
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services import project_service
from backend.app.services.risk_engine import risk_engine_service

client = TestClient(app)
login_res = client.post('/api/auth/login', json={'username_or_email': 'admin', 'password': 'NirmanAdmin@2026'})
token = login_res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

sat_res = client.get('/api/satellite/project/020100044', headers=headers)
print('--- SATELLITE API RESPONSE FOR 020100044 ---')
print(json.dumps(sat_res.json(), indent=2))

engine = project_service.get_db_engine()
with engine.connect() as conn:
    tables = ['projects', 'project_observations', 'project_features', 'risk_scores', 'dependency_nodes', 'dependency_edges']
    counts = {t: conn.execute(sqlalchemy.text(f'SELECT COUNT(*) FROM {t}')).scalar() for t in tables}
print('--- DB COUNTS ---')
print(counts)

risk = risk_engine_service.get_project_risk_assessment('020100044')
print('--- GOLDEN PROJECT RISK ---')
print('risk_score:', risk.get('risk_score'))
print('category:', risk.get('risk_category'))
print('severe_prob:', risk.get('severe_risk_probability'))
print('early_warning:', risk.get('early_warning_flag'))
print('shap drivers:', risk.get('top_risk_drivers'))
