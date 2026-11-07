-- ============================================================================
-- Decidix M1 — additive versioned-model foundation (transactional DDL)
--
-- Requires the legacy schema (Prisma migrations 0_init .. 20261104233000).
-- Nothing here reads or rewrites legacy rows. No table, column, index or
-- constraint that the running application uses is dropped except the
-- dataset_records -> dataset_versions FK, which is replaced by an equivalent
-- FK with ON DELETE RESTRICT (future deletes only; existing rows unaffected).
--
-- Run in a single transaction. Steps 002 (backfill) and 003 (concurrent
-- indexes) follow; 004 is optional hardening.
-- ============================================================================

-- Refuse to run against a database that is not the Decidix legacy schema.
DO $$
BEGIN
  IF to_regclass('public.dataset_versions') IS NULL
     OR to_regclass('public.dataset_records') IS NULL
     OR to_regclass('public.indicators') IS NULL
     OR to_regclass('public.regions') IS NULL THEN
    RAISE EXCEPTION 'M1 requires the legacy Decidix schema; run the existing Prisma migrations first';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Dataset family / bundle scope
--
-- A "bundle" is one coordinated, internally compatible set of dataset
-- versions (for example the national index plus its sector breakdowns for the
-- same release). Versions are grouped by a shared bundle_key. Exactly one
-- version per family may belong to a bundle, enforced by the partial unique
-- index created in 003.
-- ---------------------------------------------------------------------------
ALTER TABLE dataset_versions
  ADD COLUMN IF NOT EXISTS dataset_family VARCHAR(64) NOT NULL DEFAULT 'national_index';
ALTER TABLE dataset_versions
  ADD COLUMN IF NOT EXISTS bundle_key VARCHAR(64);

COMMENT ON COLUMN dataset_versions.dataset_family IS
  'Dataset family this version belongs to. Widening the product adds families, not pointers.';
COMMENT ON COLUMN dataset_versions.bundle_key IS
  'Optional coordinated-bundle key. Versions sharing it must be activated together.';

-- ---------------------------------------------------------------------------
-- 2. Activation pointer (one row per family + scope) and audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dataset_runtime_state (
  dataset_family            VARCHAR(64) NOT NULL,
  scope_key                 VARCHAR(64) NOT NULL DEFAULT 'national',
  active_bundle_key         VARCHAR(64),
  active_dataset_version_id VARCHAR(64)
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dataset_family, scope_key),
  CONSTRAINT dataset_runtime_state_pointer_shape CHECK (
    active_dataset_version_id IS NOT NULL OR active_bundle_key IS NULL
  )
);

COMMENT ON TABLE dataset_runtime_state IS
  'Single authoritative activation pointer per (dataset_family, scope_key). The proof model''s id boolean row is the degenerate one-family case.';

CREATE TABLE IF NOT EXISTS dataset_activation_events (
  id                          BIGSERIAL PRIMARY KEY,
  dataset_family              VARCHAR(64) NOT NULL,
  scope_key                   VARCHAR(64) NOT NULL,
  dataset_version_id          VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  previous_dataset_version_id VARCHAR(64)
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  bundle_key                  VARCHAR(64),
  previous_bundle_key         VARCHAR(64),
  actor                       VARCHAR(64) NOT NULL,
  reason                      TEXT NOT NULL,
  activated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dataset_activation_events_reason_not_blank CHECK (btrim(reason) <> ''),
  CONSTRAINT dataset_activation_events_actor_not_blank CHECK (btrim(actor) <> '')
);

