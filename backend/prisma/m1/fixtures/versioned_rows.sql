-- Version-tagged legacy rows, raw records and a bundle with one unvalidated
-- member. Used by the "versioned" scenario after legacy_rows.sql.
--
-- This file runs BEFORE M1 on purpose: it must contain only columns that exist
-- in the legacy schema. `dataset_family` and `bundle_key` are added by
-- 001_schema.sql, so they are assigned afterwards by
-- fixtures/versioned_m1_metadata.sql (the same order a real rollout follows).
INSERT INTO dataset_versions
  (id, version, filename, object_key, checksum_sha256, format, source, license, coverage,
   validation_status, validated_at, record_count, is_active, created_by)
VALUES
  ('ver-a', 'v-a', 'a.json', 'datasets/a.json', repeat('a', 64), 'json', 'Synthetic fixture', 'internal',
   'national', 'validated', now(), 2, true, 'fixture'),
  ('ver-b', 'v-b', 'b.json', 'datasets/b.json', repeat('b', 64), 'json', 'Synthetic fixture', 'internal',
   'national', 'validated', now(), 1, false, 'fixture'),
  ('ver-d', 'v-d', 'd.json', 'datasets/d.json', repeat('d', 64), 'json', 'Synthetic fixture', 'internal',
   'national', 'validated', now(), 1, false, 'fixture'),
  ('ver-c', 'v-c', 'c.json', 'datasets/c.json', repeat('c', 64), 'json', 'Synthetic fixture', 'internal',
   'sector', 'uploaded', NULL, 1, false, 'fixture');

INSERT INTO dataset_records (id, dataset_version_id, record_index, payload, is_retrievable)
VALUES
  ('rec-a-1', 'ver-a', 1, '{"region":"alpha","indicator":"development_index","value":80.0}', true),
  ('rec-a-2', 'ver-a', 2, '{"region":"alpha","indicator":"development_index","value":80.0}', true),
  ('rec-b-1', 'ver-b', 1, '{"region":"beta","indicator":"development_index","value":61.0}', true),
  ('rec-c-1', 'ver-c', 1, '{"sector":"economy"}', false);

-- Version-tagged legacy analytical rows.
UPDATE regions          SET dataset_version_id = 'ver-a' WHERE id = 'alpha';
UPDATE regional_metrics SET dataset_version_id = 'ver-a';
UPDATE national_index_history SET dataset_version_id = 'ver-a';
UPDATE sector_breakdowns SET dataset_version_id = 'ver-a';
UPDATE ai_recommendations SET dataset_version_id = 'ver-a';
UPDATE dataset_metadata   SET dataset_version_id = 'ver-a';
UPDATE rag_documents      SET dataset_version_id = 'ver-a';

-- Forecast with the catalog indicator, no model run yet (both nullable).
INSERT INTO ml_forecasts
  (id, region_id, indicator_id, forecast_year, predicted_value, model_version,
   validation_status, forecast_source, forecast_method)
VALUES
  ('forecast-a-2030', 'alpha', 'development_index', 2030, 84.0, '1.0.0',
   'simulated', 'simulated_scenario', 'temporal_ensemble');
