# Decidix — Versioned Data Model Migration Plan

Status: **M1 SQL executed in rehearsal (2026-11-05); not applied to any project,
staging or production database.** Companion to
`docs/DECIDIX_VERSIONED_DATA_ARCHITECTURE_PROPOSAL.md` (model v2) and
`backend/prisma/proof/` (proof harness).
Date: 2026-11-04 (design); rehearsal recorded 2026-11-05.

The M1 scripts in `backend/prisma/m1/` were executed against four disposable
PostgreSQL 18.6 databases (`empty`, `legacy`, `versioned`, `unattributable`) by
`run_rehearsal.mjs`: **304/304 assertions passed**, including legacy-row
preservation, every constraint family, migration failure and `005_rollback.sql`.
No project, staging or production database was contacted. The design below is
unchanged by the rehearsal; exact results are in §11 of
`docs/DECIDIX_RECOVERY_STATUS.md` and in `backend/prisma/m1/README.md`.

---

## 0. What changes, in one page

| Today | Target |
| --- | --- |
| `regions` holds identity **and** one version's `score`, `rank`, `change`, `priority`, `population`, latitude/longitude | `regions` holds identity and geometry only; measurements move to `region_observations` keyed by `dataset_version_id` |
| `regional_metrics` unique on `(region_id, indicator_key, year)`, ignoring version | `regional_metric_observations` unique on `(dataset_version_id, region_id, indicator_key, reference_period)` |
| `dataset_versions.is_active` boolean, no DB-level single-active guarantee | `dataset_runtime_state` singleton row is the single pointer; `is_active` becomes a mirror during transition and is dropped in the contract phase |
| `ai_recommendations.id` is a global primary key | surrogate `bigserial` + `UNIQUE(dataset_version_id, external_id)` |
| `ml_forecasts` has no dataset version | required `dataset_version_id` |
| `dataset_records` → `dataset_versions` is `ON DELETE CASCADE` | `ON DELETE RESTRICT` for evidence; delete is an explicit, audited operation |
| Activation = `updateMany(false)` + `update(true)` in a transaction | `SELECT ... FOR UPDATE` on the singleton + completeness checks + `dataset_activation_events` audit row |

Stable entities are **not** duplicated per version. Only measurements and derived
content are version-owned.

---

## 1. Phase M1 — additive schema (no reads change)

Everything is additive; the running application keeps working unchanged.

### 1.1 New tables

Create, in this order (FK targets first):

```sql
CREATE TABLE dataset_runtime_state (
  id                        boolean PRIMARY KEY DEFAULT true CHECK (id),
  active_dataset_version_id varchar(64) REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  updated_at                timestamptz NOT NULL DEFAULT now()
);
INSERT INTO dataset_runtime_state (id) VALUES (true);

CREATE TABLE dataset_activation_events (
  id                          bigserial PRIMARY KEY,
  dataset_version_id          varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  previous_dataset_version_id varchar(64) REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  actor                       varchar(64) NOT NULL,
  reason                      text        NOT NULL,
  activated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE region_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  region_id          varchar(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  rank               integer,
  score              numeric(5,1),
  change             numeric(5,1),
  priority           varchar(32),
  population         integer,
  latitude           numeric(9,6),
  longitude          numeric(9,6),
  boundary_geojson   jsonb,
  classification     varchar(32) NOT NULL DEFAULT 'observed',
  UNIQUE (dataset_version_id, region_id)
);

CREATE TABLE national_index_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  period             varchar(32) NOT NULL,
  year               integer     NOT NULL,
  score              numeric(5,1) NOT NULL,
  max_score          numeric(5,1) NOT NULL DEFAULT 100.0,
  change             numeric(5,1) NOT NULL DEFAULT 0.0,
  compared_with      varchar(64) NOT NULL DEFAULT 'previous period',
  band               varchar(32) NOT NULL,
  population         integer     NOT NULL,
  regions_count      integer     NOT NULL,
  at_risk_count      integer     NOT NULL DEFAULT 0,
  ai_insight_text    text        NOT NULL,
  ai_insight_arabic_text text   NOT NULL,
  classification     varchar(32) NOT NULL DEFAULT 'observed',
  UNIQUE (dataset_version_id, period)
);

CREATE TABLE regional_metric_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  region_id          varchar(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  indicator_key      varchar(64) NOT NULL REFERENCES indicators(key) ON DELETE RESTRICT,
  reference_period   varchar(32) NOT NULL,
  year               integer     NOT NULL,
  value              numeric(10,2) NOT NULL,
  change             numeric(5,2) NOT NULL DEFAULT 0.0,
  sparkline          jsonb,
  classification     varchar(32) NOT NULL DEFAULT 'observed',
  UNIQUE (dataset_version_id, region_id, indicator_key, reference_period)
);

CREATE TABLE sector_breakdown_observations (
  id                 bigserial PRIMARY KEY,
  dataset_version_id varchar(64) NOT NULL REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  sector             varchar(32) NOT NULL,
  key                varchar(64) NOT NULL,
  reference_period   varchar(32) NOT NULL,
  label              varchar(100) NOT NULL,
  arabic_label       varchar(100) NOT NULL,
  value              numeric(10,2) NOT NULL,
  unit               varchar(32) NOT NULL,
  sort_order         integer NOT NULL DEFAULT 0,
  classification     varchar(32) NOT NULL DEFAULT 'observed',
  UNIQUE (dataset_version_id, sector, key, reference_period)
);
```

