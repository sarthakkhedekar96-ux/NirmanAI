import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from dotenv import load_dotenv


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

load_dotenv()

DATA_PATH = Path("processed/features/ml_features.parquet")
BASE_MODEL_PATH = Path("models/tuned_xgb_base.joblib")
CALIBRATED_MODEL_PATH = Path("models/tuned_xgb_calibrated.joblib")

FEATURE_COLS = [
    "original_cost",
    "revised_cost",
    "anticipated_cost",
    "cumulative_expenditure",
    "physical_progress",
    "original_delay_months",
    "revised_delay_months",
    "milestones_achieved",
    "milestones_total",
    "months_elapsed",
    "months_originally_planned",
    "months_remaining",
    "cost_expansion_ratio",
    "expenditure_ratio",
    "expenditure_progress_gap",
    "delay_months",
    "schedule_slippage_ratio",
    "milestone_rate",
    "progress_velocity",
    "agency_encoded",
    "state_encoded",
]

FEATURE_DISPLAY_NAMES = {
    "cost_expansion_ratio": "Cost Expansion Ratio",
    "schedule_slippage_ratio": "Schedule Slippage Ratio",
    "delay_months": "Project Delay (Months)",
    "expenditure_ratio": "Expenditure Ratio",
    "expenditure_progress_gap": "Expenditure vs Progress Gap",
    "progress_velocity": "Physical Progress Velocity",
    "months_remaining": "Months Remaining",
    "months_elapsed": "Months Elapsed",
    "months_originally_planned": "Originally Planned Duration",
    "original_cost": "Original Project Cost",
    "anticipated_cost": "Anticipated Project Cost",
    "cumulative_expenditure": "Cumulative Expenditure",
    "physical_progress": "Physical Progress (%)",
    "milestone_rate": "Milestone Completion Rate",
    "milestones_achieved": "Milestones Achieved",
    "milestones_total": "Total Milestones Scheduled",
    "original_delay_months": "Original Delay (Months)",
    "revised_delay_months": "Revised Delay (Months)",
    "agency_encoded": "Implementing Agency Baseline Risk",
    "state_encoded": "State Location Baseline Risk",
}


def get_database_url():
    database_url = __import__("os").getenv("DATABASE_URL")

    if database_url:
        return database_url

    return URL.create(
        "postgresql",
        username=__import__("os").getenv("DB_USER", "postgres"),
        password=__import__("os").getenv("DB_PASSWORD"),
        host=__import__("os").getenv("DB_HOST", "localhost"),
        port=int(__import__("os").getenv("DB_PORT", "5432")),
        database=__import__("os").getenv("DB_NAME", "nirman_db"),
    )


def risk_category(score):
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MODERATE"
    elif score <= 80:
        return "HIGH"
    return "CRITICAL"


