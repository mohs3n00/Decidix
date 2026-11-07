ALTER TABLE "regions"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);
ALTER TABLE "indicators"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);
ALTER TABLE "national_index_history"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);
ALTER TABLE "regional_metrics"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);
ALTER TABLE "sector_breakdowns"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);
ALTER TABLE "ai_recommendations"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);
ALTER TABLE "dataset_metadata"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "idx_regions_dataset_version"
  ON "regions"("dataset_version_id");
CREATE INDEX IF NOT EXISTS "idx_indicators_dataset_version"
  ON "indicators"("dataset_version_id");
CREATE INDEX IF NOT EXISTS "idx_national_index_dataset_version"
  ON "national_index_history"("dataset_version_id");
CREATE INDEX IF NOT EXISTS "idx_regional_metrics_dataset_version"
  ON "regional_metrics"("dataset_version_id");
CREATE INDEX IF NOT EXISTS "idx_sector_breakdowns_dataset_version"
  ON "sector_breakdowns"("dataset_version_id");
CREATE INDEX IF NOT EXISTS "idx_recommendations_dataset_version"
  ON "ai_recommendations"("dataset_version_id");
CREATE INDEX IF NOT EXISTS "idx_dataset_metadata_dataset_version"
  ON "dataset_metadata"("dataset_version_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regions_dataset_version_id_fkey') THEN
    ALTER TABLE "regions" ADD CONSTRAINT "regions_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'indicators_dataset_version_id_fkey') THEN
    ALTER TABLE "indicators" ADD CONSTRAINT "indicators_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'national_index_history_dataset_version_id_fkey') THEN
    ALTER TABLE "national_index_history" ADD CONSTRAINT "national_index_history_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regional_metrics_dataset_version_id_fkey') THEN
    ALTER TABLE "regional_metrics" ADD CONSTRAINT "regional_metrics_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sector_breakdowns_dataset_version_id_fkey') THEN
    ALTER TABLE "sector_breakdowns" ADD CONSTRAINT "sector_breakdowns_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_recommendations_dataset_version_id_fkey') THEN
    ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dataset_metadata_dataset_version_id_fkey') THEN
    ALTER TABLE "dataset_metadata" ADD CONSTRAINT "dataset_metadata_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