Why `reference_period` **and** `year`: `reference_period` is the ingested identity
("2025", "2025-Q4"), `year` is the range-scan projection the repositories already
filter on (`year: { gte, lte }`). Uniqueness uses the identity; the index uses the year.

### 1.2 Additions to existing tables

```sql
ALTER TABLE ml_forecasts       ADD COLUMN dataset_version_id varchar(64)
  REFERENCES dataset_versions(id) ON DELETE RESTRICT;
ALTER TABLE ai_recommendations ADD COLUMN external_id varchar(64);
-- dataset_metadata.dataset_version_id already exists and stays nullable until M3;
-- do not re-add it.

-- `regions.score/rank/change/priority/population/latitude/longitude` are NOT NULL today.
-- Release them before any write cutover, or legacy inserts fail once M2 stops writing
-- measurements. Metadata-only, no rewrite. Keep legacy writes until M5 so the columns
-- stay meaningful for the transitional read path.
ALTER TABLE regions
  ALTER COLUMN score DROP NOT NULL,
  ALTER COLUMN rank DROP NOT NULL,
  ALTER COLUMN change DROP NOT NULL,
  ALTER COLUMN priority DROP NOT NULL,
  ALTER COLUMN population DROP NOT NULL,
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;
```

`dataset_metadata.dataset_version_id` already exists and stays nullable until Phase M3.
Add `UNIQUE (dataset_version_id)` on `dataset_metadata` **after** backfill (M3), because
today several legacy rows may share `NULL`.

### 1.3 Constraint hardening (safe, immediate)

```sql
-- Evidence must not disappear because a version row is deleted.
ALTER TABLE dataset_records DROP CONSTRAINT IF EXISTS dataset_records_dataset_version_id_fkey;
ALTER TABLE dataset_records ADD  CONSTRAINT dataset_records_dataset_version_id_fkey
  FOREIGN KEY (dataset_version_id) REFERENCES dataset_versions(id) ON DELETE RESTRICT;
```

This is the only change in M1 that can fail on existing data, and it cannot: RESTRICT
only affects future deletes, not existing rows. Verify with
`SELECT conname, confdeltype FROM pg_constraint WHERE conrelid = 'dataset_records'::regclass;`
(`confdeltype = 'r'`).

### 1.4 Indexes

