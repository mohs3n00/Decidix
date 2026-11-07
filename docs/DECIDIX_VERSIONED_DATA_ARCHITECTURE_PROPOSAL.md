# Decidix Versioned Data Architecture Proposal

**Status:** Proposal only — owner approval required before schema or application changes  
**Date:** 2026-11-04  
**Scope:** Multi-version analytical datasets, activation, rollback, provenance, and RAG ownership  
**Safety:** No application code, migration, database, deployment, or live environment was changed

## 1. Executive decision

`Region` and `Indicator` should be stable reference entities. Measurements and all
dataset-derived outputs should be immutable, version-owned rows. A `DatasetVersion` is
the unit of ingestion, validation, activation, rollback, provenance, and RAG ownership.

The current nullable `dataset_version_id` columns on `regions` and `indicators` should
not be extended. They conflate identity with observations and cannot support two versions
containing the same region or indicator key. The current global
`RegionalMetric(region_id, indicator_key, year)` uniqueness constraint has the same
problem.

The proposed architecture preserves old rows and supports:

1. Dataset A and Dataset B existing simultaneously.
2. Atomic switching of the active version.
3. Rollback by switching the active pointer, not deleting or rewriting observations.
4. Stable foreign keys from projects, citizen reports, users, and community interactions.
5. Exact version matching for analytical APIs and RAG evidence.

No PostgreSQL integration test has been run or claimed. This proposal is based on source
review only.

## 2. Existing implementation and findings

### Current schema

- `Region.id` is the primary key and currently contains both catalogue attributes and
  analytical values such as rank, score, priority, and population.
- `Indicator.key` is the primary key and contains catalogue attributes.
- `RegionalMetric` references `Region` and `Indicator` and has
  `UNIQUE(region_id, indicator_key, year)`.
- `NationalIndexHistory`, `SectorBreakdown`, `AiRecommendation`, `DatasetMetadata`, and
  `RagDocument` have nullable `dataset_version_id` columns.
- `DatasetRecord` has a required version relationship and cascades on version deletion.
- `RagDocument.region_id` still points directly to the globally keyed `Region`.
- `DevelopmentProject` and `CitizenReport` point directly to `Region`.

### Current service and query findings

- `DatasetService.ingest` currently expects a canonical payload and writes raw records,
  metadata, regions, indicators, national history, regional metrics, sector breakdowns,
  recommendations, and RAG documents in one Prisma transaction.
- It rejects region/indicator keys already assigned to another version. This is safe
  against overwriting but prevents legitimate A/B coexistence.
- `activate` clears `is_active` on all active versions and sets the candidate active.
  It does not currently prove completeness, enforce a single active row at the database
  level, or record a durable activation/rollback audit.
- `OverviewRepository` and parts of `RegionsRepository` still query regions/history
  without exact active-version predicates in the current implementation.
- `ForecastRepository` does not currently attach forecasts to a dataset version.
- Test-mode repositories intentionally retain in-memory/seed fixtures; these must remain
  test-only and cannot be used as evidence for production lineage.

## 3. Proposed ERD

```text
DatasetVersion
  1 ├── DatasetSource / DatasetValidation / DatasetActivation
    ├── DatasetRecord
    ├── DatasetMetadata
    ├── RegionObservation ── N:1 ── Region
    ├── IndicatorObservation ── N:1 ── Indicator
    ├── NationalIndexObservation
    ├── RegionalMetricObservation ── N:1 ── Region
    │                              └─ N:1 ── Indicator
    ├── SectorBreakdownObservation
    ├── Recommendation ── N:1 ── Region (stable reference)
    ├── Forecast ── N:1 ── Region (nullable)
    │           └─ N:1 ── Indicator (or stable indicator key)
    └── RagDocument ── N:1 ── Region (nullable)
                    └─ N:1 ── DatasetVersion (required)

Region
  1 ├── DevelopmentProject
    ├── CitizenReport
    ├── RegionObservation
    ├── RegionalMetricObservation
    ├── Recommendation
    └── RagDocument

Indicator
  1 ├── IndicatorObservation
    └── RegionalMetricObservation

DatasetActivation
  N ── 1 DatasetVersion
  records active_version_id, previous_version_id, actor, reason, timestamp
```

