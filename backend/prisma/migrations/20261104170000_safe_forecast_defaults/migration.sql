-- Safe defaults for newly inserted forecast records.
-- Existing rows are intentionally not rewritten by this migration; use the
-- owner-run correction script after review and backup.
ALTER TABLE "ml_forecasts"
  ALTER COLUMN "forecast_source" SET DEFAULT 'simulated_scenario',
  ALTER COLUMN "validation_status" SET DEFAULT 'simulated',
  ALTER COLUMN "is_calibrated" SET DEFAULT false;
