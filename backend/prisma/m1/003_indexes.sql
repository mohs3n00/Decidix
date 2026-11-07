-- ============================================================================
-- Decidix M1 — constraint validation and index construction on populated
-- tables. NOT run inside a transaction: CREATE INDEX CONCURRENTLY cannot be.
-- Each statement is applied on its own by the rehearsal runner.
--
-- If a statement fails, earlier statements stay applied. A failed concurrent
-- build leaves an INVALID index; check pg_index.indisvalid and DROP + rebuild.
-- Duplicate values in existing rows make a unique build fail: reconcile them
-- (they are listed in the error) before retrying, never delete to force it.
-- ============================================================================

-- Existing FK was added NOT VALID in 001; validating takes SHARE UPDATE
-- EXCLUSIVE and lets writes continue.
ALTER TABLE dataset_records VALIDATE CONSTRAINT dataset_records_dataset_version_id_fkey;
ALTER TABLE ml_forecasts VALIDATE CONSTRAINT ml_forecasts_dataset_version_id_fkey;
ALTER TABLE ml_forecasts VALIDATE CONSTRAINT ml_forecasts_model_run_id_fkey;

-- One metadata row per dataset version. NULL legacy rows are excluded so the
-- index can be built before M3 backfill.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_dataset_metadata_version
  ON dataset_metadata (dataset_version_id)
  WHERE dataset_version_id IS NOT NULL;

-- Exactly one version per family inside a coordinated bundle.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_dataset_versions_bundle_family
  ON dataset_versions (bundle_key, dataset_family)
  WHERE bundle_key IS NOT NULL;

-- Version-scoped stable identities.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_recommendations_version_external
  ON ai_recommendations (dataset_version_id, external_id)
  WHERE dataset_version_id IS NOT NULL AND external_id IS NOT NULL;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_rag_documents_version_external
  ON rag_documents (dataset_version_id, external_id)
  WHERE dataset_version_id IS NOT NULL AND external_id IS NOT NULL;

-- Query paths added in M1.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_forecasts_version_year
  ON ml_forecasts (dataset_version_id, forecast_year);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regional_metric_obs_year
  ON regional_metric_observations (dataset_version_id, indicator_key, year);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_national_obs_version_year
  ON national_index_observations (dataset_version_id, year DESC);