### Ownership rule

Every analytical observation or derived output has exactly one non-null
`dataset_version_id`. Stable reference rows do not belong to a dataset version.
References to a stable `Region` or `Indicator` identify what was measured; the
version-owned observation identifies which dataset supplied the value.

## 4. Proposed Prisma models

Names are illustrative and require review against existing naming conventions.

```prisma
model Region {
  id              String   @id @db.VarChar(64)
  code            String   @unique @db.VarChar(64)
  name            String   @db.VarChar(100)
  arabicName      String   @map("arabic_name") @db.VarChar(100)
  level           String   @db.VarChar(32)
  parentId        String?  @map("parent_id") @db.VarChar(64)
  geometryGeojson Json?    @map("geometry_geojson")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  parent              Region?
  children            Region[]
  projects            DevelopmentProject[]
  reports             CitizenReport[]
  observations        RegionObservation[]
  regionalMetrics     RegionalMetricObservation[]
  recommendations     Recommendation[]
  ragDocuments        RagDocument[]
}

model Indicator {
  key               String   @id @db.VarChar(64)
  label             String   @db.VarChar(100)
  arabicLabel       String   @map("arabic_label") @db.VarChar(100)
  domain            String   @db.VarChar(32)
  unit              String   @db.VarChar(32)
  higherIsBetter     Boolean  @default(true) @map("higher_is_better")
  definitionVersion  String?  @map("definition_version") @db.VarChar(64)

  observations    IndicatorObservation[]
  regionalMetrics RegionalMetricObservation[]
}

model RegionObservation {
  id              BigInt   @id @default(autoincrement())
  datasetVersionId String   @map("dataset_version_id") @db.VarChar(64)
  regionId        String   @map("region_id") @db.VarChar(64)
  rank            Int?
  score           Decimal? @db.Decimal(10, 2)
  change          Decimal? @db.Decimal(10, 2)
  priority        String?  @db.VarChar(32)
  population      Int?
  latitude        Decimal? @db.Decimal(9, 6)
  longitude       Decimal? @db.Decimal(9, 6)
  boundaryGeojson Json?    @map("boundary_geojson")

  datasetVersion DatasetVersion @relation(fields: [datasetVersionId], references: [id], onDelete: Restrict)
  region         Region         @relation(fields: [regionId], references: [id], onDelete: Restrict)

  @@unique([datasetVersionId, regionId])
  @@index([regionId, datasetVersionId])
}

model IndicatorObservation {
  id              BigInt  @id @default(autoincrement())
  datasetVersionId String  @map("dataset_version_id") @db.VarChar(64)
  indicatorKey    String  @map("indicator_key") @db.VarChar(64)
  sourceLabel     String? @map("source_label") @db.VarChar(255)

  datasetVersion DatasetVersion @relation(fields: [datasetVersionId], references: [id], onDelete: Restrict)
  indicator      Indicator       @relation(fields: [indicatorKey], references: [key], onDelete: Restrict)

  @@unique([datasetVersionId, indicatorKey])
  @@index([indicatorKey, datasetVersionId])
}

model RegionalMetricObservation {
  id              BigInt   @id @default(autoincrement())
  datasetVersionId String   @map("dataset_version_id") @db.VarChar(64)
  regionId        String   @map("region_id") @db.VarChar(64)
  indicatorKey    String   @map("indicator_key") @db.VarChar(64)
  referencePeriod String   @map("reference_period") @db.VarChar(32)
  year            Int
  value           Decimal  @db.Decimal(18, 6)
  change          Decimal? @db.Decimal(18, 6)
  sparkline       Json?
  classification  String   @db.VarChar(32) // observed | derived | simulated

  datasetVersion DatasetVersion @relation(fields: [datasetVersionId], references: [id], onDelete: Restrict)
  region         Region         @relation(fields: [regionId], references: [id], onDelete: Restrict)
  indicator      Indicator       @relation(fields: [indicatorKey], references: [key], onDelete: Restrict)

  @@unique([datasetVersionId, regionId, indicatorKey, referencePeriod])
  @@index([datasetVersionId, regionId, indicatorKey, year])
}
```

