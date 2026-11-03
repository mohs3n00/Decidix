-- CreateTable
CREATE TABLE "ml_forecasts" (
    "id" VARCHAR(64) NOT NULL,
    "region_id" VARCHAR(64),
    "indicator_id" VARCHAR(64) NOT NULL DEFAULT 'development_index',
    "forecast_year" INTEGER NOT NULL,
    "predicted_value" DECIMAL(5,1) NOT NULL,
    "lower_bound" DECIMAL(5,1),
    "upper_bound" DECIMAL(5,1),
    "confidence_level" DECIMAL(3,2) DEFAULT 0.95,
    "model_name" VARCHAR(64) NOT NULL DEFAULT 'temporal_ensemble',
    "model_version" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "forecast_source" VARCHAR(64) NOT NULL DEFAULT 'official_planning',
    "forecast_method" VARCHAR(64) NOT NULL DEFAULT 'temporal_ensemble',
    "validation_status" VARCHAR(32) NOT NULL DEFAULT 'validated',
    "is_calibrated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ml_forecasts_year" ON "ml_forecasts"("forecast_year");

-- CreateIndex
CREATE INDEX "idx_ml_forecasts_region" ON "ml_forecasts"("region_id");

-- CreateIndex
CREATE INDEX "idx_ml_forecasts_status" ON "ml_forecasts"("validation_status");

-- CreateIndex
CREATE INDEX "idx_ml_forecasts_indicator" ON "ml_forecasts"("indicator_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ml_forecasts" ON "ml_forecasts"("region_id", "indicator_id", "forecast_year", "model_version", "validation_status");

-- AddForeignKey
ALTER TABLE "ml_forecasts" ADD CONSTRAINT "ml_forecasts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

