-- SYNTHETIC PROOF FIXTURES ONLY. Not official data. Names are labels for an
-- isolated test database, never for a deployed dataset.
SET search_path TO proof;

INSERT INTO dataset_versions (id, version, source, license, coverage, validation_status, validated_at, record_count, created_by)
VALUES
  ('ds_a', 'proof-a', 'Synthetic proof fixture A', 'test-only', 'two regions, 2025', 'validated', now(), 1, 'proof_runner'),
  ('ds_b', 'proof-b', 'Synthetic proof fixture B', 'test-only', 'two regions, 2025', 'validated', now(), 1, 'proof_runner'),
  ('ds_invalid', 'proof-invalid', 'Synthetic proof fixture (never activated)', 'test-only', 'two regions, 2025', 'uploaded', NULL, 1, 'proof_runner');

-- Stable identities are shared by both versions on purpose.
INSERT INTO regions (id, code, name, arabic_name, level, geometry_geojson) VALUES
  ('central_capital', 'SA-01', 'Central Capital', 'العاصمة المركزية', 'adm1', '{"type":"Point","coordinates":[46.7,24.7]}'),
  ('frontier',        'SA-02', 'Frontier',        'المنطقة الحدودية',   'adm1', '{"type":"Point","coordinates":[41.0,29.0]}');

INSERT INTO indicators (key, label, arabic_label, domain, unit, higher_is_better) VALUES
  ('clinic_density', 'Clinic density', 'كثافة العيادات', 'healthcare', 'per_100k', true);

INSERT INTO region_observations (dataset_version_id, region_id, rank, score, change, priority, population, latitude, longitude, classification) VALUES
  ('ds_a', 'central_capital', 1, 80.00,  1.50, 'high', 1200000, 24.700000, 46.700000, 'simulated'),
  ('ds_a', 'frontier',        2, 50.00, -2.00, 'high',  400000, 29.000000, 41.000000, 'simulated'),
  ('ds_b', 'central_capital', 1, 90.00,  3.00, 'low',  1250000, 24.700000, 46.700000, 'simulated'),
  ('ds_b', 'frontier',        2, 60.00, -1.00, 'low',   420000, 29.000000, 41.000000, 'simulated'),
  ('ds_invalid', 'central_capital', 1, 99.00, 0.00, 'low', 1200000, 24.700000, 46.700000, 'simulated');

INSERT INTO national_index_observations (dataset_version_id, period, year, score, band, population, regions_count, classification) VALUES
  ('ds_a', '2025', 2025, 70.00, 'moderate', 1600000, 2, 'simulated'),
  ('ds_b', '2025', 2025, 78.00, 'high',     1670000, 2, 'simulated'),
  ('ds_invalid', '2025', 2025, 88.00, 'high', 1600000, 1, 'simulated');

INSERT INTO regional_metric_observations (dataset_version_id, region_id, indicator_key, reference_period, year, value, classification) VALUES
  ('ds_a', 'central_capital', 'clinic_density', '2025', 2025, 12.000000, 'simulated'),
  ('ds_a', 'frontier',        'clinic_density', '2025', 2025,  6.000000, 'simulated'),
  ('ds_b', 'central_capital', 'clinic_density', '2025', 2025, 20.000000, 'simulated'),
  ('ds_b', 'frontier',        'clinic_density', '2025', 2025,  9.000000, 'simulated'),
  ('ds_invalid', 'central_capital', 'clinic_density', '2025', 2025, 30.000000, 'simulated');

INSERT INTO dataset_metadata (dataset_version_id, name, arabic_name, original_source, license, geographic_coverage, time_coverage, update_frequency, completeness_pct, accuracy_pct, age_days, status) VALUES
  ('ds_a', 'Proof fixture A', 'نموذج إثبات أ', 'Synthetic proof fixture A', 'test-only', 'two regions', '2025', 'never', 100, 100, 0, 'validated'),
  ('ds_b', 'Proof fixture B', 'نموذج إثبات ب', 'Synthetic proof fixture B', 'test-only', 'two regions', '2025', 'never', 100, 100, 0, 'validated');

INSERT INTO dataset_records (id, dataset_version_id, record_index, payload) VALUES
  ('ds_a:0', 'ds_a', 0, '{"fixture":"A"}'),
  ('ds_b:0', 'ds_b', 0, '{"fixture":"B"}');