Additional version-owned models should follow the same pattern:

- `NationalIndexObservation`: required version, period, score, population, counts,
  classification.
- `SectorBreakdownObservation`: required version, sector/key, period, value, unit,
  classification.
- `Recommendation`: required version, stable region, evidence references, method,
  confidence classification, and status.
- `DatasetMetadata`: one row per version, with a unique `dataset_version_id`.
- `Forecast`: required version for forecasts derived from a dataset, model artifact
  identifier, training window, target period, and explicit experimental/validated status.
- `RagDocument`: required version, source observation/document IDs, content hash,
  embedding model/version, and retrieval metadata.

The existing `Region` fields `rank`, `score`, `change`, `priority`, `population`, and
coordinates should move to `RegionObservation`; they are not stable geography attributes.

## 5. Constraints and indexes

### Required constraints

- Exactly one stable region code per administrative entity.
- Exactly one stable indicator key per indicator definition.
- Every version-owned observation has a non-null `dataset_version_id`.
- Every observation references an existing stable region/indicator where applicable.
- Every version has at most one metadata row.
- Every version-owned logical observation is unique within its version:
  - `(dataset_version_id, region_id)` for region observations.
  - `(dataset_version_id, region_id, indicator_key, reference_period)` for regional metrics.
  - `(dataset_version_id, period)` for national history.
  - `(dataset_version_id, sector, key, reference_period)` for sector breakdowns.
- `DatasetVersion` has at most one active row through a partial unique index:

```sql
CREATE UNIQUE INDEX dataset_versions_one_active
ON dataset_versions ((is_active))
WHERE is_active = TRUE;
```

- Activation state should additionally be represented by a singleton
  `dataset_runtime_state` row whose `active_dataset_version_id` references
  `DatasetVersion`, avoiding race-prone global scans.

### Deletion behavior

- `DatasetVersion` and all evidence/observations use `ON DELETE RESTRICT`.
- Deactivation and superseding are state transitions, not deletes.
- Raw objects and rows are retained according to an approved retention policy.
- Stable regions, indicators, projects, reports, users, and likes are never deleted as a
  side effect of retiring a dataset.

## 6. SQL migration outline

This is an outline only, not an executable migration.

1. Create stable-reference columns/tables and backfill canonical region codes and
   indicator definitions from owner-approved catalogues.
2. Create new version-owned observation tables with required foreign keys and indexes.
3. Create `dataset_runtime_state` and `dataset_activation_events`.
4. Copy only verifiable existing rows into new observation tables with their existing
   `dataset_version_id`.
5. Leave rows with null/unknown version in legacy tables or quarantine tables; do not
   guess their provenance.
6. Add validation queries that count:
   - null version observations;
   - orphan references;
   - duplicate logical observations within a version;
   - missing required tables for each candidate version.
7. Dual-read or shadow-read new tables in a controlled test environment.
8. Switch analytical repositories to new tables behind a reviewed compatibility boundary.
9. Add `NOT NULL` constraints only after the null-row remediation report is approved.
10. Retire old analytical columns/tables only in a later migration after rollback
    evidence and owner approval.

Applied migrations must never be edited in place. The redesign must be additive and
forward-only.

## 7. Legacy data handling

Legacy rows without a dataset version are **unverified**, not automatically assigned to
the current active dataset.

Recommended states:

- `legacy_unmapped`: retained for audit, excluded from production analytical reads.
- `test_fixture`: retained only in test fixtures and never exposed by production mode.
- `verified_migrated`: copied to a new version only after source, period, geography,
  and licence evidence is established.

