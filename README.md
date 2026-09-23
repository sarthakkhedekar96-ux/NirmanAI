🏗️ Nirman AI (निर्माण AI)

Autonomous Infrastructure Risk Intelligence & Predictive Surveillance Platform

Nirman AI transforms infrastructure monitoring from reactive reporting into proactive, explainable decision intelligence.

It combines longitudinal project telemetry, predictive machine learning, SHAP explainability, evidence-grounded RAG, environmental intelligence, dependency analysis, satellite change detection, what-if simulation, and an AI Copilot in one infrastructure command center.

🎯 What Nirman AI Does

Nirman AI helps infrastructure decision-makers answer:

Which projects currently require attention?

What factors are driving a project's risk?

Which projects show early-warning signals?

How are weather and environmental conditions affecting project exposure?

Which departments, agencies, clearances, or funding relationships create coordination pressure?

What could happen under additional cost or schedule stress?

What official evidence supports an AI-generated answer?

What actions should be reviewed for a high-risk project?

Predict → Explain → Monitor → Simulate → Warn → Recommend

📌 Problem Context

India's Ministry of Statistics and Programme Implementation (MoSPI) monitors major Central Sector Infrastructure Projects across sectors such as Railways, Road Transport & Highways, Petroleum, Power, Urban Development, Mining, and others.

Traditional monitoring relies heavily on periodic reports and large collections of official documents. This creates challenges:

Reactive monitoring: emerging cost and schedule problems can become visible only after deterioration.

Large-scale data: thousands of projects and longitudinal observations need unified analysis.

Limited explainability: a risk score alone does not explain its operational drivers.

Fragmented intelligence: project, financial, schedule, environmental, dependency, and document information can be separated.

Evidence retrieval: decision-makers need supporting records rather than unsupported AI answers.

Nirman AI addresses these challenges through predictive risk intelligence, explainability, evidence retrieval, environmental monitoring, dependency intelligence, satellite analysis, and scenario simulation.

🌟 Key Platform Capabilities

1. 🤖 Nirman AI Copilot

Evidence-grounded AI decision support with:

Natural-language infrastructure queries

Dynamic query planning

Multi-service orchestration

Database-grounded numerical answers

Evidence and citation retrieval

Project-specific context

Action-oriented recommendations

Guardrails against unsupported claims

2. ⚡ Predictive Risk Intelligence

Nirman AI uses an XGBoost-based risk engine with calibrated severe-risk probability and operational early-warning logic.

Risk score

Category

0–<30

LOW

30–<60

MODERATE

60–<80

HIGH

80–100

CRITICAL

Important threshold distinction

T=0.28 applies to severe-risk probability / early-warning escalation. It is not the threshold used for the four risk categories above.*

The platform therefore separates:

Composite risk category

Severe-risk probability

Early-warning state

3. 🔬 SHAP Explainability

TreeSHAP identifies the factors contributing to an individual project risk assessment, such as:

Project delay

Original delay

Months remaining

Cost indicators

Progress indicators

Milestone indicators

The goal is not only “what is the risk?”, but also “why?”

4. 🔍 Hybrid RAG Knowledge Engine

The document intelligence layer combines:

Structured project-code matching

Metadata retrieval

Content fallback retrieval

BM25 / sparse retrieval

TF-IDF-SVD dense representations

Reciprocal Rank Fusion (RRF)

Citation-aware evidence presentation

The production ingestion corpus contains approximately 331,000 document chunks.

The system reports honest zero-result states when supporting evidence cannot be established rather than fabricating citations.

5. 🗺️ Infrastructure Geospatial Intelligence

Interactive India infrastructure mapping supports views including:

Risk exposure

Project distribution

Cost-related indicators

Schedule-related indicators

Environmental severity

Geographic project filtering

Environmental severity is kept separate from ML risk exposure.

6. 🌦️ Weather & Disaster Intelligence

Live environmental intelligence uses Open-Meteo when available.

Signals include:

Rainfall

Wind

Temperature

Thermal stress

Cold-weather conditions

Potential disruption windows

Severity states:

NORMAL → WATCH → ELEVATED → HIGH → SEVERE

If live weather data cannot be obtained, the platform reports UNAVAILABLE rather than inventing values.

7. 🦺 Physical-Condition Advice Engine

Environmental conditions are translated into operational review guidance, including:

