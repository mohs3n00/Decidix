-- ============================================================================
-- Decidix M1 — backfill of identity-era data and quarantine copies.
--
-- Additive only. No legacy row is updated, deleted or re-attributed.
--   * indicator/boundary definition era 1 is captured from the CATALOG as it
--     exists today; that is a real observation of current meaning, not an
--     invented history.
--   * external ids are derived from the existing primary keys.
--   * rows without dataset_version_id are COPIED to quarantine, not moved.
--     Legacy reads keep seeing them until M3.
--   * no observation, forecast or recommendation is attributed to a version
--     it does not already carry.
-- Run in one transaction after 001_schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. One activation row per family that already has versions.
-- ---------------------------------------------------------------------------
INSERT INTO dataset_runtime_state (dataset_family, scope_key)
SELECT DISTINCT dataset_family, 'national'
  FROM dataset_versions
ON CONFLICT (dataset_family, scope_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Definition era "legacy-1": today's catalog contents, open-ended.
--    effective_from is the catalog row's creation date, which is when this
--    definition first became effective in this system.
-- ---------------------------------------------------------------------------
INSERT INTO indicator_definitions (
  indicator_key, definition_version, label, arabic_label, unit,
  higher_is_better, method_note, effective_from
)
SELECT i.key, 'legacy-1', i.label, i.arabic_label, i.unit,
       i.higher_is_better,
       'Captured from indicators catalog on M1 backfill; no earlier definition history exists.',
       i.created_at::date
  FROM indicators i
ON CONFLICT (indicator_key, definition_version) DO NOTHING;

INSERT INTO region_boundaries (
  region_id, boundary_version, geometry_geojson, boundary_hash, source_note, effective_from
)
SELECT r.id, 'legacy-1', r.boundary_geojson,
       encode(digest(r.boundary_geojson::text, 'sha256'), 'hex'),
       'Captured from regions.boundary_geojson on M1 backfill; no earlier boundary history exists.',
       r.created_at::date
  FROM regions r
 WHERE r.boundary_geojson IS NOT NULL
ON CONFLICT (region_id, boundary_version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Stable external identities.
--    `id` stays the legacy primary key; external_id is the version-scoped
--    identity used together with dataset_version_id.
-- ---------------------------------------------------------------------------
UPDATE rag_documents SET external_id = id WHERE external_id IS NULL;

UPDATE ai_recommendations SET external_id = id WHERE external_id IS NULL;

CREATE SEQUENCE IF NOT EXISTS ai_recommendations_seq
  AS BIGINT START WITH 1 OWNED BY ai_recommendations.seq;

UPDATE ai_recommendations
   SET seq = nextval('ai_recommendations_seq')
 WHERE seq IS NULL;

ALTER TABLE ai_recommendations
  ALTER COLUMN seq SET DEFAULT nextval('ai_recommendations_seq');

-- ---------------------------------------------------------------------------
-- 4. Quarantine copies. Nothing is removed from the legacy tables.
--    Deliberately conservative: a row is attributable only when it already
--    carries dataset_version_id. No version is inferred from payload contents.
-- ---------------------------------------------------------------------------
INSERT INTO migration_quarantine_records (
  original_table, original_id, dataset_version_id_hint, payload, reason, detail
)
SELECT 'regions', r.id, r.dataset_version_id, to_jsonb(r),
       'no_version_provenance',
       'regions row has no dataset_version_id; historical measurement attribution is not recoverable from this table.'
  FROM regions r
 WHERE r.dataset_version_id IS NULL
ON CONFLICT (original_table, original_id, reason) DO NOTHING;

INSERT INTO migration_quarantine_records (
  original_table, original_id, dataset_version_id_hint, payload, reason, detail
)
SELECT 'regional_metrics', m.id::text, m.dataset_version_id, to_jsonb(m),
       'no_version_provenance',
       'regional_metrics row has no dataset_version_id; it cannot be assigned to a version.'
  FROM regional_metrics m
 WHERE m.dataset_version_id IS NULL
ON CONFLICT (original_table, original_id, reason) DO NOTHING;

INSERT INTO migration_quarantine_records (
  original_table, original_id, dataset_version_id_hint, payload, reason, detail
)
SELECT 'national_index_history', h.id::text, h.dataset_version_id, to_jsonb(h),
       'no_version_provenance',
       'national_index_history row has no dataset_version_id; it cannot be assigned to a version.'
  FROM national_index_history h
 WHERE h.dataset_version_id IS NULL
ON CONFLICT (original_table, original_id, reason) DO NOTHING;

INSERT INTO migration_quarantine_records (
  original_table, original_id, dataset_version_id_hint, payload, reason, detail
)
SELECT 'sector_breakdowns', s.id::text, s.dataset_version_id, to_jsonb(s),
       'no_version_provenance',
       'sector_breakdowns row has no dataset_version_id; it cannot be assigned to a version.'
  FROM sector_breakdowns s
 WHERE s.dataset_version_id IS NULL
ON CONFLICT (original_table, original_id, reason) DO NOTHING;

INSERT INTO migration_quarantine_records (
  original_table, original_id, dataset_version_id_hint, payload, reason, detail
)
SELECT 'ai_recommendations', a.id, a.dataset_version_id, to_jsonb(a),
       'no_version_provenance',
       'recommendation has no dataset_version_id; serving it would mix version scope.'
  FROM ai_recommendations a
 WHERE a.dataset_version_id IS NULL
ON CONFLICT (original_table, original_id, reason) DO NOTHING;

INSERT INTO migration_quarantine_records (
  original_table, original_id, dataset_version_id_hint, payload, reason, detail
)
SELECT 'dataset_metadata', d.id, d.dataset_version_id, to_jsonb(d),
       'no_version_provenance',
       'metadata row has no dataset_version_id; one row per version cannot be established for it.'
  FROM dataset_metadata d
 WHERE d.dataset_version_id IS NULL
ON CONFLICT (original_table, original_id, reason) DO NOTHING;