Legacy projects and citizen reports continue to reference stable `Region.id`. Their
relationship is operational/community data, not analytical dataset evidence. If a
report needs an analytical snapshot, add an optional explicit `dataset_version_id` to
that derived linkage rather than changing the report's stable region relationship.

## 8. API and repository query changes

All analytical repository methods should resolve a `DatasetContext` once per request:

```text
{ datasetVersionId, source, sourceFile, licence, coverage, status }
```

They must then use that exact ID in every observation query. A global active check is
not sufficient.

Required query patterns:

- Overview: `NationalIndexObservation` and `RegionObservation` filtered by context ID.
- Regions/map: stable `Region` joined through version-matched `RegionObservation`.
- Sector insights: version-matched indicator definitions, metrics, and region
  observations.
- Historical: version-matched national or regional observations only.
- Priority/data quality/comparisons: version-matched observations and metadata only.
- Recommendations: recommendation version equals context ID and evidence references
  belong to the same context.
- Simulator: baseline observations must come from the selected version; output is
  explicitly `simulated` and references the baseline version.
- Forecasts: version-scoped training data and forecast rows; no unscoped forecast
  response in production.
- RAG: `WHERE dataset_version_id = context.datasetVersionId` before similarity or
  lexical ranking.

Requests may optionally accept a reviewed version selector for analyst/admin workflows,
but public clients should default to the atomically selected active version. The
response must include dataset version and provenance.

## 9. Activation and rollback transaction

Activation must be a database transaction with serialization protection:

1. Lock the singleton runtime-state row (`SELECT ... FOR UPDATE`).
2. Lock the candidate `DatasetVersion`.
3. Confirm candidate status is `validated`/`approved`, not rejected or incomplete.
4. Run completeness checks:
   - required metadata exists;
   - every required canonical table has rows;
   - all references resolve;
   - all rows carry the candidate version;
   - RAG documents, if required, carry the same version;
   - no duplicate logical keys exist.
5. Record the current active version as `previous_dataset_version_id`.
6. Update the singleton runtime-state active pointer.
7. Mark the candidate active and the previous version superseded in the same transaction.
8. Insert an activation event with actor, reason, validation summary, and timestamp.
9. Commit.

Rollback is the same transaction with the prior version as candidate. It does not delete
or rewrite either version. If activation fails, the transaction rolls back and the
previous active pointer remains unchanged.

The service must not implement activation as an unprotected
`updateMany(isActive=false)` followed by a separate update.

## 10. RAG ownership and version proof

Each `RagDocument` must have:

- required `dataset_version_id`;
- stable source/document identity;
- source observation IDs or a version-owned lineage manifest;
- source file/hash and reference period;
- embedding provider, model, dimensions, and content hash.

Ingestion must create the source observations and RAG documents in one transaction, or
stage both and publish them together. A database validation query should prove:

```sql
SELECT d.id
FROM rag_documents d
LEFT JOIN dataset_records r
  ON r.dataset_version_id = d.dataset_version_id
WHERE d.dataset_version_id IS NULL
   OR r.dataset_version_id IS NULL;
```

For documents generated from canonical observations, add an explicit
`rag_document_sources(document_id, dataset_version_id, observation_id, source_hash)`
table. Retrieval must filter the document version before ranking, and answer validation
must reject citations whose document version differs from the request context.

## 11. Preservation of existing relationships

- `DevelopmentProject.region_id` continues to reference stable `Region.id`.
- `CitizenReport.region_id` continues to reference stable `Region.id`.
- `CitizenReportLike` remains independent community interaction data and is not
  dataset-gated.
- `User`, session, device-token, audit-log, and authorization relationships are
  unchanged.
- Dataset-derived recommendation and forecast rows reference stable entities plus an
  immutable version, preventing historical outputs from changing when a new dataset
  becomes active.

