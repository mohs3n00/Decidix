# M1 additive migration — runbook and rehearsal record

Forward SQL for the versioned-model foundation (proposal v2). Everything here is
**additive**: the running application does not read or write any of these objects yet.

| File | Role | Transactional |
| --- | --- | --- |
| `001_schema.sql` | tables, columns, FKs, functions, activation pointer | yes |
| `002_backfill.sql` | catalog-era capture, external ids, quarantine copies | yes |
| `003_indexes.sql` | FK validation + `CONCURRENTLY` index builds | no (per statement) |
| `004_optional_exclusions.sql` | `btree_gist` no-overlap constraints | yes, optional |
| `005_rollback.sql` | reverses 001–004, restores the legacy shape | yes |
| `fixtures/legacy_rows.sql` | version-less legacy rows (`test-only`) | — |
| `fixtures/versioned_rows.sql` | version-tagged legacy rows + raw records | — |
| `fixtures/versioned_m1_metadata.sql` | assigns `dataset_family`/`bundle_key` after 001 | — |
| `run_rehearsal.mjs` | executes all of the above against real PostgreSQL | — |
| `guard.mjs` | pure guards, script audit, statement splitter | — |

## Status: executed on PostgreSQL 18.6 (2026-11-05)

`node prisma/m1/run_rehearsal.mjs` → **304/304 assertions passed**,
`M1 REHEARSAL PASSED against real PostgreSQL`, exit 0. Server:
`PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`.
Report: `prisma/m1/rehearsal-report.json` (no credentials).

**Not applied to any project, staging or production database.** The application
database configured in `backend/.env` was never read by the runner (source contains no
`process.env.DATABASE_URL`, and a run with a poisoned sentinel `DATABASE_URL` passed).

## The four planned database states

Each state is a fresh disposable database built from the ten legacy Prisma migrations,
then seeded differently:

| State | Seed | Quarantine rows | Purpose |
| --- | --- | --- | --- |
| `empty` | none | 0 | schema-only rollout |
| `legacy` | `legacy_rows.sql` | 8 | every analytical row has NULL provenance |
| `versioned` | `legacy_rows.sql` + `versioned_rows.sql` | 1 | validated/unvalidated versions, bundle, raw records |
| `unattributable` | `legacy_rows.sql` + validated versions that own no rows | 8 | versions exist but the data cannot be attributed — quarantine must not guess |

## Safety contract

| Rule | Enforcement |
| --- | --- |
| Target from `M1_ADMIN_URL` only | must be a loopback maintenance DB (`postgres`/`template1`) |
| Disposable databases only | every DB matches `^decidix_m1_[a-z0-9_]+$`, is created by this run, and is dropped in a `finally` block |
| Unique names | `<state>` suffixed with UTC stamp + random hex; refuses to reuse an existing DB |
| Never the app database | the runner never reads `DATABASE_URL` or `backend/.env` |
| No credential leakage | passwords are redacted from every message and error path |
| Owned cleanup only | a defensive sweep drops only `decidix_m1_<this run>_*` |

## Run

```powershell
$env:Path = "E:\programer;E:\PostgreSQL\bin;$env:Path"      # node + psql
$env:M1_ADMIN_URL = "postgresql://postgres:<password>@127.0.0.1:5432/postgres"
$env:M1_REPORT_PATH = "E:\decidix_app\backend\prisma\m1\rehearsal-report.json"
cd E:\decidix_app\backend
node prisma/m1/run_rehearsal.mjs
```

Exit codes: `0` all assertions passed, `1` an assertion failed, `2` a guard refused.

## What the 304 assertions cover

* **Migration syntax/semantics** — 001 and 002 commit, 003 applies statement-by-statement,
  004 applies (`btree_gist` present), in all four states.
* **Legacy preservation** — all 15 legacy tables are fingerprinted (row count + md5 over
  the *original* column list) before M1 and compared after it. New columns are excluded
  from the hash because M1 legitimately adds `external_id`/`seq`; no legacy row changes.
* **Backfill discipline** — catalog eras captured once, external ids populated, no
  observation invented (that is M3), quarantine count equals the NULL-provenance rows.
* **Versioned definitions** — one open era per indicator (`23505`), reversed era
  (`23514`), observation referencing an unknown definition era (`23503`).
* **Boundary history** — one open era per region (`23505`), unknown boundary era
  (`23503`), self-relation and bad relation type (`23514`).
* **Bundle activation** — validated activation returns the pointer, sets the single
  `is_active` mirror, writes an audit row; unvalidated version (`23514`), blank actor
  (`22023`), missing version (`23503`), bundle with an unvalidated member (`23514`),
  two same-family versions in one bundle (`23505`).
* **Observation-source lineage** — same-version link clean, cross-version link detected
  by `report_lineage_version_mismatches()`, orphan detected, duplicate link (`23505`),
  deleting a record or version that owns evidence (`23001`, the M1 `RESTRICT` FK).
* **Failure/rollback** — 001 refuses a non-legacy database and leaves nothing; an
  injected failure (`22012`) inside 001+002 rolls both back and leaves legacy unchanged;
  a failing `CREATE UNIQUE INDEX CONCURRENTLY` leaves an `INVALID` index (visible, not
  silently half-valid) while earlier statements stay applied.
* **Down migration** — apply M1 then `005_rollback.sql`: all M1 tables/columns/functions
  disappear, the `dataset_records` FK returns to `ON DELETE CASCADE`, and every legacy
  table and row is unchanged.

## Known limits (deliberate)

* `003` is not transactional (`CONCURRENTLY`). A failure is fail-visible: earlier
  statements stay applied and a failed unique build leaves an `INVALID` index that must
  be dropped and rebuilt after reconciling duplicates — never by deleting rows.
* `004` is optional: without `btree_gist` privileges, M1 still guarantees one *open* era
  per key; closed-era overlap is prevented by the ingest transaction from M2.
* Prisma cannot express CHECK constraints, partial unique indexes or `EXCLUDE`
  constraints. They live only in this SQL. `prisma migrate diff` leaves them untouched
  (verified: 0 `DROP INDEX`, 0 `CHECK`, 0 `DROP TABLE/COLUMN`), but it *does* reconcile
  foreign keys — which is why `DatasetRecord.datasetVersion` is `onDelete: Restrict` in
  `schema.prisma` to match `001`. Never run `prisma migrate dev` against a database that
  has had M1 applied.

## Defects found by the real execution and fixed

1. `guard.splitStatements` split on a semicolon inside a comment ("an INVALID index;
   check pg_index…"), so 003 was executed as a broken statement. Comments are now
   stripped before splitting.
2. `fixtures/versioned_rows.sql` referenced `dataset_family`/`bundle_key`, which 001 adds
   — it failed before M1. The fixture is now legacy-only; the metadata is applied between
   001 and 002 by `fixtures/versioned_m1_metadata.sql`.
3. `activate_dataset_bundle()` raised `42702` (`dataset_family` is ambiguous between the
   `RETURNS TABLE` parameter and the column). Fixed with `#variable_conflict use_column`
   plus explicit table aliases.
4. `schema.prisma` declared `DatasetRecord.datasetVersion` as `onDelete: Cascade`, which
   contradicts the M1 `RESTRICT` evidence FK. Changed to `Restrict`.