def main():
    print("=" * 70)
    print("POPULATING CURRENT POSTGRESQL RISK SCORES")
    print("=" * 70)

    # --------------------------------------------------------
    # Load data
    # --------------------------------------------------------

    print("\n[1/6] Loading feature data...")
    df = pd.read_parquet(DATA_PATH)

    print(f"Rows loaded: {len(df)}")

    # --------------------------------------------------------
    # Encode categorical fields exactly as the existing
    # SHAP generation pipeline does.
    # --------------------------------------------------------

    print("\n[2/6] Encoding agency and state...")

    agency_values = sorted(
        df["agency"].astype(str).fillna("Unknown").unique()
    )
    state_values = sorted(
        df["state"].astype(str).fillna("Unknown").unique()
    )

    agency_map = {value: i for i, value in enumerate(agency_values)}
    state_map = {value: i for i, value in enumerate(state_values)}

    df["agency_encoded"] = (
        df["agency"].astype(str).fillna("Unknown").map(agency_map)
    )

    df["state_encoded"] = (
        df["state"].astype(str).fillna("Unknown").map(state_map)
    )

    # --------------------------------------------------------
    # Prepare model input
    # --------------------------------------------------------

    for column in FEATURE_COLS:
        if column not in df.columns:
            df[column] = 0.0

    X = df[FEATURE_COLS].copy()

    for column in X.columns:
        X[column] = pd.to_numeric(X[column], errors="coerce")

    X = X.replace([np.inf, -np.inf], np.nan)

    for column in X.columns:
        if X[column].isna().any():
            median = X[column].median()
            X[column] = X[column].fillna(
                0.0 if pd.isna(median) else median
            )

    # --------------------------------------------------------
    # Load models
    # --------------------------------------------------------

    print("\n[3/6] Loading trained models...")

    base_model = joblib.load(BASE_MODEL_PATH)
    calibrated_model = joblib.load(CALIBRATED_MODEL_PATH)

    print(f"Base model: {type(base_model).__name__}")
    print(f"Calibrated model: {type(calibrated_model).__name__}")

    # --------------------------------------------------------
    # Predict risk
    # --------------------------------------------------------

    print("\n[4/6] Calculating risk scores...")

    probabilities = calibrated_model.predict_proba(X)[:, 1]

    composite_scores = np.round(
        np.clip(probabilities * 100.0, 0.0, 100.0),
        2,
    )

    categories = [
        risk_category(score)
        for score in composite_scores
    ]

    # Cost risk
    cost_expansion = pd.to_numeric(
        df["cost_expansion_ratio"],
        errors="coerce",
    ).fillna(1.0)

    cost_scores = np.clip(
        (cost_expansion - 1.0) * 40.0
        + composite_scores * 0.6,
        0.0,
        100.0,
    )

    # Schedule risk
    schedule_slippage = pd.to_numeric(
        df["schedule_slippage_ratio"],
        errors="coerce",
    ).fillna(0.0)

    schedule_scores = np.clip(
        schedule_slippage * 30.0
        + composite_scores * 0.7,
        0.0,
        100.0,
    )

    # Progress risk
    progress = pd.to_numeric(
        df["physical_progress"],
        errors="coerce",
    ).fillna(0.0)

    progress_scores = np.clip(
        (100.0 - progress) * 0.5
        + composite_scores * 0.5,
        0.0,
        100.0,
    )

    # --------------------------------------------------------
    # SHAP
    # --------------------------------------------------------

    print("\n[5/6] Calculating SHAP risk drivers...")

    explainer = shap.TreeExplainer(base_model)
    shap_values = explainer.shap_values(X)

    if isinstance(shap_values, list):
        shap_values = shap_values[1]

    shap_values = np.asarray(shap_values)

    driver_json = []

    for row_index in range(len(df)):
        values = shap_values[row_index]

        positive_indices = np.where(values > 0)[0]

        if len(positive_indices) > 0:
            ordered = positive_indices[
                np.argsort(values[positive_indices])[::-1]
            ]
        else:
            ordered = np.argsort(values)[::-1][:3]

        drivers = []

        for index in ordered[:3]:
            feature = FEATURE_COLS[index]

            raw_value = X.iloc[row_index, index]

            drivers.append({
                "feature_name": FEATURE_DISPLAY_NAMES.get(
                    feature,
                    feature,
                ),
                "feature_code": feature,
                "points_added": f"+{float(values[index] * 100.0):.1f}",
                "value": (
                    None
                    if pd.isna(raw_value)
                    else float(raw_value)
                ),
            })

        driver_json.append(json.dumps(drivers))

    # --------------------------------------------------------
    # PostgreSQL
    # --------------------------------------------------------

    print("\n[6/6] Inserting into PostgreSQL...")

    engine = create_engine(get_database_url())

    records = []

    for i in range(len(df)):
        records.append({
            "project_code": str(df.iloc[i]["project_code"]),
            "reporting_month": str(df.iloc[i]["reporting_month"]),
            "composite_risk_score": float(composite_scores[i]),
            "cost_risk_score": float(cost_scores.iloc[i]),
            "schedule_risk_score": float(schedule_scores.iloc[i]),
            "progress_risk_score": float(progress_scores.iloc[i]),
            "risk_category": categories[i],
            "shap_top_drivers": driver_json[i],
        })

    insert_sql = text("""
        INSERT INTO risk_scores (
            project_code,
            reporting_month,
            composite_risk_score,
            cost_risk_score,
            schedule_risk_score,
            progress_risk_score,
            risk_category,
            shap_top_drivers
        )
        VALUES (
            :project_code,
            :reporting_month,
            :composite_risk_score,
            :cost_risk_score,
            :schedule_risk_score,
            :progress_risk_score,
            :risk_category,
            CAST(:shap_top_drivers AS JSONB)
        )
        ON CONFLICT (project_code, reporting_month)
        DO UPDATE SET
            composite_risk_score = EXCLUDED.composite_risk_score,
            cost_risk_score = EXCLUDED.cost_risk_score,
            schedule_risk_score = EXCLUDED.schedule_risk_score,
            progress_risk_score = EXCLUDED.progress_risk_score,
            risk_category = EXCLUDED.risk_category,
            shap_top_drivers = EXCLUDED.shap_top_drivers
    """)

    with engine.begin() as connection:
        connection.execute(insert_sql, records)

    # --------------------------------------------------------
    # Verification
    # --------------------------------------------------------

    with engine.connect() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM risk_scores")
        ).scalar()

        categories_db = connection.execute(
            text("""
                SELECT risk_category, COUNT(*)
                FROM risk_scores
                GROUP BY risk_category
                ORDER BY risk_category
            """)
        ).fetchall()

    print("\n" + "=" * 70)
    print("RISK SCORE POPULATION COMPLETED")
    print("=" * 70)

    print(f"Risk score rows in PostgreSQL: {count}")

    print("\nRisk category distribution:")
    for category, category_count in categories_db:
        print(f"  {category}: {category_count}")

    print("\nNo database tables were dropped or recreated.")
    print("=" * 70)


if __name__ == "__main__":
    main()