## 12. Risks and compatibility assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Existing `Region` rows mix geography and measurements | High | Split stable/reference fields from version observations |
| Existing global metric uniqueness | High | Replace with version-aware uniqueness |
| Null legacy mappings | High | Quarantine/exclude; never infer provenance |
| Projects/reports rely on region rows | High | Preserve stable region IDs and backfill references before split |
| RAG documents lack source-observation links | High | Add required version and lineage manifest |
| Existing clients expect flat region scores | Medium | Preserve API shape while resolving values from observations |
| Activation race conditions | High | Singleton pointer, row lock, partial unique index |
| Dataset deletion removes raw evidence | High | `RESTRICT`, retention policy, no cascade for evidence |
| Forecasts are currently unversioned | High | Add version ownership before production forecast reads |
| Large additive migration | Medium | Expand/ backfill/validate/switch/contract sequence |

## 13. Required integration tests

Before implementation can be accepted, an isolated PostgreSQL test database must prove:

1. Dataset A and B contain the same stable region and indicator keys.
2. A and B can both store metrics for the same region/indicator/period.
3. Active A returns only A observations.
4. Switching to B returns only B observations.
5. Rolling back to A restores A without deleting B.
6. Rejected, pending, and unmapped versions return unavailable.
7. Missing version relationships never leak into responses.
8. Duplicate logical observations fail constraints.
9. Activation fails atomically when any required table is incomplete.
10. Concurrent activation leaves exactly one active version.
11. RAG retrieval cannot return a document from another version.
12. Citations contain only retrieved evidence from the selected version.
13. Projects, reports, users, likes, and stable region joins remain intact.
14. Legacy unmapped rows remain retained but excluded from production reads.
15. Forecasts and simulator baselines carry the selected dataset version.

## 14. Approval gates before implementation

Owner approval is required for:

- canonical administrative geography and stable codes;
- indicator identity and definition versioning policy;
- whether forecasts are versioned by source dataset, model run, or both;
- retention and deletion policy for raw and derived evidence;
- required canonical tables for activation completeness;
- public API behavior for active-version selection;
- migration window, rollback procedure, and staging PostgreSQL test instance.

Until these decisions and the PostgreSQL integration tests are complete, DatasetVersion
integration remains `IMPLEMENTED_UNVERIFIED`, and Phases 9 and 10 remain blocked.

## 15. Review corrections — model v2 (2026-11-04)

This section records where the original proposal disagreed with the code, and what the final
model changes. It supersedes the corresponding earlier text; the rest still stands.

### 15.1 Corrections to the original proposal

1. **Overview scoping is no longer an open defect.** Section 2 listed `OverviewRepository` as
   version-blind. It was fixed in the previous pass: `getOverview` now filters
   `national_index_history`, `regions` and the trend query by `datasetVersionId: active.id`.
   The remaining unversioned reads are `RegionsRepository` (none at all), forecast actuals
   (hardcoded), and `MlForecast` (no version column).
2. **`is_active` and `dataset_runtime_state` must not both be authoritative.** Keeping the
   boolean as a second source of truth reintroduces the split-brain the design is meant to
   remove. Final model: `dataset_runtime_state` is the single pointer. `is_active` survives
   only as a one-way mirror written in the same activation transaction, and is dropped in the
   contract phase.
3. **`AiRecommendation` needs a surrogate key.** Its `id` is a global primary key, so the same
   logical recommendation in versions A and B collides. Final model: `bigserial` primary key +
   `UNIQUE(dataset_version_id, external_id)`; the legacy `id` becomes `external_id`.
4. **`DatasetRecord` must not cascade.** `dataset_records.dataset_version_id` is`ON DELETE CASCADE`.
   Raw evidence would vanish with the version row. Final model: `ON DELETE RESTRICT`.
5. **`DatasetMetadata` needs `UNIQUE(dataset_version_id)`.** Today nothing prevents two metadata
   rows for one version; the service works around it with a composite id.
