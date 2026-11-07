-- Decidix versioned data model — PROOF SCHEMA ONLY.
-- Disposable database whose name starts with decidix_proof_. Never apply to
-- decidix_dev, staging, or production. Synthetic fixtures only.

-- The runner refuses to start when this schema exists, creates it exactly once,
-- and drops it only if this run created it. This file neither creates nor drops the
-- schema, so it must be applied by the runner (or after a deliberate
-- CREATE SCHEMA proof).
SET search_path TO proof;

CREATE TABLE dataset_versions (
  id                varchar(64) PRIMARY KEY,
  version           varchar(64) NOT NULL UNIQUE,
  source            text        NOT NULL,
  license           text        NOT NULL,
  coverage          text        NOT NULL,
  validation_status varchar(32) NOT NULL DEFAULT 'uploaded'
    CHECK (validation_status IN ('uploaded','validated','invalid','rejected')),
  validated_at      timestamptz,
  validation_error  text,
  record_count      integer     NOT NULL DEFAULT 0,
  created_by        varchar(64) NOT NULL,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

-- Stable reference identity. No measurement columns live here.
CREATE TABLE regions (
  id               varchar(64) PRIMARY KEY,
  code             varchar(64) NOT NULL UNIQUE,
  name             varchar(100) NOT NULL,
  arabic_name      varchar(100) NOT NULL,
  level            varchar(32) NOT NULL DEFAULT 'adm1',
  parent_id        varchar(64) REFERENCES regions(id) ON DELETE RESTRICT,
  geometry_geojson jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE indicators (
  key                varchar(64) PRIMARY KEY,
  label              varchar(100) NOT NULL,
  arabic_label       varchar(100) NOT NULL,
  domain             varchar(32) NOT NULL,
  unit               varchar(32) NOT NULL,
  higher_is_better   boolean NOT NULL DEFAULT true,
  definition_version varchar(64),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dataset_records (
  id                 varchar(128) PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  record_index       integer NOT NULL,
  payload            jsonb NOT NULL,
  UNIQUE (dataset_version_id, record_index)
);

-- Version-owned observations -------------------------------------------------

CREATE TABLE region_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  region_id          varchar(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  rank               integer,
  score              numeric(10,2),
  change             numeric(10,2),
  priority           varchar(32),
  population         integer,
  latitude           numeric(9,6),
  longitude          numeric(9,6),
  boundary_geojson   jsonb,
  classification     varchar(32) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','derived','simulated')),
  UNIQUE (dataset_version_id, region_id)
);
CREATE INDEX idx_region_observations_lookup
  ON region_observations (dataset_version_id, region_id);

CREATE TABLE national_index_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  period             varchar(32) NOT NULL,
  year               integer NOT NULL,
  score              numeric(10,2) NOT NULL,
  max_score          numeric(10,2) NOT NULL DEFAULT 100,
  change             numeric(10,2) NOT NULL DEFAULT 0,
  band               varchar(32) NOT NULL,
  population         integer NOT NULL,
  regions_count      integer NOT NULL,
  at_risk_count      integer NOT NULL DEFAULT 0,
  classification     varchar(32) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','derived','simulated')),
  UNIQUE (dataset_version_id, period)
);
CREATE INDEX idx_national_index_version_year
  ON national_index_observations (dataset_version_id, year DESC);

CREATE TABLE regional_metric_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  region_id          varchar(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  indicator_key      varchar(64) NOT NULL REFERENCES indicators(key) ON DELETE RESTRICT,
  reference_period   varchar(32) NOT NULL,
  year               integer NOT NULL,
  value              numeric(18,6) NOT NULL,
  change             numeric(18,6),
  sparkline          jsonb,
  classification     varchar(32) NOT NULL DEFAULT 'observed'
    CHECK (classification IN ('observed','derived','simulated')),
  UNIQUE (dataset_version_id, region_id, indicator_key, reference_period)
);
CREATE INDEX idx_regional_metric_version_lookup
  ON regional_metric_observations (dataset_version_id, region_id, indicator_key, year);

CREATE TABLE sector_breakdown_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  sector             varchar(32) NOT NULL,
  key                varchar(64) NOT NULL,
  reference_period   varchar(32) NOT NULL,
  label              varchar(100) NOT NULL,
  arabic_label       varchar(100) NOT NULL,
  value              numeric(18,6) NOT NULL,
  unit               varchar(32) NOT NULL,
  sort_order         integer NOT NULL DEFAULT 0,
  classification     varchar(32) NOT NULL DEFAULT 'observed',
  UNIQUE (dataset_version_id, sector, key, reference_period)
);

-- Recommendations need a surrogate key: the same external id legitimately
-- repeats across versions, so (id) alone cannot be the primary key.
CREATE TABLE recommendations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  external_id        varchar(64) NOT NULL,
  region_id          varchar(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  priority           varchar(32) NOT NULL,
  domain             varchar(32) NOT NULL,
  title              varchar(255) NOT NULL,
  arabic_title       varchar(255) NOT NULL,
  index_impact       numeric(6,2) NOT NULL,
  confidence         integer NOT NULL,
  status             varchar(32) NOT NULL DEFAULT 'suggested',
  UNIQUE (dataset_version_id, external_id)
);

CREATE TABLE dataset_metadata (
  dataset_version_id varchar(64) PRIMARY KEY REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  name               varchar(255) NOT NULL,
  arabic_name        varchar(255) NOT NULL,
  original_source    varchar(255) NOT NULL,
  source_url         text,
  license            varchar(255) NOT NULL,
  geographic_coverage varchar(255) NOT NULL,
  time_coverage      varchar(255) NOT NULL,
  update_frequency   varchar(64) NOT NULL,
  completeness_pct   numeric(5,1) NOT NULL CHECK (completeness_pct BETWEEN 0 AND 100),
  accuracy_pct       numeric(5,1) NOT NULL CHECK (accuracy_pct BETWEEN 0 AND 100),
  age_days           integer NOT NULL CHECK (age_days >= 0),
  status             varchar(32) NOT NULL
);

-- Single authoritative pointer. One row, enforced by the boolean primary key.
CREATE TABLE dataset_runtime_state (
  id                        boolean PRIMARY KEY DEFAULT true CHECK (id),
  active_dataset_version_id varchar(64) REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  updated_at                timestamptz NOT NULL DEFAULT now()
);
INSERT INTO dataset_runtime_state (id) VALUES (true);

CREATE TABLE dataset_activation_events (
  id                        bigserial PRIMARY KEY,
  dataset_version_id        varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  previous_dataset_version_id varchar(64) REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  actor                     varchar(64) NOT NULL,
  reason                    text NOT NULL,
  activated_at              timestamptz NOT NULL DEFAULT now()
);

-- Activation: serialized on the singleton, completeness-checked, audited.
CREATE OR REPLACE FUNCTION activate_dataset(
  p_version_id text,
  p_actor      text,
  p_reason     text
) RETURNS void
LANGUAGE plpgsql
SET search_path = proof, pg_temp
AS $$
DECLARE
  v_status  text;
  v_previous text;
  v_meta    integer;
  v_regions integer;
  v_metrics integer;
  v_history integer;
BEGIN
  -- Row lock serializes concurrent activations; the loser waits, then re-reads.
  PERFORM 1 FROM dataset_runtime_state WHERE id FOR UPDATE;

  SELECT validation_status INTO v_status
    FROM dataset_versions WHERE id = p_version_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'DATASET_NOT_FOUND';
  END IF;
  IF v_status <> 'validated' THEN
    RAISE EXCEPTION 'DATASET_NOT_VALIDATED';
  END IF;

  SELECT count(*) INTO v_meta    FROM dataset_metadata              WHERE dataset_version_id = p_version_id;
  SELECT count(*) INTO v_regions FROM region_observations          WHERE dataset_version_id = p_version_id;
  SELECT count(*) INTO v_metrics FROM regional_metric_observations WHERE dataset_version_id = p_version_id;
  SELECT count(*) INTO v_history FROM national_index_observations  WHERE dataset_version_id = p_version_id;

  IF v_meta = 0 OR v_regions = 0 OR v_metrics = 0 OR v_history = 0 THEN
    RAISE EXCEPTION 'DATASET_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM regional_metric_observations m
      LEFT JOIN region_observations r
        ON r.dataset_version_id = m.dataset_version_id
       AND r.region_id = m.region_id
     WHERE m.dataset_version_id = p_version_id
       AND r.id IS NULL
  ) THEN
    RAISE EXCEPTION 'DATASET_ORPHAN_REFERENCES';
  END IF;

  SELECT active_dataset_version_id INTO v_previous
    FROM dataset_runtime_state WHERE id;

  UPDATE dataset_runtime_state
     SET active_dataset_version_id = p_version_id,
         updated_at = now()
   WHERE id;

  INSERT INTO dataset_activation_events
    (dataset_version_id, previous_dataset_version_id, actor, reason)
  VALUES (p_version_id, v_previous, p_actor, p_reason);
END $$;

-- The one place analytical code resolves the active version.
CREATE VIEW active_region_scores AS
SELECT r.code, o.score, o.priority, o.population
  FROM region_observations o
  JOIN dataset_runtime_state s ON s.active_dataset_version_id = o.dataset_version_id
  JOIN regions r ON r.id = o.region_id;

CREATE VIEW active_national_index AS
SELECT n.period, n.year, n.score, n.band
  FROM national_index_observations n
  JOIN dataset_runtime_state s ON s.active_dataset_version_id = n.dataset_version_id;

CREATE VIEW active_regional_metrics AS
SELECT m.region_id, m.indicator_key, m.year, m.value
  FROM regional_metric_observations m
  JOIN dataset_runtime_state s ON s.active_dataset_version_id = m.dataset_version_id;
