-- Decidix SQL Migration: 004_ml_forecasts.sql
-- Add ml_forecasts table for persistent predictive intelligence and planning forecasts

CREATE TABLE IF NOT EXISTS "ml_forecasts" (
    "id" VARCHAR(64) PRIMARY KEY,
    "region_id" VARCHAR(64) REFERENCES "regions"("id") ON DELETE CASCADE,
    "indicator_id" VARCHAR(64) NOT NULL DEFAULT 'development_index',
    "forecast_year" INTEGER NOT NULL,
    "predicted_value" NUMERIC(5, 1) NOT NULL,
    "lower_bound" NUMERIC(5, 1),
    "upper_bound" NUMERIC(5, 1),
    "confidence_level" NUMERIC(3, 2) DEFAULT 0.95,
    "model_name" VARCHAR(64) NOT NULL DEFAULT 'temporal_ensemble',
    "model_version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "forecast_source" VARCHAR(64) NOT NULL DEFAULT 'official_planning',
    "forecast_method" VARCHAR(64) NOT NULL DEFAULT 'temporal_ensemble',
    "validation_status" VARCHAR(32) NOT NULL DEFAULT 'validated',
    "is_calibrated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "uq_ml_forecasts" UNIQUE ("region_id", "indicator_id", "forecast_year", "model_version", "validation_status")
);

CREATE INDEX IF NOT EXISTS "idx_ml_forecasts_year" ON "ml_forecasts"("forecast_year");
CREATE INDEX IF NOT EXISTS "idx_ml_forecasts_region" ON "ml_forecasts"("region_id");
CREATE INDEX IF NOT EXISTS "idx_ml_forecasts_status" ON "ml_forecasts"("validation_status");
CREATE INDEX IF NOT EXISTS "idx_ml_forecasts_indicator" ON "ml_forecasts"("indicator_id");