6. **`Classification` must be explicit, not defaulted to `observed`.** Observation rows carry
   `classification IN ('observed','derived','simulated')`; a missing value is a validation error,
   never silently `observed`.
7. **`reference_period` and `year` are both required.** Uniqueness uses the ingested identity
   (`reference_period`); `year` exists so range queries keep their current index shape.
8. **The partial unique index is a backstop, not the mechanism.** It constrains the transitional
   mirror. Concurrency is prevented by `SELECT ... FOR UPDATE` on the singleton; the audit trail
   comes from `dataset_activation_events`.

### 15.2 Exact artifacts

- DDL, activation function and analytical views: `backend/prisma/proof/001_schema.sql`.
- Clearly labelled synthetic fixtures A/B: `backend/prisma/proof/002_fixtures.sql`.
- Pure safety guards (loopback host, proof-database prefix, app-database match, owned-only
  cleanup), unit-tested without a database: `backend/prisma/proof/guard.mjs` and
  `backend/tests/proof_guard.test.ts`.
- Executable A→B→A harness (real `pg`, no Prisma mocks, 24 separately reported assertions):
  `backend/prisma/proof/run_proof.mjs`.
- Run instructions, guards, and PowerShell setup: `backend/prisma/proof/README.md`.
- Expand/backfill/switch/contract plan and per-repository query changes:
  `docs/DECIDIX_VERSIONED_MIGRATION_PLAN.md`.

### 15.3 Proof status

The proof harness was executed **2026-11-05 on PostgreSQL 18.6: 24/24 proof assertions
passed** against an isolated loopback disposable database (`decidix_proof_20261105a`,
dropped after the run; pre-existing-schema refusal and owned-only cleanup verified live).

The M1 additive migration was then generated and executed in rehearsal on the same day:
**304/304 assertions across four disposable databases** (`empty`, `legacy`, `versioned`,
`unattributable`), including legacy-row preservation, constraint behaviour, failure and
rollback. See `docs/DECIDIX_VERSIONED_MIGRATION_PLAN.md`, §11 of
`docs/DECIDIX_RECOVERY_STATUS.md`, and `backend/prisma/m1/README.md`. Neither result is
approval to migrate staging or production.

## 16. Pre-proof architecture review (2026-11-04)

A second review, before any provisioning, found three things the model must correct or explicitly
defer. Full DDL and rationale are in `docs/DECIDIX_VERSIONED_MIGRATION_PLAN.md` §1.5–1.7 and §8.

1. **Definitions and boundaries are not versioned.** Indicator label/unit/direction and administrative
   geometry can change over time, and values computed under different definitions are not
   comparable. Required correction: `indicator_definitions` and `region_boundaries` with effective
   dates and an exclusive-overlap constraint, plus definition/boundary references on the observation
   rows. Version isolation works without them; historical comparability does not.
2. **One global active pointer is correct only for one dataset family and geography.** Keep it now,
   but key it: `dataset_runtime_state(dataset_family, scope_key)` with `dataset_family` on versions.
   Approval needed on the family taxonomy and on whether sector datasets may be active alongside the
   national index.
3. **The no-downtime claim was unsupported.** Several steps take brief `ACCESS EXCLUSIVE` locks and,
   more importantly, can queue behind long transactions; `bigserial` and inline `UNIQUE`/`PRIMARY KEY`
   are table rewrites or exclusive index builds and were removed from the plan. Corrected stance: no
   planned outage, explicit `lock_timeout` + retry, concurrent index builds outside Prisma's
   transactional migration, fixed deploy ordering for every contract step.

Also recorded there: missing raw-record lineage on observation rows, the absent
`ml_forecasts.indicator_id` FK, missing `UNIQUE(dataset_version_id, external_id)` on RAG documents,
and the need to record family/scope in activation events.

Until these are resolved or explicitly deferred by the owner, the versioned model remains
`IMPLEMENTED_UNVERIFIED` and the proof result alone is not approval to migrate.