Create large indexes **concurrently**, outside a transaction:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_region_obs_lookup
  ON region_observations (dataset_version_id, region_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_national_obs_version_year
  ON national_index_observations (dataset_version_id, year DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regional_metric_obs_lookup
  ON regional_metric_observations (dataset_version_id, region_id, indicator_key, year);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sector_obs_lookup
  ON sector_breakdown_observations (dataset_version_id, sector, key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forecasts_dataset_version
  ON ml_forecasts (dataset_version_id, forecast_year);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_external
  ON ai_recommendations (dataset_version_id, external_id);
```

`CONCURRENTLY` cannot run inside a transaction block. Prisma Migrate wraps migrations in
a transaction, so these are shipped as a separate, explicitly non-transactional step
(`prisma db execute --file`) and recorded in the migration log.

Locking concerns: `CREATE TABLE` takes no long lock; `ALTER TABLE ... ADD COLUMN` with a
nullable column and no default is metadata-only on PostgreSQL 11+; adding the FK requires
a validation scan of `dataset_records` (share-row-exclusive on that table). On a large
`dataset_records` table use:

```sql
ALTER TABLE dataset_records
  ADD CONSTRAINT dataset_records_dataset_version_id_fkey
  FOREIGN KEY (dataset_version_id) REFERENCES dataset_versions(id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE dataset_records VALIDATE CONSTRAINT dataset_records_dataset_version_id_fkey;
```

`VALIDATE CONSTRAINT` takes only `SHARE UPDATE EXCLUSIVE`, so writes continue.

---

## 2. Phase M2 — dual write

`DatasetService.ingest` writes both the legacy tables and the new observation tables in
the **same** transaction, so the two representations cannot diverge.

Order inside the transaction:

1. Upsert stable `regions` identity (`id`, `name`, `arabic_name`, `boundary_geojson`).
   **Stop writing** `score`, `rank`, `change`, `priority`, `population`, `latitude`,
   `longitude` on `regions` from the new path. Those columns stay populated only by the
   legacy path until M3, so `NOT NULL` is never violated.
2. Upsert stable `indicators` identity; stop writing `dataset_version_id` on it.
3. Insert `region_observations`, `national_index_observations`,
   `regional_metric_observations`, `sector_breakdown_observations` for this version.
4. Legacy writes continue unchanged for rollback safety.

Ingest conflict semantics become *additive*: an existing version's observation rows are
replaced for that version only (`DELETE ... WHERE dataset_version_id = $1` then insert),
never for another version. That removes the current
`CANONICAL_OBSERVATION_VERSION_CONFLICT` failure mode for legitimate re-ingest while
keeping it for genuinely cross-version writes.

`DatasetService.activate` in M2:

```ts
await prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT 1 FROM dataset_runtime_state WHERE id FOR UPDATE`;
  // validation status + completeness checks (metadata, regions, metrics, history)
  const previous = await tx.datasetRuntimeState.findUniqueOrThrow({ where: { id: true } });
  await tx.datasetRuntimeState.update({
    where: { id: true },
    data: { activeDatasetVersionId: id, updatedAt: new Date() },
  });
  await tx.datasetVersion.updateMany({ data: { isActive: false }, where: { isActive: true } });
  await tx.datasetVersion.update({ where: { id }, data: { isActive: true } }); // mirror
  await tx.datasetActivationEvent.create({
    data: { datasetVersionId: id, previousDatasetVersionId: previous.activeDatasetVersionId, actor, reason },
  });
});
```

The mirror keeps `DatasetService.active()` (and therefore every existing repository)
correct during the transition, without a flag day. The `FOR UPDATE` is what makes
concurrent activations serialize; the mirror is written inside the same transaction.

---

## 3. Phase M3 — backfill

### 3.1 Eligible rows

Only version-tagged legacy rows can be backfilled:

```sql
INSERT INTO region_observations (dataset_version_id, region_id, rank, score, change, priority, population, latitude, longitude, boundary_geojson, classification)
SELECT dataset_version_id, id, rank, score, change, priority, population, latitude, longitude, boundary_geojson, 'observed'
  FROM regions
 WHERE dataset_version_id IS NOT NULL
ON CONFLICT (dataset_version_id, region_id) DO NOTHING;
```

Note the direction: today `regions.dataset_version_id` is the *last writer*, so a region
row can only be attributed to one version. Earlier versions of that region are
**unrecoverable from `regions`** and must come from `dataset_records.payload`.

```sql
INSERT INTO regional_metric_observations (dataset_version_id, region_id, indicator_key, reference_period, year, value, change, sparkline, classification)
SELECT dataset_version_id, region_id, indicator_key, year::text, year, value, change, sparkline, 'observed'
  FROM regional_metrics
 WHERE dataset_version_id IS NOT NULL
ON CONFLICT (dataset_version_id, region_id, indicator_key, reference_period) DO NOTHING;

INSERT INTO national_index_observations (dataset_version_id, period, year, score, max_score, change, compared_with, band, population, regions_count, at_risk_count, ai_insight_text, ai_insight_arabic_text, classification)
SELECT dataset_version_id, period, year, score, max_score, change, compared_with, band, population, regions_count, at_risk_count, ai_insight_text, ai_insight_arabic_text, 'observed'
  FROM national_index_history
 WHERE dataset_version_id IS NOT NULL
ON CONFLICT (dataset_version_id, period) DO NOTHING;
```

Batch with `WHERE id > $last ORDER BY id LIMIT 5000` when tables exceed ~100k rows, and
run in a transaction per batch. Progress is observable by counting rows per
`dataset_version_id`.

### 3.2 Unmappable legacy rows

Rows with `dataset_version_id IS NULL` are not attributable. Do **not** invent an owner.
Move them out of the analytical path into quarantine tables that keep the original row
as JSON, with a reason:

```sql
CREATE TABLE migration_quarantine_region_observations (
  id bigserial PRIMARY KEY,
  original_table text NOT NULL,
  original_id text NOT NULL,
  payload jsonb NOT NULL,
  reason text NOT NULL,
  quarantined_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO migration_quarantine_region_observations (original_table, original_id, payload, reason)
SELECT 'regions', id, to_jsonb(r), 'no dataset_version_id; not attributable to a version'
  FROM regions r WHERE dataset_version_id IS NULL;
```

The seed/demo rows currently relied on by `syntheticDataAllowed()` fall into this bucket.
They are dev fixtures, not official data, and must not be promoted into a version.

### 3.3 Verify before switching

```sql
-- every version that can be activated must be complete
SELECT v.id,
       (SELECT count(*) FROM dataset_metadata m WHERE m.dataset_version_id = v.id) AS metadata,
       (SELECT count(*) FROM region_observations o WHERE o.dataset_version_id = v.id) AS regions,
       (SELECT count(*) FROM regional_metric_observations m WHERE m.dataset_version_id = v.id) AS metrics,
       (SELECT count(*) FROM national_index_observations n WHERE n.dataset_version_id = v.id) AS history
  FROM dataset_versions v
 ORDER BY v.uploaded_at;

-- no orphan references within a version
SELECT count(*) FROM regional_metric_observations m
 LEFT JOIN region_observations r
   ON r.dataset_version_id = m.dataset_version_id AND r.region_id = m.region_id
 WHERE r.id IS NULL;
```

Both must return complete counts / zero before M4 proceeds.

---

## 4. Phase M4 — read switch (per repository)

The active version is resolved **once per request** and passed down explicitly. See
section 6 for the resolver. No repository may query `dataset_versions.is_active`
directly after this phase.

| Repository / service | Current query (file:line) | Required change |
| --- | --- | --- |
| `overview.repository.ts` | `region.findMany({ where: { datasetVersionId: active.id } })`, `nationalIndexHistory`, `datasetMetadata` at 82/89/102 | Replace `region` reads with `region_observations` joined to stable `regions`; `nationalIndexHistory` → `national_index_observations`; `datasetMetadata.findMany()` → `findUnique({ datasetVersionId })`. Keep the existing active-version scoping and the `DATASET_NOT_CONNECTED` fail-closed path. |
| `insights.repository.ts` | 461 `sectorBreakdown` by domain, 464 `nationalIndexHistory`, 496-497 sector+region, 566 regionalMetric, 573-574 metric+region+indicator, 617 `aiRecommendation`, 662 national history, 713/716 comparison | Point every read at the observation tables with `datasetVersionId: ctx.id`; drop `region: { datasetVersionId }` relation filters (identity is now stable) and filter `regionId` only; `aiRecommendation` keeps `datasetVersionId` and gains `externalId` in the response contract if the client needs a stable key. |
| `regions.repository.ts` | **no version predicate at all**: `region.findMany({ orderBy: { rank } })`, `region.count`, `region.findUnique(id)`, `regionalMetric.findMany({ regionId })`, `datasetMetadata.findMany()`, `region.count()` for `rank_total` | `getMapPoints`: `region_observations` for this version joined to `regions`, filter `boundaryGeojson != null` on the observation. `getRegions`: filter/sort on observation columns (`rank`, `priority`), `total` from observation count for the version. `getRegionById`: identifier lookup on stable `regions` + observation for this version; `metricRows` from `regional_metric_observations`; `datasetMetadata` by this version only; `rank_total` from the version's observation count; `history.national` from `national_index_observations` (today it always returns `SEED_OVERVIEW.trend_points_7y`, which is a fixture leak). |
| `decisions.repository.ts` | `developmentProject`/`citizenReport` only (no version columns), gate via `hasApprovedActiveDataset()` | Projects and reports are operational records, not dataset observations: keep them unversioned. Replace the boolean gate with `requireActiveContext()` so the same request uses one resolved version; `simulate()` passes `ctx` to the simulator. |
| `forecast.repository.ts` | `getPredictions` (line ~573 gate), `findNationalForecasts` on unversioned `ml_forecasts`; historical actuals are hardcoded (`60.4 … 68.4`) | Gate on `ctx`; filter `ml_forecasts` by `dataset_version_id = ctx.id`; replace hardcoded actuals with `national_index_observations` for `ctx.id` (or omit the actual series when absent). A forecast with no version must not be served. |
| `simulator.service.ts` | `DatasetService.active()` at 186, then `region.findFirst({ id, datasetVersionId })` twice (lines ~196 and ~218) | Accept the resolved context instead of calling `active()`; read the baseline from `region_observations (dataset_version_id = ctx.id, region_id)` once. Output must echo `baseline_dataset_version` and stay labelled simulated. |
| `insights` recommendations (served by `aiRecommendation`) | `where: { datasetVersionId: active.id }` at 617 | Keep, plus resolve `external_id` for stable client identity; ranking and `status` stay per version so a rollback restores the earlier recommendation set. |
| `regions` historical / `insights` historical | `nationalIndexHistory` at 464/662; `regionalMetric` history in `getRegionById` | `national_index_observations` and `regional_metric_observations` filtered by `ctx.id`; never fall back to another version's series. |
| `rag.repository.ts` | `DatasetService.active()` at 156, filters `datasetVersionId` | Unchanged in shape; must receive `ctx` so retrieval cannot mix versions inside one answer. |

`DATASET_NOT_CONNECTED` continues to be the failure mode when no version is active;
no repository may fall back to seed data outside `syntheticDataAllowed()`.

---

## 5. Phase M5 — contract

Only after M4 has run in staging with two real versions and a rollback rehearsal:

```sql
-- 1. Not-null on new ownership columns, validated first
ALTER TABLE ml_forecasts ADD CONSTRAINT ml_forecasts_version_not_null CHECK (dataset_version_id IS NOT NULL) NOT VALID;
ALTER TABLE ml_forecasts VALIDATE CONSTRAINT ml_forecasts_version_not_null;
ALTER TABLE ml_forecasts ALTER COLUMN dataset_version_id SET NOT NULL;

-- 2. Recommendations: surrogate key + version-scoped identity.
-- `bigserial` has a volatile default and rewrites the whole table; an inline
-- PRIMARY KEY / UNIQUE builds its index under ACCESS EXCLUSIVE. Both are staged.
ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS external_id varchar(64);
UPDATE ai_recommendations SET external_id = id WHERE external_id IS NULL;
ALTER TABLE ai_recommendations ALTER COLUMN external_id SET NOT NULL;

CREATE SEQUENCE IF NOT EXISTS ai_recommendations_seq OWNED BY ai_recommendations.id;
ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS seq bigint;
UPDATE ai_recommendations SET seq = nextval('ai_recommendations_seq') WHERE seq IS NULL;
ALTER TABLE ai_recommendations ALTER COLUMN seq SET DEFAULT nextval('ai_recommendations_seq');
ALTER TABLE ai_recommendations ALTER COLUMN seq SET NOT NULL;

-- Build both indexes without blocking writes, then attach them.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_recommendations_seq
  ON ai_recommendations (seq);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_recommendations_version_external
  ON ai_recommendations (dataset_version_id, external_id);
ALTER TABLE ai_recommendations DROP CONSTRAINT ai_recommendations_pkey;
ALTER TABLE ai_recommendations
  ADD CONSTRAINT ai_recommendations_pkey PRIMARY KEY USING INDEX uq_recommendations_seq;
ALTER TABLE ai_recommendations
  ADD CONSTRAINT uq_recommendations_version_external UNIQUE USING INDEX uq_recommendations_version_external;
```

`id` remains as a legacy column until clients migrate; it is no longer a primary key, so
the same `id` can exist in two versions.

```sql
-- 3. Metadata: one row per version (index built concurrently, then attached)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_dataset_metadata_version
  ON dataset_metadata (dataset_version_id);
ALTER TABLE dataset_metadata
  ADD CONSTRAINT uq_dataset_metadata_version UNIQUE USING INDEX uq_dataset_metadata_version;

-- 4. Drop the transitional mirror and the version-agnostic measurement columns
ALTER TABLE dataset_versions DROP COLUMN is_active;
DROP INDEX IF EXISTS idx_dataset_versions_active;
ALTER TABLE regions   DROP COLUMN score, DROP COLUMN rank, DROP COLUMN change,
                      DROP COLUMN priority, DROP COLUMN population,
                      DROP COLUMN latitude, DROP COLUMN longitude,
                      DROP COLUMN dataset_version_id;
ALTER TABLE indicators DROP COLUMN dataset_version_id;
ALTER TABLE regional_metrics DROP COLUMN dataset_version_id;
ALTER TABLE national_index_history DROP COLUMN dataset_version_id;
ALTER TABLE sector_breakdowns DROP COLUMN dataset_version_id;
```

Drop legacy tables (`regional_metrics`, `national_index_history`, `sector_breakdowns`)
only in a later release, after the quarantine export is archived.

---

## 6. Active-version resolution per request

One resolver, one read per request:

```ts
// backend/src/services/dataset_context.service.ts (new)
export interface DatasetContext { id: string; version: string; }

export class DatasetContextService {
  static async resolve(): Promise<DatasetContext | null> {
    if (syntheticDataAllowed()) { /* explicit synthetic context, never a DB version */ }
    const row = await prisma.datasetRuntimeState.findUnique({
      where: { id: true },
      select: { activeDatasetVersionId: true,
                datasetVersion: { select: { version: true, validationStatus: true } } },
    });
    if (!row?.activeDatasetVersionId) return null;
    if (row.datasetVersion?.validationStatus !== 'validated') return null; // fail closed
    return { id: row.activeDatasetVersionId, version: row.datasetVersion.version };
  }
}
```

Rules:

* Called once per HTTP request in the route handler (or a request-scoped
  `AsyncLocalStorage` context), never inside repository loops.
* Passed as an explicit argument; no module-level cache, because activation can happen
  between requests and a stale pointer would serve a retired version.
* `null` → `DATASET_NOT_CONNECTED` for every analytical endpoint.
* A single request never mixes versions: rollback mid-request cannot produce a response
  assembled from A and B, because the id is captured once.
* The proof view `active_region_scores` is the SQL equivalent of this rule and is what
  the harness exercises.

---

## 7. Rollback strategy

| Level | Action | Cost |
| --- | --- | --- |
| Before M4 | Drop the new tables/columns added in M1; nothing reads them | Migrations are additive, so `DROP` is safe |
| During M4 | Feature flag `ANALYTICS_SOURCE=legacy\|versioned`; switch back to `legacy` | Seconds, no data loss |
| After M4, before M5 | Keep legacy columns and dual write; revert reads the same way | Seconds |
| After M5 (columns dropped) | Restore from the pre-M5 logical backup; the dual-written observation tables remain valid | Restore window |

Dataset-level rollback (the product feature) is the pointer swap: `activate_dataset(A)`
restores A's values because B never overwrote A's rows. That is precisely what the proof
harness asserts.

---

## 8. Locking and downtime analysis (revised)

The earlier claim that every phase runs without downtime was not supported by analysis and is
withdrawn. Corrected position: **no planned outage is required, but several steps take a brief
`ACCESS EXCLUSIVE` lock and can stall writes while they wait for it.** Lock *waiting*, not lock
*holding*, is the real risk on a busy table.

| Operation | Lock | Reality |
| --- | --- | --- |
| `CREATE TABLE` | none on existing tables | safe |
| `ADD COLUMN` nullable, no default | `ACCESS EXCLUSIVE` | metadata-only, ms, but queues behind open transactions |
| `ADD COLUMN` with volatile default (`bigserial`) | `ACCESS EXCLUSIVE` | **full table rewrite** — not acceptable; staged instead |
| `ADD CONSTRAINT ... NOT VALID` | `ACCESS EXCLUSIVE` | ms |
| `VALIDATE CONSTRAINT` | `SHARE UPDATE EXCLUSIVE` | scans the table, allows DML, blocks conflicting DDL |
| `CREATE INDEX CONCURRENTLY` | brief `SHARE UPDATE EXCLUSIVE`, then none | no write blocking, but can leave an INVALID index on failure |
| inline `ADD PRIMARY KEY` / `UNIQUE` | `ACCESS EXCLUSIVE` | index build blocks writes — use `CREATE UNIQUE INDEX CONCURRENTLY` + `USING INDEX` |
| `SET NOT NULL` after a validated CHECK | `ACCESS EXCLUSIVE` | ms, no scan on PostgreSQL 12+ |
| backfill batch | row locks | keep batches ≤ 5k rows and pause between batches |
| `DROP COLUMN` | `ACCESS EXCLUSIVE` | metadata-only ms, irreversible |

Required practices:

- Set `lock_timeout = '3s'` per maintenance step and retry on `55P03` rather than queueing
  behind a long-running transaction; a queued `ACCESS EXCLUSIVE` request blocks every later
  query on that table.
- Run `CREATE INDEX CONCURRENTLY` and `VALIDATE CONSTRAINT` **outside** Prisma's transactional
  migration: Prisma wraps a migration file in a transaction and holds an advisory lock, and
  `CONCURRENTLY` cannot run inside a transaction block.
- Detect failed concurrent builds (`pg_index.indisvalid = false`) and rebuild before relying on
  the index; a failed build leaves an invalid index that the planner ignores.
- Contract-step deploy order is fixed: ship code that no longer reads the column, verify, then
  drop. Dropping `is_active` while an old instance still reads it breaks that instance.

Residual windows: M5's primary-key swap, `SET NOT NULL`, and `DROP COLUMN` each need a short
exclusive lock. On a quiet table these are milliseconds; on a busy table schedule them in a low-
traffic window and accept that a write may wait for the lock. Backfill batches bound bloat and
replication lag but do not eliminate them.

The only irreversible step remains M5 (`DROP COLUMN`), gated on a staging rehearsal and a backup.

---

## 1.5 Definition and boundary history (correction, approval required)

The proof schema treats `regions` and `indicators` as stable identity, which is correct, but it
leaves their descriptive fields mutable in place. Two historical facts are therefore lost:

- an indicator's label, unit, method, or `higher_is_better` direction can change, and a value
  computed under the old definition is not directly comparable with a new one;
- an administrative boundary can change (split, merge, rename), which invalidates region-level
  history and any rendered map.

Required correction — not modelled in the proof, needed before a second definition era is
ingested:

```sql
CREATE TABLE indicator_definitions (
  indicator_key      varchar(64) NOT NULL REFERENCES indicators(key) ON DELETE RESTRICT,
  definition_version varchar(32) NOT NULL,
  label              varchar(100) NOT NULL,
  arabic_label       varchar(100) NOT NULL,
  unit               varchar(32) NOT NULL,
  higher_is_better   boolean NOT NULL,
  method_note        text,
  effective_from     date NOT NULL,
  effective_to       date,
  PRIMARY KEY (indicator_key, definition_version),
  CONSTRAINT indicator_definitions_no_overlap EXCLUDE USING gist (
    indicator_key WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  )
);

CREATE TABLE region_boundaries (
  region_id         varchar(64) NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  boundary_version  varchar(32) NOT NULL,
  geometry_geojson  jsonb NOT NULL,
  effective_from    date NOT NULL,
  effective_to      date,
  PRIMARY KEY (region_id, boundary_version),
  CONSTRAINT region_boundaries_no_overlap EXCLUDE USING gist (
    region_id WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  )
);
```

`regional_metric_observations.indicator_definition_version` and
`region_observations.boundary_version` then reference the definition used at ingest. A comparison
across a definition era is refused or explicitly labelled, never silently computed.

Without these tables the model is still correct for version isolation and rollback; it is **not**
sufficient for long-horizon comparability, which is why this is recorded as a required correction
before the proof is treated as complete for production use.

## 1.6 Activation scope (decision)

A single global pointer is correct for the product as it exists today: one national dataset family,
one geography. It is wrong as a permanent model, because a second family (for example a
health-facility dataset) or a second geography would make two datasets fight over one pointer.

Decision: keep one active pointer now, but give it an explicit key so widening is additive:

```sql
ALTER TABLE dataset_versions ADD COLUMN dataset_family varchar(64) NOT NULL DEFAULT 'national_index';

CREATE TABLE dataset_runtime_state (
  dataset_family            varchar(64) NOT NULL,
  scope_key                 varchar(64) NOT NULL DEFAULT 'national',
  active_dataset_version_id varchar(64) REFERENCES dataset_versions(id) ON DELETE RESTRICT,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dataset_family, scope_key)
);
```

Activation locks and updates the row for `(version.dataset_family, 'national')`, and the active
views join on that key. `dataset_activation_events` records the family and scope alongside the
previous pointer.

The proof keeps the single-row form (`id boolean`) because its purpose is version isolation, not
scope taxonomy. The family/scope key is a migration-plan requirement to resolve before M4. Approval
needed: the family taxonomy, and whether a sector dataset may be active at the same time as the
national index.

## 1.7 Foreign-key and uniqueness audit (findings)

Correct in the proof model: observation → version (`RESTRICT`), observation → stable region /
indicator (`RESTRICT`), one row per `(version, region, indicator, period)`, one metadata row per
version, one recommendation per `(version, external_id)`, one pointer row.

Gaps to close in the real migration:

1. **No lineage to raw evidence.** Observation rows reference the version but not the
   `dataset_records` row they came from. Add nullable `dataset_record_id` with
   `ON DELETE RESTRICT` to all four observation tables, so a value can be traced to its raw
   record without re-parsing the file.
2. **`ml_forecasts.indicator_id` has no FK** to `indicators(key)`, and its default
   `development_index` is not guaranteed to exist in the catalog. Add the FK only after the
   catalog guarantees that row, otherwise the migration fails on existing data.
3. **`rag_documents` lacks a version-scoped identity.** Add `UNIQUE(dataset_version_id,
   external_id)`; without it a re-ingest can duplicate a document inside one version.
4. **`dataset_activation_events` omits scope.** With §1.6 it must record `dataset_family` and
   `scope_key`, or an audit trail cannot be reconstructed per family.
5. **Forecasts need a stated owner.** A forecast must belong to a dataset version *and* a model
   run; `model_version` alone does not identify the training input. Add `model_run_id` when the
   ML pipeline starts recording runs.

## 9. Migration acceptance criteria (not yet met)

1. Proof harness green on an isolated PostgreSQL instance — **met 2026-11-05**: 24/24 assertions
   passed on PostgreSQL 18.6 against disposable database `decidix_proof_20261105a` (dropped after
   the run). Criteria 2–6 remain unmet.
2. Two version-tagged datasets exist in staging; A→B→A verified through the HTTP API,
   not only SQL.
3. Backfill counts reconcile: per version, observation counts equal the source row counts
   plus quarantined rows.
4. Concurrent activation produces one pointer and two audit events under load.
5. Rollback rehearsal completes within the agreed window.
6. No analytical endpoint returns rows from more than one `dataset_version_id`
   (assert per response in tests).
