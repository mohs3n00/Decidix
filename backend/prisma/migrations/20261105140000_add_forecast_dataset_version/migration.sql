-- Batch 3 — trace each forecast to the dataset version it was generated from.
--
-- The M1 proposal used a richer forecast/run model; this is the minimum
-- migration-backed change for the graduation MVP: one nullable column, an FK
-- with SET NULL (forecasts are derived artifacts, not evidence that should
-- block deleting a version), and a lookup index.

ALTER TABLE "ml_forecasts"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ml_forecasts_dataset_version_id_fkey'
  ) THEN
    ALTER TABLE "ml_forecasts"
      ADD CONSTRAINT "ml_forecasts_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_ml_forecasts_dataset_version"
  ON "ml_forecasts"("dataset_version_id");
