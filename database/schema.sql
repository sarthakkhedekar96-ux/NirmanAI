-- ============================================================
-- Nirman / PAIMANA AI Infrastructure Monitoring Platform Schema
-- Database: PostgreSQL
-- ============================================================

-- 1. Master Projects Table
CREATE TABLE IF NOT EXISTS projects (
    project_code VARCHAR(32) PRIMARY KEY,
    project_name TEXT NOT NULL,
    agency VARCHAR(128),
    state VARCHAR(128),
    sector VARCHAR(128),
    approval_date VARCHAR(7),
    original_cost NUMERIC(14, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Longitudinal Monthly Project Observations Table
CREATE TABLE IF NOT EXISTS project_observations (
    id SERIAL PRIMARY KEY,
    project_code VARCHAR(32) REFERENCES projects(project_code) ON DELETE CASCADE,
    reporting_month VARCHAR(7) NOT NULL,
    revised_cost NUMERIC(14, 2),
    anticipated_cost NUMERIC(14, 2),
    cumulative_expenditure NUMERIC(14, 2),
    physical_progress NUMERIC(8, 2),
    original_doc VARCHAR(7),
    revised_doc VARCHAR(7),
    anticipated_doc VARCHAR(7),
    original_delay_months NUMERIC(10, 1),
    revised_delay_months NUMERIC(10, 1),
    milestones_achieved INTEGER,
    milestones_total INTEGER,
    source_file VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_reporting_month UNIQUE (project_code, reporting_month)
);

-- 3. Engineered Features & ML Prediction Targets Table
CREATE TABLE IF NOT EXISTS project_features (
    id SERIAL PRIMARY KEY,
    project_code VARCHAR(32) REFERENCES projects(project_code) ON DELETE CASCADE,
    reporting_month VARCHAR(7) NOT NULL,
    months_elapsed NUMERIC(14, 2),
    months_originally_planned NUMERIC(14, 2),
    months_remaining NUMERIC(14, 2),
    cost_expansion_ratio NUMERIC(14, 4),
    expenditure_ratio NUMERIC(14, 4),
    expenditure_progress_gap NUMERIC(14, 4),
    schedule_slippage_ratio NUMERIC(14, 4),
    progress_velocity NUMERIC(14, 4),
    target_cost_overrun_12m SMALLINT,
    target_time_overrun_12m SMALLINT,
    target_severe_risk_12m SMALLINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_feature_project_reporting_month UNIQUE (project_code, reporting_month)
);

-- 4. Risk Engine Scores & Model Predictions Table
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    project_code VARCHAR(32) REFERENCES projects(project_code) ON DELETE CASCADE,
    reporting_month VARCHAR(7) NOT NULL,
    composite_risk_score NUMERIC(5, 2) NOT NULL,
    cost_risk_score NUMERIC(5, 2),
    schedule_risk_score NUMERIC(5, 2),
    progress_risk_score NUMERIC(5, 2),
    risk_category VARCHAR(32) NOT NULL,
    shap_top_drivers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_risk_project_reporting_month UNIQUE (project_code, reporting_month)
);

-- ============================================================
-- INDEXES FOR FAST ANALYTICS & DASHBOARD SERVING
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_obs_project_code ON project_observations(project_code);
CREATE INDEX IF NOT EXISTS idx_obs_reporting_month ON project_observations(reporting_month);
CREATE INDEX IF NOT EXISTS idx_feat_project_code ON project_features(project_code);
CREATE INDEX IF NOT EXISTS idx_feat_reporting_month ON project_features(reporting_month);
CREATE INDEX IF NOT EXISTS idx_risk_project_code ON risk_scores(project_code);
CREATE INDEX IF NOT EXISTS idx_risk_reporting_month ON risk_scores(reporting_month);
CREATE INDEX IF NOT EXISTS idx_risk_category ON risk_scores(risk_category);

-- 5. Environmental Observations Table (Phase 16 Contextual Intelligence)
CREATE TABLE IF NOT EXISTS environmental_observations (
    id SERIAL PRIMARY KEY,
    project_code VARCHAR(32) REFERENCES projects(project_code) ON DELETE CASCADE,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    temperature_c NUMERIC(5, 2),
    humidity_pct NUMERIC(5, 2),
    precipitation_mm NUMERIC(6, 2),
    wind_speed_kmh NUMERIC(5, 2),
    condition VARCHAR(64),
    severity VARCHAR(32),
    provider VARCHAR(64),
    raw_reference TEXT,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_env_project_code ON environmental_observations(project_code);
CREATE INDEX IF NOT EXISTS idx_env_observed_at ON environmental_observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_env_severity ON environmental_observations(severity);

-- 6. Dependency Graph Nodes & Edges Tables (Phase 17 Dependency Intelligence)
CREATE TABLE IF NOT EXISTS dependency_nodes (
    id SERIAL PRIMARY KEY,
    node_type VARCHAR(32) NOT NULL,
    node_key VARCHAR(128) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dep_nodes_key ON dependency_nodes(node_key);
CREATE INDEX IF NOT EXISTS idx_dep_nodes_type ON dependency_nodes(node_type);

CREATE TABLE IF NOT EXISTS dependency_edges (
    id SERIAL PRIMARY KEY,
    source_node_id INTEGER REFERENCES dependency_nodes(id) ON DELETE CASCADE,
    target_node_id INTEGER REFERENCES dependency_nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(32) NOT NULL,
    evidence_status VARCHAR(32) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    evidence_text TEXT,
    source_reference VARCHAR(255),
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dep_edge UNIQUE (source_node_id, target_node_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_dep_edges_source ON dependency_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_dep_edges_target ON dependency_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_dep_edges_rel_type ON dependency_edges(relationship_type);
CREATE INDEX IF NOT EXISTS idx_dep_edges_evidence_status ON dependency_edges(evidence_status);