CREATE INDEX IF NOT EXISTS idx_dataset_activation_events_scope
  ON dataset_activation_events (dataset_family, scope_key, activated_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Indicator definitions (versioned meaning) and regional boundary history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS indicator_definitions (
  indicator_key      VARCHAR(64) NOT NULL
    REFERENCES indicators(key) ON DELETE RESTRICT,
  definition_version VARCHAR(32) NOT NULL,
  label              VARCHAR(100) NOT NULL,
  arabic_label       VARCHAR(100) NOT NULL,
  unit               VARCHAR(32) NOT NULL,
  higher_is_better   BOOLEAN NOT NULL,
  method_note        TEXT,
  source_note        TEXT,
  effective_from     DATE NOT NULL,
  effective_to       DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (indicator_key, definition_version),
  CONSTRAINT indicator_definitions_range_valid
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

COMMENT ON TABLE indicator_definitions IS
  'Versioned indicator meaning. A value ingested under one definition era is not silently comparable with another.';

-- At most one open era per indicator. Closed-era overlap is additionally
-- prevented by 004 when the btree_gist extension is available.
CREATE UNIQUE INDEX IF NOT EXISTS uq_indicator_definitions_open
  ON indicator_definitions (indicator_key) WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS region_boundaries (
  region_id         VARCHAR(64) NOT NULL
    REFERENCES regions(id) ON DELETE RESTRICT,
  boundary_version  VARCHAR(32) NOT NULL,
  geometry_geojson  JSONB NOT NULL,
  boundary_hash     VARCHAR(64),
  source_note       TEXT,
  effective_from    DATE NOT NULL,
  effective_to      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (region_id, boundary_version),
  CONSTRAINT region_boundaries_range_valid
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_region_boundaries_open
  ON region_boundaries (region_id) WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS region_relations (
  id                    BIGSERIAL PRIMARY KEY,
  predecessor_region_id VARCHAR(64) NOT NULL
    REFERENCES regions(id) ON DELETE RESTRICT,
  successor_region_id   VARCHAR(64) NOT NULL
    REFERENCES regions(id) ON DELETE RESTRICT,
  relation_type         VARCHAR(16) NOT NULL
    CHECK (relation_type IN ('split', 'merge', 'rename', 'transfer')),
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  note                  TEXT,
  CONSTRAINT region_relations_distinct_regions
    CHECK (predecessor_region_id <> successor_region_id),
  CONSTRAINT region_relations_range_valid
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT region_relations_identity
    UNIQUE (predecessor_region_id, successor_region_id, relation_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_region_relations_successor
  ON region_relations (successor_region_id);

COMMENT ON TABLE region_relations IS
  'Explicit split/merge/rename lineage so a region-level series is never silently carried across a boundary change.';

-- ---------------------------------------------------------------------------
-- 4. Version-owned observations
--
-- classification distinguishes what was observed from what was estimated,
-- derived or synthetic. Synthetic fixtures are never official observations.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS region_observations (
  id                 BIGSERIAL PRIMARY KEY,
  dataset_version_id VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  region_id          VARCHAR(64) NOT NULL
    REFERENCES regions(id) ON DELETE RESTRICT,
  boundary_version   VARCHAR(32),
  rank               INTEGER,
  score              NUMERIC(5,1),
  change             NUMERIC(5,1),
  priority           VARCHAR(32),
  population         INTEGER,
  latitude           NUMERIC(9,6),
  longitude          NUMERIC(9,6),
  boundary_geojson   JSONB,
  classification     VARCHAR(16) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','estimated','derived','provisional','synthetic')),
  ingested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT region_observations_version_region
    UNIQUE (dataset_version_id, region_id),
  CONSTRAINT region_observations_boundary_fk
    FOREIGN KEY (region_id, boundary_version)
    REFERENCES region_boundaries (region_id, boundary_version)
    ON DELETE RESTRICT
);

COMMENT ON COLUMN region_observations.boundary_version IS
  'Boundary era the geometry and population refer to. NULL only for legacy rows before backfill.';

CREATE TABLE IF NOT EXISTS national_index_observations (
  id                     BIGSERIAL PRIMARY KEY,
  dataset_version_id     VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  period                 VARCHAR(32) NOT NULL,
  year                   INTEGER NOT NULL,
  score                  NUMERIC(5,1) NOT NULL,
  max_score              NUMERIC(5,1) NOT NULL DEFAULT 100.0,
  change                 NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  compared_with          VARCHAR(64) NOT NULL DEFAULT 'previous period',
  band                   VARCHAR(32) NOT NULL,
  population             INTEGER NOT NULL,
  regions_count          INTEGER NOT NULL,
  at_risk_count          INTEGER NOT NULL DEFAULT 0,
  ai_insight_text        TEXT NOT NULL,
  ai_insight_arabic_text TEXT NOT NULL,
  classification         VARCHAR(16) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','estimated','derived','provisional','synthetic')),
  ingested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT national_index_observations_version_period
    UNIQUE (dataset_version_id, period)
);

CREATE TABLE IF NOT EXISTS regional_metric_observations (
  id                          BIGSERIAL PRIMARY KEY,
  dataset_version_id          VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  region_id                   VARCHAR(64) NOT NULL
    REFERENCES regions(id) ON DELETE RESTRICT,
  indicator_key               VARCHAR(64) NOT NULL
    REFERENCES indicators(key) ON DELETE RESTRICT,
  indicator_definition_version VARCHAR(32),
  reference_period            VARCHAR(32) NOT NULL,
  year                        INTEGER NOT NULL,
  value                       NUMERIC(10,2) NOT NULL,
  change                      NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  sparkline                   JSONB,
  classification              VARCHAR(16) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','estimated','derived','provisional','synthetic')),
  ingested_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT regional_metric_observations_identity
    UNIQUE (dataset_version_id, region_id, indicator_key, reference_period),
  CONSTRAINT regional_metric_observations_definition_fk
    FOREIGN KEY (indicator_key, indicator_definition_version)
    REFERENCES indicator_definitions (indicator_key, definition_version)
    ON DELETE RESTRICT
);

COMMENT ON COLUMN regional_metric_observations.indicator_definition_version IS
  'Definition era used to produce this value. A cross-era comparison must be refused or labelled.';

CREATE TABLE IF NOT EXISTS sector_breakdown_observations (
  id                 BIGSERIAL PRIMARY KEY,
  dataset_version_id VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  sector             VARCHAR(32) NOT NULL,
  key                VARCHAR(64) NOT NULL,
  reference_period   VARCHAR(32) NOT NULL,
  label              VARCHAR(100) NOT NULL,
  arabic_label       VARCHAR(100) NOT NULL,
  value              NUMERIC(10,2) NOT NULL,
  unit               VARCHAR(32) NOT NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  classification     VARCHAR(16) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','estimated','derived','provisional','synthetic')),
  ingested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sector_breakdown_observations_identity
    UNIQUE (dataset_version_id, sector, key, reference_period)
);

-- ---------------------------------------------------------------------------
-- 5. Many-to-many provenance: one derived observation may rest on several
--    raw dataset_records, and one raw record may support many observations.
--
-- observation_id cannot carry a polymorphic FK in PostgreSQL, so the ingest
-- transaction must write and delete these links alongside the observation.
-- `report_orphan_observation_source_records()` below is the reconciliation
-- check; M2 adds the delete-side triggers when the new write path lands.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observation_source_records (
  observation_type   VARCHAR(32) NOT NULL
    CHECK (observation_type IN (
      'region_observation',
      'regional_metric_observation',
      'national_index_observation',
      'sector_breakdown_observation')),
  observation_id     BIGINT NOT NULL,
  dataset_version_id VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  dataset_record_id  VARCHAR(64) NOT NULL
    REFERENCES dataset_records(id) ON DELETE RESTRICT,
  relation           VARCHAR(16) NOT NULL DEFAULT 'derived_from'
    CHECK (relation IN ('derived_from','aggregated_from','adjusted_by')),
  weight             NUMERIC(9,6),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (observation_type, observation_id, dataset_record_id)
);

CREATE INDEX IF NOT EXISTS idx_obs_source_records_record
  ON observation_source_records (dataset_record_id);
CREATE INDEX IF NOT EXISTS idx_obs_source_records_version
  ON observation_source_records (dataset_version_id);

-- ---------------------------------------------------------------------------
-- 6. ML model-run lineage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_runs (
  id                           VARCHAR(64) PRIMARY KEY,
  model_name                   VARCHAR(64) NOT NULL,
  model_version                VARCHAR(32) NOT NULL,
  training_dataset_version_id  VARCHAR(64) NOT NULL
    REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  code_revision                VARCHAR(64),
  hyperparameters              JSONB,
  metrics                      JSONB,
  trained_at                   TIMESTAMPTZ NOT NULL,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT model_runs_identity
    UNIQUE (model_name, model_version, training_dataset_version_id, trained_at)
);

-- ---------------------------------------------------------------------------
-- 7. Additive columns on existing tables (nullable, no defaults that rewrite)
-- ---------------------------------------------------------------------------
ALTER TABLE ml_forecasts       ADD COLUMN IF NOT EXISTS dataset_version_id VARCHAR(64);
ALTER TABLE ml_forecasts       ADD COLUMN IF NOT EXISTS model_run_id VARCHAR(64);
ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS external_id VARCHAR(64);
ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS seq BIGINT;
ALTER TABLE rag_documents      ADD COLUMN IF NOT EXISTS external_id VARCHAR(64);

-- Forecast ownership must remain deletable only explicitly, never by cascade.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ml_forecasts_dataset_version_id_fkey'
  ) THEN
    ALTER TABLE ml_forecasts ADD CONSTRAINT ml_forecasts_dataset_version_id_fkey
      FOREIGN KEY (dataset_version_id) REFERENCES dataset_versions(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ml_forecasts_model_run_id_fkey'
  ) THEN
    ALTER TABLE ml_forecasts ADD CONSTRAINT ml_forecasts_model_run_id_fkey
      FOREIGN KEY (model_run_id) REFERENCES model_runs(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  -- indicator_id has never had an FK. Add it NOT VALID (never fails on
  -- existing rows); 003 validates it after the catalog is checked.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ml_forecasts_indicator_id_fkey'
  ) THEN
    ALTER TABLE ml_forecasts ADD CONSTRAINT ml_forecasts_indicator_id_fkey
      FOREIGN KEY (indicator_id) REFERENCES indicators(key)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

-- Raw evidence must not vanish because a version row is deleted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'dataset_records_dataset_version_id_fkey'
       AND conrelid = 'dataset_records'::regclass
       AND confdeltype = 'c'
  ) THEN
    ALTER TABLE dataset_records DROP CONSTRAINT dataset_records_dataset_version_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'dataset_records_dataset_version_id_fkey'
       AND conrelid = 'dataset_records'::regclass
  ) THEN
    ALTER TABLE dataset_records ADD CONSTRAINT dataset_records_dataset_version_id_fkey
      FOREIGN KEY (dataset_version_id) REFERENCES dataset_versions(id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Quarantine holding area (rows are copied here, never invented into a
--    version). M3 removes them from the analytical path; M1 keeps legacy reads.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_quarantine_records (
  id                      BIGSERIAL PRIMARY KEY,
  original_table          VARCHAR(64) NOT NULL,
  original_id             TEXT NOT NULL,
  dataset_version_id_hint VARCHAR(64),
  payload                 JSONB NOT NULL,
  reason                  VARCHAR(64) NOT NULL
    CHECK (reason IN (
      'no_version_provenance',
      'synthetic_fixture',
      'payload_unavailable',
      'ambiguous_payload_match')),
  detail                  TEXT,
  quarantined_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at             TIMESTAMPTZ,
  reviewed_by             VARCHAR(64),
  disposition             VARCHAR(32)
    CHECK (disposition IN ('pending','restored','discarded','synthetic_fixture')),
  CONSTRAINT migration_quarantine_records_identity
    UNIQUE (original_table, original_id, reason)
);

-- ---------------------------------------------------------------------------
-- 9. Activation function: one bundle, validated, serialized, audited.
--    The application may call this from M2 onwards; M1 does not wire it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION activate_dataset_bundle(
  p_dataset_version_id VARCHAR(64),
  p_actor              VARCHAR(64),
  p_reason             TEXT
) RETURNS TABLE (
  dataset_family  VARCHAR(64),
  scope_key       VARCHAR(64),
  bundle_key      VARCHAR(64),
  version_id      VARCHAR(64)
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_version   dataset_versions%ROWTYPE;
  v_previous  dataset_runtime_state%ROWTYPE;
  v_members   INTEGER;
  v_invalid   INTEGER;
BEGIN
  IF btrim(p_actor) = '' OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'actor and reason are required for dataset activation'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_version FROM dataset_versions WHERE id = p_dataset_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'dataset version % does not exist', p_dataset_version_id
      USING ERRCODE = '23503';
  END IF;

  IF v_version.validation_status <> 'validated' THEN
    RAISE EXCEPTION 'dataset version % is not validated (%)',
      p_dataset_version_id, v_version.validation_status
      USING ERRCODE = '23514';
  END IF;

  -- Lock the one pointer row for this family/scope. Concurrent activations
  -- serialize here; the proof harness asserts one pointer and one event each.
  INSERT INTO dataset_runtime_state (dataset_family, scope_key)
    VALUES (v_version.dataset_family, 'national')
    ON CONFLICT (dataset_family, scope_key) DO NOTHING;

  SELECT * INTO v_previous
    FROM dataset_runtime_state r
   WHERE r.dataset_family = v_version.dataset_family
     AND r.scope_key = 'national'
   FOR UPDATE;

  -- Bundle completeness: every member must be validated, and the bundle must
  -- not mix two versions of the same family.
  IF v_version.bundle_key IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE validation_status <> 'validated')
      INTO v_members, v_invalid
      FROM dataset_versions
     WHERE bundle_key = v_version.bundle_key
       AND dataset_family = v_version.dataset_family;

    IF v_invalid > 0 THEN
      RAISE EXCEPTION 'bundle % contains % unvalidated version(s)',
        v_version.bundle_key, v_invalid
        USING ERRCODE = '23514';
    END IF;
    IF v_members = 0 THEN
      RAISE EXCEPTION 'bundle % has no members', v_version.bundle_key
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE dataset_runtime_state AS s
     SET active_dataset_version_id = v_version.id,
         active_bundle_key         = v_version.bundle_key,
         updated_at                = NOW()
   WHERE s.dataset_family = v_version.dataset_family
     AND s.scope_key = 'national';

  -- Mirror the legacy boolean so existing repositories stay correct until M4.
  -- Scoped to this family: activating one family must not deactivate another.
  UPDATE dataset_versions AS dv
     SET is_active = false
   WHERE dv.is_active = true
     AND dv.dataset_family = v_version.dataset_family;
  UPDATE dataset_versions AS dv
     SET is_active = true
   WHERE dv.id = v_version.id;

  INSERT INTO dataset_activation_events (
    dataset_family, scope_key, dataset_version_id,
    previous_dataset_version_id, bundle_key, previous_bundle_key, actor, reason
  ) VALUES (
    v_version.dataset_family, 'national', v_version.id,
    v_previous.active_dataset_version_id, v_version.bundle_key,
    v_previous.active_bundle_key, p_actor, p_reason
  );

  RETURN QUERY
    SELECT r.dataset_family, r.scope_key, r.active_bundle_key, r.active_dataset_version_id
      FROM dataset_runtime_state r
     WHERE r.dataset_family = v_version.dataset_family
       AND r.scope_key = 'national';
END;
$$;

-- Reconciliation helpers (read-only).
CREATE OR REPLACE FUNCTION report_orphan_observation_source_records()
RETURNS BIGINT
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT count(*) FROM observation_source_records s
   WHERE NOT EXISTS (
           SELECT 1 FROM region_observations o
            WHERE s.observation_type = 'region_observation' AND o.id = s.observation_id)
     AND NOT EXISTS (
           SELECT 1 FROM regional_metric_observations o
            WHERE s.observation_type = 'regional_metric_observation' AND o.id = s.observation_id)
     AND NOT EXISTS (
           SELECT 1 FROM national_index_observations o
            WHERE s.observation_type = 'national_index_observation' AND o.id = s.observation_id)
     AND NOT EXISTS (
           SELECT 1 FROM sector_breakdown_observations o
            WHERE s.observation_type = 'sector_breakdown_observation' AND o.id = s.observation_id);
$$;

CREATE OR REPLACE FUNCTION report_lineage_version_mismatches()
RETURNS BIGINT
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT count(*)
    FROM observation_source_records s
    JOIN dataset_records r ON r.id = s.dataset_record_id
   WHERE r.dataset_version_id <> s.dataset_version_id;
$$;
