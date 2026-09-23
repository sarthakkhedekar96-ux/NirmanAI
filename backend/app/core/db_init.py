import os
import logging
import sqlalchemy
import pandas as pd
from backend.app.core.db_resilience import get_resilient_db_engine
from backend.app.core.security import hash_password

logger = logging.getLogger("nirman.db_init")


def ensure_users_table_exists():
    """
    Safely creates the `users` table additively without touching or resetting existing database tables.
    """
    engine = get_resilient_db_engine()
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(128) UNIQUE NOT NULL,
        full_name VARCHAR(128) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'ANALYST',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    """
    try:
        with engine.begin() as conn:
            conn.execute(sqlalchemy.text(create_table_sql))
        logger.info("✅ Database users table verified/initialized additively.")
    except Exception as e:
        logger.error(f"Error ensuring users table: {e}")


def ensure_notification_tables_exist():
    """
    Safely creates `alerts`, `notifications`, `notification_deliveries`, and `user_notification_preferences`
    tables additively without touching or resetting existing database tables.
    """
    engine = get_resilient_db_engine()
    create_tables_sql = """
    CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        project_code VARCHAR(64) NOT NULL,
        alert_type VARCHAR(64) NOT NULL,
        severity VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        trigger_reason TEXT NOT NULL,
        risk_score DOUBLE PRECISION,
        predicted_severe_risk_probability DOUBLE PRECISION,
        risk_category VARCHAR(32),
        risk_drivers TEXT,
        recommended_actions TEXT,
        dedup_hash VARCHAR(128) UNIQUE NOT NULL,
        triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        metadata_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_project_code ON alerts(project_code);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_dedup_hash ON alerts(dedup_hash);

    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
        recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        channel VARCHAR(32) NOT NULL DEFAULT 'IN_APP',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(32) NOT NULL DEFAULT 'UNREAD'
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

    CREATE TABLE IF NOT EXISTS notification_deliveries (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        provider_message_id VARCHAR(255),
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(32) NOT NULL,
        failure_reason TEXT,
        provider_response_metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_notification ON notification_deliveries(notification_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON notification_deliveries(status);

    CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        critical_alerts_only BOOLEAN NOT NULL DEFAULT FALSE,
        cost_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        schedule_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_pref_user_id ON user_notification_preferences(user_id);
    """
    try:
        with engine.begin() as conn:
            conn.execute(sqlalchemy.text(create_tables_sql))
        logger.info("✅ Database notification & alert tables verified/initialized additively.")
    except Exception as e:
        logger.error(f"Error ensuring notification tables: {e}")


def ensure_project_indexes_exist():
    """
    Safely creates additive performance indexes on `projects`, `project_observations`, `risk_scores`,
    `project_features`, and `document_chunks` for query optimization.
    Applies only if table exists, preserving all existing PostgreSQL/SQLite data.
    """
    engine = get_resilient_db_engine()
    index_sql = """
    CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state);
    CREATE INDEX IF NOT EXISTS idx_projects_agency ON projects(agency);
    CREATE INDEX IF NOT EXISTS idx_projects_sector ON projects(sector);
    CREATE INDEX IF NOT EXISTS idx_proj_obs_code_month ON project_observations(project_code, reporting_month DESC);
    CREATE INDEX IF NOT EXISTS idx_risk_scores_code_month ON risk_scores(project_code, reporting_month DESC);
    CREATE INDEX IF NOT EXISTS idx_proj_features_code_month ON project_features(project_code, reporting_month DESC);
    CREATE INDEX IF NOT EXISTS idx_doc_chunks_code ON document_chunks(project_code);
    """
    try:
        with engine.begin() as conn:
            conn.execute(sqlalchemy.text(index_sql))
        logger.info("✅ Additive performance indexes verified on database tables.")
    except Exception as e:
        logger.error(f"Error ensuring performance indexes: {e}")




def seed_bootstrap_admin_if_needed():
    """
    Idempotent bootstrap check: Creates seed accounts if no users exist in database.
    Does not modify or overwrite existing user passwords.
    """
    engine = get_resilient_db_engine()
    try:
        with engine.connect() as conn:
            df = pd.read_sql(sqlalchemy.text("SELECT COUNT(*) as count FROM users"), conn)
            user_count = int(df.iloc[0]["count"]) if not df.empty else 0

        if user_count > 0:
            logger.info(f"ℹ️ Database user table contains {user_count} accounts. Skipping seed bootstrap.")
            return

        # Check explicit bootstrap environment variables
        bootstrap_admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@nirman.gov.in")
        bootstrap_admin_pass = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", os.getenv("INITIAL_ADMIN_PASSWORD", "NirmanAdmin@2026"))

        bootstrap_decision_pass = os.getenv("BOOTSTRAP_DECISION_PASSWORD", "NirmanDecision@2026")
        bootstrap_analyst_pass = os.getenv("BOOTSTRAP_ANALYST_PASSWORD", "NirmanAnalyst@2026")

        logger.info("⚡ Seeding initial institutional accounts (ADMIN, DECISION_MAKER, ANALYST)...")

        users_to_seed = [
            {
                "username": "admin",
                "email": bootstrap_admin_email,
                "full_name": "Senior System Administrator",
                "password_hash": hash_password(bootstrap_admin_pass),
                "role": "ADMIN"
            },
            {
                "username": "decision_maker",
                "email": "decision@nirman.gov.in",
                "full_name": "MoSPI Project Director",
                "password_hash": hash_password(bootstrap_decision_pass),
                "role": "DECISION_MAKER"
            },
            {
                "username": "analyst",
                "email": "analyst@nirman.gov.in",
                "full_name": "Infrastructure Risk Analyst",
                "password_hash": hash_password(bootstrap_analyst_pass),
                "role": "ANALYST"
            }
        ]

        insert_sql = """
        INSERT INTO users (username, email, full_name, password_hash, role, is_active)
        VALUES (:username, :email, :full_name, :password_hash, :role, TRUE)
        ON CONFLICT (username) DO NOTHING;
        """
        with engine.begin() as conn:
            for u in users_to_seed:
                conn.execute(sqlalchemy.text(insert_sql), u)

        logger.info("✅ Initial institutional user accounts successfully bootstrapped.")

    except Exception as e:
        logger.error(f"Error during user table bootstrap: {e}")


def ensure_environmental_tables_exist():
    """
    Safely creates `environmental_observations` table additively without touching existing database tables.
    Supports both PostgreSQL and SQLite fallback dialects.
    """
    engine = get_resilient_db_engine()
    is_sqlite = engine.dialect.name == "sqlite"
    
    if is_sqlite:
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS environmental_observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_code VARCHAR(32) NOT NULL,
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
            observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_env_project_code ON environmental_observations(project_code);
        CREATE INDEX IF NOT EXISTS idx_env_observed_at ON environmental_observations(observed_at);
        CREATE INDEX IF NOT EXISTS idx_env_severity ON environmental_observations(severity);
        """
    else:
        create_table_sql = """
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
        """
    try:
        with engine.begin() as conn:
            conn.execute(sqlalchemy.text(create_table_sql))
        logger.info("✅ Database environmental_observations table verified/initialized additively.")
    except Exception as e:
        logger.error(f"Error ensuring environmental tables: {e}")


def ensure_dependency_tables_exist():
    """
    Safely creates `dependency_nodes` and `dependency_edges` tables additively.
    Supports both PostgreSQL and SQLite fallback dialects.
    """
    engine = get_resilient_db_engine()
    is_sqlite = engine.dialect.name == "sqlite"

    if is_sqlite:
        create_tables_sql = """
        CREATE TABLE IF NOT EXISTS dependency_nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_type VARCHAR(32) NOT NULL,
            node_key VARCHAR(128) UNIQUE NOT NULL,
            display_name VARCHAR(255) NOT NULL,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_dep_nodes_key ON dependency_nodes(node_key);
        CREATE INDEX IF NOT EXISTS idx_dep_nodes_type ON dependency_nodes(node_type);

        CREATE TABLE IF NOT EXISTS dependency_edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_node_id INTEGER REFERENCES dependency_nodes(id) ON DELETE CASCADE,
            target_node_id INTEGER REFERENCES dependency_nodes(id) ON DELETE CASCADE,
            relationship_type VARCHAR(32) NOT NULL,
            evidence_status VARCHAR(32) NOT NULL,
            confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
            evidence_text TEXT,
            source_reference VARCHAR(255),
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_dep_edge UNIQUE (source_node_id, target_node_id, relationship_type)
        );
        CREATE INDEX IF NOT EXISTS idx_dep_edges_source ON dependency_edges(source_node_id);
        CREATE INDEX IF NOT EXISTS idx_dep_edges_target ON dependency_edges(target_node_id);
        CREATE INDEX IF NOT EXISTS idx_dep_edges_rel_type ON dependency_edges(relationship_type);
        CREATE INDEX IF NOT EXISTS idx_dep_edges_evidence_status ON dependency_edges(evidence_status);
        """
    else:
        create_tables_sql = """
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
        """
    try:
        with engine.begin() as conn:
            conn.execute(sqlalchemy.text(create_tables_sql))
        logger.info("✅ Database dependency_nodes & dependency_edges tables verified/initialized additively.")
    except Exception as e:
        logger.error(f"Error ensuring dependency tables: {e}")