Heavy-rain precautions

High-wind safety considerations

Heat-stress precautions

Cold-weather worker protection

Concrete curing considerations

Material protection

Equipment and hydraulic-line protection

Slip/icing hazards

8. 🔗 Cross-Department Dependency Intelligence

The dependency graph models relationships between:

Projects

Agencies

Departments

Contractors

Funding entities

Clearance authorities

Sectors

States

Evidence states:

OBSERVED · DOCUMENTED · INFERRED

The dependency layer does not modify the production ML risk score.

9. 🚦 Bottleneck Leaderboard

A dedicated leaderboard identifies entities with high dependency concentration across:

Departments

Agencies

Clearance Authorities

Funding Entities

Sectors

States

The Coordination Pressure Index is a deterministic coordination indicator, not a probability of project failure and not evidence that an entity caused a delay.

10. 🛰️ Satellite Change Detection

The satellite pipeline uses Sentinel-2 L2A imagery and public STAC sources for bi-temporal spectral analysis.

Processing includes:

AOI-based raster processing

Geospatial grid alignment

UTM target grid

Cloud/shadow quality handling where source metadata permits

NDVI

NDBI

NDWI

Spectral change detection

If public satellite assets cannot be downloaded or decoded, the result is explicitly reported as UNAVAILABLE.

Spectral change does not independently prove construction progress, project delay, or project failure.

11. 🧪 Synthetic Stress-Test / What-If Intelligence

Hypothetical scenarios operate on in-memory copies and do not modify production records.

Presets:

BASELINE

COST PRESSURE

SCHEDULE SLIP

EXTREME WEATHER

COMBINED STRESS

CUSTOM

Controls include cost overrun, additional delay, rainfall multiplier, temperature delta, and dependency/clearance stress where applicable.

Scenario outputs are explicitly labelled as synthetic/hypothetical and are not actual project observations.

12. 📋 Prescriptive Decision Recommendations

Project-specific deterministic conditions can generate review recommendations such as:

Cost baseline re-audit

Milestone velocity tracking

Schedule review

Risk-driver review

Project-specific monitoring actions

Recommendations can include trigger conditions and rationale.

🏗️ System Architecture

React + TypeScript + Vite
          │
          ▼
      FastAPI API
          │
   ┌──────┼────────┬────────────┐
   ▼      ▼        ▼            ▼
PostgreSQL ML/Risk  RAG       External Data
           │        │       Weather/Satellite
           └────┬───┘
                ▼
      Intelligence Services
  Environment / Dependencies /
  Satellite / Stress Testing
                │
                ▼
          Gemini Copilot

🛠️ Technology Stack

Layer

Technologies

Frontend

React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons

Backend

FastAPI, Uvicorn, Pydantic v2, Python 3.10+

Database

PostgreSQL, SQLite fallback, SQLAlchemy

ML

XGBoost, Scikit-learn, SHAP, Joblib, LightGBM

Retrieval

BM25, TF-IDF-SVD, Reciprocal Rank Fusion

LLM

Google Gemini

Weather

Open-Meteo

Satellite

Sentinel-2 L2A / public STAC sources

Authentication

JWT HS256, HttpOnly cookies, bearer authentication

Security

RBAC, password hashing, rate limiting, CORS

Deployment

Vercel + Render + managed PostgreSQL

📊 Production Data Scale

The primary production API cohort currently contains:

Dataset

Records

Projects

3,589

Project observations

13,098

Project features

13,098

Risk scores

13,098

Dependency nodes

4,496

Dependency edges

19,564

RAG document chunks

331,206

Note: Other source/processed datasets contain a larger historical project population. The 3,589 figure above refers specifically to the primary production API cohort.

🔐 Authentication & Security

JWT authentication

HttpOnly cookie support

Bearer-token authentication

Role-based access control

Password hashing and complexity validation

Rate limiting

CORS configuration

Sanitized logging

Error handling middleware

Protected intelligence endpoints

Health and readiness monitoring

Production deployments should provide a strong JWT_SECRET_KEY and explicit CORS_ORIGINS.

🚀 Local Development

Backend

Create a virtual environment:

python -m venv .venv

Windows:

.venv\Scripts\Activate.ps1

Linux/macOS:

source .venv/bin/activate

Install dependencies:

pip install -r backend/requirements.txt

