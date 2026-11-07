-- ============================================================================
-- Decidix M1 — rollback (down migration).
--
-- Reverses everything 001..004 added and restores the legacy schema state:
--   * drops the M1 tables, functions, columns and the sequence-owning column;
--   * restores dataset_records -> dataset_versions to ON DELETE CASCADE
--     (its pre-M1 behaviour);
--   * leaves every legacy table, row and legacy constraint untouched.
--
-- Safe only while no application code reads or writes the M1 objects, i.e.
-- before M2/M4. Nothing in the running application references them today.
--
-- Run in a single transaction. Intentionally NOT part of the forward scripts
-- and not audited by guard.auditScripts (which forbids DROP for 001..003).
-- ============================================================================

BEGIN;

-- 1. Functions first: they reference the tables below at runtime only.
DROP FUNCTION IF EXISTS activate_dataset_bundle(VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS report_orphan_observation_source_records();
DROP FUNCTION IF EXISTS report_lineage_version_mismatches();

-- 2. Columns whose foreign keys would block dropping model_runs / dataset_versions.
ALTER TABLE ml_forecasts DROP COLUMN IF EXISTS model_run_id;
ALTER TABLE ml_forecasts DROP COLUMN IF EXISTS dataset_version_id;

-- `seq` owns ai_recommendations_seq, so dropping the column drops the sequence.
ALTER TABLE ai_recommendations DROP COLUMN IF EXISTS seq;
ALTER TABLE ai_recommendations DROP COLUMN IF EXISTS external_id;
ALTER TABLE rag_documents DROP COLUMN IF EXISTS external_id;

ALTER TABLE dataset_versions DROP COLUMN IF EXISTS bundle_key;
ALTER TABLE dataset_versions DROP COLUMN IF EXISTS dataset_family;

-- 3. Observations and lineage before their parents.
DROP TABLE IF EXISTS observation_source_records;
DROP TABLE IF EXISTS region_observations;
DROP TABLE IF EXISTS regional_metric_observations;
DROP TABLE IF EXISTS national_index_observations;
DROP TABLE IF EXISTS sector_breakdown_observations;
DROP TABLE IF EXISTS dataset_activation_events;
DROP TABLE IF EXISTS dataset_runtime_state;
DROP TABLE IF EXISTS migration_quarantine_records;
DROP TABLE IF EXISTS region_relations;
DROP TABLE IF EXISTS region_boundaries;
DROP TABLE IF EXISTS indicator_definitions;
DROP TABLE IF EXISTS model_runs;

-- 4. Restore the legacy evidence FK (CASCADE) that 001 replaced with RESTRICT.
ALTER TABLE dataset_records
  DROP CONSTRAINT IF EXISTS dataset_records_dataset_version_id_fkey;
ALTER TABLE dataset_records
  ADD CONSTRAINT dataset_records_dataset_version_id_fkey
  FOREIGN KEY (dataset_version_id) REFERENCES dataset_versions(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
