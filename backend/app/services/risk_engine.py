import json
import sqlalchemy
import pandas as pd
try:
    import joblib
except ImportError:
    joblib = None
from backend.app.config import MODEL_VERSION_DIR, DATABASE_URL, FALLBACK_SQLITE_PATH


from backend.app.core.db_resilience import get_resilient_db_engine

class RiskEngineService:
    def __init__(self):
        self.calibrator_path = MODEL_VERSION_DIR / "calibrator.pkl"
        self.xgb_path = MODEL_VERSION_DIR / "xgboost_model.joblib"
        self.meta_path = MODEL_VERSION_DIR / "model_metadata.json"
        
        try:
            self.calibrated_model = joblib.load(self.calibrator_path) if self.calibrator_path.exists() else None
        except Exception:
            self.calibrated_model = None

        try:
            self.xgb_model = joblib.load(self.xgb_path) if self.xgb_path.exists() else None
        except Exception:
            self.xgb_model = None
        
        try:
            with open(self.meta_path, "r") as f:
                self.metadata = json.load(f)
        except Exception:
            self.metadata = {"model_version": "risk_engine_v1", "operational_threshold": 0.28}
            
        self.operational_threshold = self.metadata.get("operational_threshold", 0.28)

    def get_db_engine(self):
        return get_resilient_db_engine()

    def get_project_risk_assessment(self, project_code: str):
        if not project_code or str(project_code).strip().upper() in ("UNKNOWN", "NONE", "NULL", ""):
            return None
        engine = self.get_db_engine()
        query = """
            SELECT 
                r.id,
                r.project_code,
                r.reporting_month,
                r.composite_risk_score,
                r.cost_risk_score,
                r.schedule_risk_score,
                r.progress_risk_score,
                r.risk_category,
                r.shap_top_drivers,
                r.shap_top_drivers AS key_risk_drivers,
                '[]' AS protective_factors,
                r.created_at,
                r.composite_risk_score AS risk_score,
                (r.composite_risk_score / 100.0) AS predicted_severe_risk_prob,
                r.cost_risk_score AS cost_risk_index,
                r.schedule_risk_score AS schedule_risk_index,
                p.project_name,
                p.agency,
                p.state
            FROM risk_scores r
            JOIN projects p ON r.project_code = p.project_code
            WHERE r.project_code = :code
            ORDER BY r.reporting_month DESC
            LIMIT 1
        """
        with engine.connect() as conn:
            df = pd.read_sql(sqlalchemy.text(query), conn, params={"code": project_code})
            
        if df.empty:
            return None

        row = df.iloc[0]
        
        prob = float(row["predicted_severe_risk_prob"])
        score = float(row["risk_score"])
        category = str(row["risk_category"])
        
        drivers_raw = row["key_risk_drivers"]
        protective_raw = row["protective_factors"]
        
        drivers = json.loads(drivers_raw) if isinstance(drivers_raw, str) else (drivers_raw if isinstance(drivers_raw, list) else [])
        protective = json.loads(protective_raw) if isinstance(protective_raw, str) else (protective_raw if isinstance(protective_raw, list) else [])

        return {
            "project_code": str(row["project_code"]),
            "project_name": str(row.get("project_name", "")),
            "agency": str(row.get("agency", "")),
            "state": str(row.get("state", "")),
            "reporting_month": str(row["reporting_month"]),
            "predicted_severe_risk_prob": prob,
            "risk_score": score,
            "risk_category": category,
            "early_warning": prob >= self.operational_threshold,
            "cost_risk_index": float(row["cost_risk_index"]),
            "schedule_risk_index": float(row["schedule_risk_index"]),
            "risk_drivers": drivers,
            "protective_factors": protective,
            "model_version": self.metadata.get("model_version", "risk_engine_v1")
        }


risk_engine_service = RiskEngineService()