Start FastAPI:

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

Swagger: http://127.0.0.1:8000/docs

Health: http://127.0.0.1:8000/api/health

Frontend

cd frontend
npm install
npm run dev

The Vite development server normally runs at http://localhost:5173.

Configure the API base with:

VITE_API_BASE_URL=/api

🌐 Production Deployment

Target architecture:

Vercel React Frontend
        │ HTTPS
        ▼
Render FastAPI Backend
        │
   ┌────┴────┐
   ▼         ▼
Managed DB  External APIs
PostgreSQL  Gemini / Weather / Satellite

Backend start command:

python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT

Required production variables include:

DATABASE_URL=...
JWT_SECRET_KEY=...
CORS_ORIGINS=...

Frontend production configuration:

VITE_API_BASE_URL=https://<backend-domain>/api

RAG functionality requires the production document_chunks table to be populated.

🧪 Testing & Verification

The repository contains tests for:

API contracts

Authentication and authorization

Database integrity

Risk engine

SHAP explainability

RAG retrieval

AI assistant

Recommendations

Environmental intelligence

Dependency intelligence

Satellite processing

Stress testing

Resilience

Performance

Frontend integration

Golden-project consistency

Security

Examples:

python scripts/testing/test_risk_engine.py
python scripts/testing/test_rag.py
python scripts/testing/test_environment.py
python scripts/testing/test_dependencies.py
python scripts/testing/test_satellite.py
python scripts/testing/test_stress_test.py

Full regression harness:

python scripts/testing/run_full_test_suite.py

Frontend validation:

cd frontend
npx tsc --noEmit
npm run build

📂 Project Structure

NirmanAI/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   ├── models/
│   │   └── embeddings/
│   └── requirements.txt
├── database/
│   └── schema.sql
├── documentation/
├── frontend/
│   ├── public/
│   └── src/
├── metadata/
├── models/
├── processed/
├── scripts/
│   ├── database/
│   ├── extraction/
│   ├── features/
│   ├── ingestion/
│   ├── models/
│   ├── normalization/
│   ├── testing/
│   └── validation/
├── .env.example
├── .gitignore
└── README.md

🏆 Key Differentiators

Predictive: moves beyond static project reporting.

Explainable: exposes interpretable risk drivers.

Multi-intelligence: combines project, ML, documents, weather, satellite, dependencies, and simulation.

Evidence-grounded: connects AI responses to retrieved evidence.

Scenario-aware: supports hypothetical stress testing without changing production data.

Honest uncertainty: external-data failures are represented as UNAVAILABLE instead of fabricated measurements.

⚠️ Important Model & Data Notes

Risk categories use the documented composite risk-score bands.

T*=0.28 is an early-warning/severe-risk probability threshold, not a category boundary.

Stress-test outputs are hypothetical.

Satellite spectral change does not independently prove construction progress or delay.

Environmental data depends on external provider availability.

INFERRED dependency evidence is deterministic rule-derived information, not a confirmed project-specific record.

Coordination Pressure Index is a coordination indicator, not a failure probability.

AI recommendations and Copilot responses are decision-support outputs and should be reviewed against authoritative records and professional judgment.

📄 Project Context

Nirman AI was developed in the context of the Smart India Hackathon (SIH) and the infrastructure-monitoring domain associated with MoSPI.

The platform is a technology prototype for predictive infrastructure monitoring, explainable risk intelligence, evidence retrieval, environmental intelligence, and decision support.

🚧 Project Status

Production deployment preparation completed.

✅ Predictive risk intelligence

✅ SHAP explainability

✅ Hybrid RAG

✅ AI Copilot

✅ Authentication & RBAC

✅ Notifications

✅ Environmental intelligence

✅ Physical-condition advice

✅ Dependency intelligence

✅ Bottleneck leaderboard

✅ Satellite change detection pipeline

✅ Synthetic stress testing

✅ Prescriptive recommendations

✅ Production-oriented frontend

✅ FastAPI backend

✅ PostgreSQL support

✅ GitHub repository prepared and pushed

⏳ Managed production deployment

💡 USP

Nirman AI turns infrastructure monitoring from static reporting into predictive, explainable, evidence-grounded decision intelligence.

Short USP

Predict → Explain → Simulate → Warn → Recommend

🏗️ Nirman AI — Building intelligence for better infrastructure decisions.