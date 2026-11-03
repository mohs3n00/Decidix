-- Decidix Core Database Schema Migration 001
-- PostgreSQL authoritative relational structure

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users and Access Control
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    arabic_name VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'planner', 'viewer')),
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Regions Catalog
CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(64) PRIMARY KEY, -- Slug, e.g. 'central_capital', 'frontier'
    name VARCHAR(100) NOT NULL,
    arabic_name VARCHAR(100) NOT NULL,
    rank INTEGER NOT NULL,
    score NUMERIC(5, 1) NOT NULL,
    change NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    population INTEGER NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    boundary_geojson JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_rank ON regions(rank);
CREATE INDEX IF NOT EXISTS idx_regions_priority ON regions(priority);
CREATE INDEX IF NOT EXISTS idx_regions_score ON regions(score);

-- 3. Indicator Catalog
CREATE TABLE IF NOT EXISTS indicators (
    key VARCHAR(64) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    arabic_label VARCHAR(100) NOT NULL,
    domain VARCHAR(32) NOT NULL CHECK (domain IN ('overall', 'education', 'healthcare', 'economy', 'infrastructure')),
    unit VARCHAR(32) NOT NULL CHECK (unit IN ('score_100', 'percent', 'years', 'per_mille', 'per_thousand', 'pupils_per_teacher', 'usd')),
    higher_is_better BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    arabic_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indicators_domain ON indicators(domain);

-- 4. National Development Index History
CREATE TABLE IF NOT EXISTS national_index_history (
    id SERIAL PRIMARY KEY,
    period VARCHAR(32) NOT NULL, -- e.g. '2025-Q4', or year '2025'
    year INTEGER NOT NULL,
    score NUMERIC(5, 1) NOT NULL,
    max_score NUMERIC(5, 1) NOT NULL DEFAULT 100.0,
    change NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    compared_with VARCHAR(64) NOT NULL DEFAULT 'previous period',
    band VARCHAR(32) NOT NULL CHECK (band IN ('low', 'moderate_low', 'moderate', 'moderate_high', 'high')),
    population INTEGER NOT NULL,
    regions_count INTEGER NOT NULL DEFAULT 12,
    at_risk_count INTEGER NOT NULL DEFAULT 0,
    ai_insight_text TEXT NOT NULL,
    ai_insight_arabic_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_index_year ON national_index_history(year DESC);

-- 5. Regional Metrics & Sparklines
CREATE TABLE IF NOT EXISTS regional_metrics (
    id SERIAL PRIMARY KEY,
    region_id VARCHAR(64) NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    indicator_key VARCHAR(64) NOT NULL REFERENCES indicators(key) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    change NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    sparkline JSONB, -- Array of historic numbers
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_region_indicator_year UNIQUE (region_id, indicator_key, year)
);

CREATE INDEX IF NOT EXISTS idx_regional_metrics_reg_ind ON regional_metrics(region_id, indicator_key);

-- 6. Sector Breakdowns
CREATE TABLE IF NOT EXISTS sector_breakdowns (
    id SERIAL PRIMARY KEY,
    sector VARCHAR(32) NOT NULL CHECK (sector IN ('education', 'healthcare', 'economy', 'infrastructure')),
    key VARCHAR(64) NOT NULL,
    label VARCHAR(100) NOT NULL,
    arabic_label VARCHAR(100) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 7. Development Projects Portfolio
CREATE TABLE IF NOT EXISTS development_projects (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    arabic_title VARCHAR(255) NOT NULL,
    region_id VARCHAR(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('planned', 'in_progress', 'delayed', 'completed')),
    progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
    budget_amount NUMERIC(15, 2) NOT NULL,
    budget_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    due_date DATE,
    completed_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON development_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_region ON development_projects(region_id);

-- 8. Citizen Reports
CREATE TABLE IF NOT EXISTS citizen_reports (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    arabic_title VARCHAR(255) NOT NULL,
    description TEXT,
    arabic_description TEXT,
    category VARCHAR(32) NOT NULL CHECK (category IN ('roads', 'health', 'schools', 'water')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('under_review', 'escalated', 'resolved')),
    region_id VARCHAR(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    author_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_category ON citizen_reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_region ON citizen_reports(region_id);

-- 9. Citizen Report Likes
CREATE TABLE IF NOT EXISTS citizen_report_likes (
    report_id VARCHAR(64) NOT NULL REFERENCES citizen_reports(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (report_id, user_id)
);

-- 10. AI Recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id VARCHAR(64) PRIMARY KEY,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('high', 'medium', 'low', 'critical')),
    region_id VARCHAR(64) NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    domain VARCHAR(32) NOT NULL CHECK (domain IN ('education', 'healthcare', 'economy', 'infrastructure')),
    title VARCHAR(255) NOT NULL,
    arabic_title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    arabic_summary TEXT NOT NULL,
    index_impact NUMERIC(4, 1) NOT NULL,
    estimated_cost_amount NUMERIC(15, 2) NOT NULL,
    estimated_cost_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    status VARCHAR(32) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'in_plan', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_region ON ai_recommendations(region_id);

-- 11. Dataset Metadata & Provenance
CREATE TABLE IF NOT EXISTS dataset_metadata (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    arabic_name VARCHAR(255) NOT NULL,
    original_source VARCHAR(255) NOT NULL,
    source_url TEXT,
    license VARCHAR(100) NOT NULL,
    geographic_coverage VARCHAR(100) NOT NULL DEFAULT 'National (12 Regions)',
    time_coverage VARCHAR(100) NOT NULL,
    update_frequency VARCHAR(50) NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    completeness_pct NUMERIC(5, 1) NOT NULL DEFAULT 100.0,
    timeliness_pct NUMERIC(5, 1) NOT NULL DEFAULT 100.0,
    accuracy_pct NUMERIC(5, 1) NOT NULL DEFAULT 100.0,
    age_days INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'synced' CHECK (status IN ('synced', 'overdue')),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

