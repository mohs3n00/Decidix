#!/usr/bin/env node
// ============================================================================
// Decidix M1 — migration rehearsal runner (REAL PostgreSQL, disposable DBs)
//
// Executes the M1 SQL (001_schema, 002_backfill, 003_indexes, optional 004)
// against the FOUR planned database states:
//
//   empty           legacy schema, no rows
//   legacy          legacy schema + fixtures/legacy_rows.sql (NULL provenance)
//   versioned       legacy_rows.sql + fixtures/versioned_rows.sql
//   unattributable  legacy_rows.sql + validated versions that own no
//                   analytical rows yet (proves quarantine never guesses)
//
// For every state it proves:
//   * the migration SQL executes (syntax + semantics) on PostgreSQL;
//   * every legacy table and row is byte-for-byte unchanged;
//   * versioned definitions, boundary history, bundle activation and
//     observation-source lineage constraints actually fire.
//
// It then runs a separate failure/rollback phase proving that a failing
// migration does not leave half-applied schema behind.
//
// Safety contract
//   * the only connection input is M1_ADMIN_URL, a loopback maintenance
//     database (`postgres` or `template1`); the application DATABASE_URL and
//     backend/.env are NEVER read by this script;
//   * every database is created by this run with a unique name matching
//     ^decidix_m1_[a-z0-9_]+$ and dropped in a finally block;
//   * no existing database, schema, table or row outside those databases is
//     touched, and the runner refuses non-loopback hosts.
//
// Usage
//   $env:M1_ADMIN_URL = "postgresql://postgres:<pass>@127.0.0.1:5432/postgres"
//   node prisma/m1/run_rehearsal.mjs
//
// Exit codes: 0 all assertions passed, 1 an assertion failed, 2 guard refused.
// ============================================================================

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { LEGACY_TABLES, M1_NEW_TABLES, auditScripts, splitStatements } from './guard.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const prismaRoot = join(here, '..');
const migrationsDir = join(prismaRoot, 'migrations');

const read = (path) => readFileSync(path, 'utf8');

const SQL = {
  schema: read(join(here, '001_schema.sql')),
  backfill: read(join(here, '002_backfill.sql')),
  indexes: read(join(here, '003_indexes.sql')),
  optional: read(join(here, '004_optional_exclusions.sql')),
  rollback: read(join(here, '005_rollback.sql')),
  legacyRows: read(join(here, 'fixtures', 'legacy_rows.sql')),
  versionedRows: read(join(here, 'fixtures', 'versioned_rows.sql')),
  versionedMetadata: read(join(here, 'fixtures', 'versioned_m1_metadata.sql')),
};

// Validated versions that own no analytical rows: the "unattributable" state.
// Runs before M1, so it may only use legacy columns; dataset_family falls back
// to the 001 column default.
const VERSIONS_ONLY_SQL = `
INSERT INTO dataset_versions
  (id, version, filename, object_key, checksum_sha256, format, source, license, coverage,
   validation_status, validated_at, record_count, is_active, created_by)
VALUES
  ('ver-a', 'v-a', 'a.json', 'datasets/a.json', repeat('a', 64), 'json', 'Synthetic fixture',
   'internal', 'national', 'validated', now(), 0, false, 'fixture'),
  ('ver-b', 'v-b', 'b.json', 'datasets/b.json', repeat('b', 64), 'json', 'Synthetic fixture',
   'internal', 'national', 'validated', now(), 0, false, 'fixture');
`;

const STATES = ['empty', 'legacy', 'versioned', 'unattributable'];
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const DB_NAME_PATTERN = /^decidix_m1_[a-z0-9_]+$/;

// ---------------------------------------------------------------------------
// Guards. The application DATABASE_URL is deliberately not read anywhere: the
// rehearsal cannot reach it even by accident.
// ---------------------------------------------------------------------------
const adminUrl = process.env.M1_ADMIN_URL;

function block(code, message) {
  console.error(`\nBLOCKED [${code}]: ${message}\n`);
  process.exit(2);
}

if (!adminUrl || !String(adminUrl).trim()) {
  block(
    'MISSING_ADMIN_URL',
    'M1_ADMIN_URL is not set. Point it at a loopback maintenance database, e.g.\n' +
      '  postgresql://postgres:<password>@127.0.0.1:5432/postgres'
  );
}

function parseAdminUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch {
    block('INVALID_ADMIN_URL', 'M1_ADMIN_URL is not a valid URL.');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    block('INVALID_ADMIN_URL', 'M1_ADMIN_URL must use the postgresql:// scheme.');
  }
  const host = parsed.hostname.toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    block('NON_LOOPBACK_HOST', `host "${host}" is not loopback; only localhost, 127.0.0.1 and ::1 are allowed.`);
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!['postgres', 'template1'].includes(database)) {
    block(
      'NON_MAINTENANCE_DATABASE',
      `database "${database}" is not a maintenance database. Use "postgres" or "template1"; ` +
        'the runner creates its own throwaway databases.'
    );
  }
  return { host, port: parsed.port || '5432', database };
}

const adminTarget = parseAdminUrl(adminUrl);

function withDatabase(database) {
  const parsed = new URL(String(adminUrl).trim());
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function redact(input) {
  let out = String(input ?? '');
  try {
    const password = decodeURIComponent(new URL(String(adminUrl).trim()).password);
    if (password) out = out.split(password).join('[redacted]');
  } catch {
    /* not a URL */
  }
  return out;
}

// ---------------------------------------------------------------------------
// Run identity: unique, lower-case, disposable.
// ---------------------------------------------------------------------------
function utcStamp() {
  return new Date().toISOString().replace(/[-:.]/g, '').replace('T', 't').slice(0, 15) + 'z';
}

const runTag = `${utcStamp()}_${randomBytes(3).toString('hex')}`;
const stateDatabase = (state) => `decidix_m1_${runTag}_${state}`;
const failureDatabase = () => `decidix_m1_${runTag}_failure`;

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
const results = [];
const runLog = [];
/** Client for the database currently under test; set by runState(). */
let activeClient = null;

function check(scope, name, ok, detail = '') {
  results.push({ scope, name, ok, detail: ok ? '' : detail });
  const suffix = ok || !detail ? '' : `  — ${redact(detail)}`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${scope}] ${name}${suffix}`);
}

function note(scope, message) {
  runLog.push({ scope, message });
  console.log(`      [${scope}] ${message}`);
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------
async function applyMigrationFile(client, name, sql) {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error(`${name}: ${error.message}`);
  }
}

function migrationFolders() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function applyLegacyBaseline(client, scope) {
  const folders = migrationFolders();
  for (const folder of folders) {
    const file = join(migrationsDir, folder, 'migration.sql');
    await applyMigrationFile(client, folder, read(file));
  }
  note(scope, `legacy baseline applied: ${folders.length} Prisma migrations (${folders[0]} .. ${folders.at(-1)})`);
}

async function applyM1(client, scope, afterSchema = null) {
  await applyMigrationFile(client, '001_schema.sql', SQL.schema);
  note(scope, '001_schema.sql committed (transactional DDL)');

  if (afterSchema) {
    await afterSchema();
    note(scope, 'pre-M1 versions assigned dataset_family/bundle_key from the release manifest');
  }

  await applyMigrationFile(client, '002_backfill.sql', SQL.backfill);
  note(scope, '002_backfill.sql committed (additive backfill + quarantine copies)');

  for (const statement of splitStatements(SQL.indexes)) {
    await client.query(statement);
  }
  note(scope, '003_indexes.sql applied statement-by-statement (no transaction: CONCURRENTLY)');

  try {
    await client.query('BEGIN');
    await client.query(SQL.optional);
    await client.query('COMMIT');
    note(scope, '004_optional_exclusions.sql applied (btree_gist present)');
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    note(scope, `004 optional hardening skipped: ${error.message}`);
    return false;
  }
}

async function tableColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((row) => row.column_name);
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS present`,
    [`public.${table}`]
  );
  return rows[0].present;
}

/** Row count + order-independent content hash over an explicit column list. */
async function fingerprint(client, table, columns) {
  const list = columns.map((column) => `"${column}"`).join(', ');
  const { rows } = await client.query(
    `SELECT count(*)::bigint AS n,
            coalesce(md5(string_agg(h, '|' ORDER BY h)), md5('')) AS h
       FROM (SELECT md5(row(${list})::text) AS h FROM "public"."${table}") s`
  );
  return { n: String(rows[0].n), h: rows[0].h };
}

async function snapshotLegacy(client) {
  const snapshot = {};
  for (const table of LEGACY_TABLES) {
    if (!(await tableExists(client, table))) continue;
    snapshot[table] = {
      columns: await tableColumns(client, table),
      fingerprint: null,
    };
    snapshot[table].fingerprint = await fingerprint(client, table, snapshot[table].columns);
  }
  return snapshot;
}

async function fingerprintWithBaselineColumns(client, snapshot) {
  const now = {};
  for (const [table, entry] of Object.entries(snapshot)) {
    const present = await tableExists(client, table);
    now[table] = present ? await fingerprint(client, table, entry.columns) : null;
  }
  return now;
}

async function count(client, sql) {
  const { rows } = await client.query(sql);
  return Number(Object.values(rows[0])[0]);
}

async function scalar(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ? Object.values(rows[0])[0] : undefined;
}

/**
 * Runs `badSql` inside a transaction and asserts it fails with one of `codes`.
 * Everything is rolled back, so no cleanup is required.
 */
async function expectFailure(scope, name, codes, badSql, setupSql = null) {
  const client = activeClient;
  let ok = false;
  let detail = '';
  await client.query('BEGIN');
  try {
    if (setupSql) await client.query(setupSql);
    try {
      await client.query(badSql);
      detail = 'statement unexpectedly succeeded';
    } catch (error) {
      ok = codes.includes(error.code);
      detail = `SQLSTATE ${error.code}: ${error.message}`;
    }
  } finally {
    await client.query('ROLLBACK').catch(() => {});
  }
  check(scope, name, ok, detail);
}

/** Runs `sql` inside a transaction that is always rolled back; returns rows. */
async function inRollback(client, sql, params = []) {
  await client.query('BEGIN');
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.query('ROLLBACK').catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
async function assertSchema(client, scope, optionalApplied) {
  for (const table of M1_NEW_TABLES) {
    check(scope, `new table ${table} exists`, await tableExists(client, table));
  }
  check(
    scope,
    'activation function activate_dataset_bundle() exists',
    (await scalar(client, `SELECT count(*)::int FROM pg_proc WHERE proname = 'activate_dataset_bundle'`)) === 1
  );
  check(
    scope,
    'lineage reconciliation functions exist',
    (await scalar(
      client,
      `SELECT count(*)::int FROM pg_proc
        WHERE proname IN ('report_orphan_observation_source_records','report_lineage_version_mismatches')`
    )) === 2
  );

  // SQL-only objects: none of these can be expressed in schema.prisma.
  const sqlOnlyIndexes = [
    'uq_indicator_definitions_open',
    'uq_region_boundaries_open',
    'uq_dataset_metadata_version',
    'uq_dataset_versions_bundle_family',
    'uq_recommendations_version_external',
    'uq_rag_documents_version_external',
    'idx_ml_forecasts_version_year',
    'idx_regional_metric_obs_year',
    'idx_national_obs_version_year',
  ];
  for (const index of sqlOnlyIndexes) {
    const row = (
      await client.query(
        `SELECT i.indisvalid,
                pg_get_indexdef(i.indexrelid) AS def
           FROM pg_index i
           JOIN pg_class c ON c.oid = i.indexrelid
          WHERE c.relname = $1`,
        [index]
      )
    ).rows[0];
    check(scope, `SQL-only index ${index} exists and is valid`, Boolean(row?.indisvalid), row ? '' : 'missing');
  }

  const sqlOnlyConstraints = [
    'dataset_runtime_state_pointer_shape',
    'indicator_definitions_range_valid',
    'region_boundaries_range_valid',
    'region_relations_distinct_regions',
    'region_relations_range_valid',
    'region_observations_version_region',
    'national_index_observations_version_period',
    'regional_metric_observations_identity',
    'sector_breakdown_observations_identity',
    'migration_quarantine_records_identity',
  ];
  for (const constraint of sqlOnlyConstraints) {
    check(
      scope,
      `SQL-only constraint ${constraint} exists`,
      (await scalar(client, `SELECT count(*)::int FROM pg_constraint WHERE conname = $1`, [constraint])) > 0
    );
  }

  const evidenceFk = (
    await client.query(
      `SELECT confdeltype
         FROM pg_constraint
        WHERE conname = 'dataset_records_dataset_version_id_fkey'
          AND conrelid = 'public.dataset_records'::regclass`
    )
  ).rows[0];
  check(scope, 'dataset_records -> dataset_versions is ON DELETE RESTRICT (confdeltype=r)', evidenceFk?.confdeltype === 'r');

  if (optionalApplied) {
    for (const constraint of ['indicator_definitions_no_overlap', 'region_boundaries_no_overlap']) {
      check(
        scope,
        `004 exclusion constraint ${constraint} present`,
        (await scalar(client, `SELECT count(*)::int FROM pg_constraint WHERE conname = $1`, [constraint])) > 0
      );
    }
  }
}

async function assertLegacyPreserved(client, scope, before) {
  const after = await fingerprintWithBaselineColumns(client, before);
  for (const [table, entry] of Object.entries(before)) {
    const now = after[table];
    const same =
      now !== null && now.n === entry.fingerprint.n && now.h === entry.fingerprint.h;
    check(
      scope,
      `legacy ${table} unchanged (${entry.fingerprint.n} rows, ${entry.columns.length} original columns)`,
      same,
      now ? `before ${entry.fingerprint.n}/${entry.fingerprint.h} after ${now.n}/${now.h}` : 'table disappeared'
    );
  }
}

async function assertBackfill(client, scope, expected) {
  const definitions = await count(client, `SELECT count(*)::int FROM indicator_definitions`);
  check(scope, `indicator_definitions captured ${expected.indicators} catalog era(s)`, definitions === expected.indicators, `got ${definitions}`);

  const boundaries = await count(client, `SELECT count(*)::int FROM region_boundaries`);
  check(
    scope,
    `region_boundaries captured ${expected.boundaries} geometry era(s)`,
    boundaries === expected.boundaries,
    `got ${boundaries}`
  );

  const missingExternal = await count(
    client,
    `SELECT (
       (SELECT count(*)::int FROM rag_documents WHERE external_id IS NULL) +
       (SELECT count(*)::int FROM ai_recommendations WHERE external_id IS NULL)
     )`
  );
  check(scope, 'external_id populated for rag_documents and ai_recommendations', missingExternal === 0, `${missingExternal} missing`);

  const missingSeq = await count(client, `SELECT count(*)::int FROM ai_recommendations WHERE seq IS NULL`);
  check(scope, 'ai_recommendations.seq populated from sequence', missingSeq === 0, `${missingSeq} missing`);

  const observations = await count(
    client,
    `SELECT (
       (SELECT count(*)::int FROM region_observations) +
       (SELECT count(*)::int FROM national_index_observations) +
       (SELECT count(*)::int FROM regional_metric_observations) +
       (SELECT count(*)::int FROM sector_breakdown_observations)
     )`
  );
  check(scope, 'M1 invents no observations (backfill is M3)', observations === 0, `${observations} rows`);
}

async function assertQuarantine(client, scope, expected) {
  const quarantined = await count(client, `SELECT count(*)::int FROM migration_quarantine_records`);
  check(
    scope,
    `quarantine copies every NULL-provenance row (${expected.quarantine})`,
    quarantined === expected.quarantine,
    `got ${quarantined}`
  );
  const byReason = await count(
    client,
    `SELECT count(*)::int FROM migration_quarantine_records WHERE reason = 'no_version_provenance'`
  );
  check(scope, 'quarantine reason is no_version_provenance', byReason === expected.quarantine, `got ${byReason}`);
  const legacyNulls = await count(
    client,
    `SELECT count(*)::int FROM regions WHERE dataset_version_id IS NULL`
  );
  check(scope, 'legacy rows keep their NULL provenance (nothing re-attributed)', legacyNulls === expected.nullRegions, `got ${legacyNulls}`);
}

async function assertDefinitionAndBoundaryConstraints(client, scope, expected) {
  // Versioned definitions.
  await expectFailure(
    scope,
    'second open definition era for one indicator rejected (23505)',
    ['23505'],
    `INSERT INTO indicator_definitions
       (indicator_key, definition_version, label, arabic_label, unit, higher_is_better, effective_from)
     VALUES ('development_index', 'legacy-2', 'dup', 'dup', 'score_100', true, current_date)`
  );
  await expectFailure(
    scope,
    'definition era with effective_to < effective_from rejected (23514)',
    ['23514'],
    `INSERT INTO indicator_definitions
       (indicator_key, definition_version, label, arabic_label, unit, higher_is_better, effective_from, effective_to)
     VALUES ('development_index', 'reversed', 'x', 'x', 'score_100', true, current_date, current_date - 10)`
  );
  await expectFailure(
    scope,
    'metric observation with unknown definition era rejected (23503)',
    ['23503'],
    `INSERT INTO regional_metric_observations
       (dataset_version_id, region_id, indicator_key, indicator_definition_version, reference_period, year, value)
     VALUES ('ver-a', 'alpha', 'development_index', 'does-not-exist', '2024', 2024, 80.0)`,
    expected.hasVersionedRows ? null : null
  );

  const validMetric = await inRollback(
    client,
    `INSERT INTO regional_metric_observations
       (dataset_version_id, region_id, indicator_key, indicator_definition_version, reference_period, year, value)
     VALUES ('ver-a', 'alpha', 'development_index', 'legacy-1', '2024', 2024, 80.0)
     RETURNING id`
  );
  check(scope, 'metric observation bound to a real definition era is accepted', validMetric.length === 1);

  // Boundary history.
  await expectFailure(
    scope,
    'second open boundary era for one region rejected (23505)',
    ['23505'],
    `INSERT INTO region_boundaries (region_id, boundary_version, geometry_geojson, effective_from)
     VALUES ('alpha', 'dup-era', '{}'::jsonb, current_date)`
  );
  await expectFailure(
    scope,
    'observation referencing an unknown boundary era rejected (23503)',
    ['23503'],
    `INSERT INTO region_observations (dataset_version_id, region_id, boundary_version)
     VALUES ('ver-a', 'alpha', 'no-such-era')`
  );
  await expectFailure(
    scope,
    'region relation from a region to itself rejected (23514)',
    ['23514'],
    `INSERT INTO region_relations (predecessor_region_id, successor_region_id, relation_type, effective_from)
     VALUES ('alpha', 'alpha', 'split', current_date)`
  );
  await expectFailure(
    scope,
    'region relation with unknown type rejected (23514)',
    ['23514'],
    `INSERT INTO region_relations (predecessor_region_id, successor_region_id, relation_type, effective_from)
     VALUES ('alpha', 'beta', 'teleported', current_date)`
  );
}

async function assertBundleActivation(client, scope, expected) {
  const activation = await inRollback(
    client,
    `SELECT * FROM activate_dataset_bundle('ver-a', 'rehearsal', 'M1 rehearsal activation')`
  );
  check(scope, 'activation of a validated version returns one pointer row', activation.length === 1);
  check(scope, 'activation points the runtime state at ver-a', activation[0]?.version_id === 'ver-a', JSON.stringify(activation[0] ?? {}));

  if (expected.hasVersionedRows) {
    check(scope, 'activation records the bundle key', activation[0]?.bundle_key === 'bundle-x', String(activation[0]?.bundle_key));

    await expectFailure(
      scope,
      'activation of an unvalidated version rejected (23514)',
      ['23514'],
      `SELECT * FROM activate_dataset_bundle('ver-c', 'rehearsal', 'should fail')`
    );

    // Bundle completeness is only reachable when two same-family versions share a
    // bundle; the 003 partial unique index normally forbids that. Drop it inside
    // a rolled-back transaction to exercise the function's own guard.
    const completeness = await (async () => {
      let code = null;
      await client.query('BEGIN');
      try {
        await client.query('DROP INDEX IF EXISTS uq_dataset_versions_bundle_family');
        await client.query(
          `INSERT INTO dataset_versions
             (id, version, filename, object_key, checksum_sha256, format, source, license, coverage,
              validation_status, validated_at, record_count, is_active, created_by, dataset_family, bundle_key)
           VALUES
             ('ver-e', 'v-e', 'e.json', 'datasets/e.json', repeat('e', 64), 'json', 'Synthetic fixture',
              'internal', 'national', 'uploaded', NULL, 0, false, 'fixture', 'national_index', 'bundle-z'),
             ('ver-f', 'v-f', 'f.json', 'datasets/f.json', repeat('f', 64), 'json', 'Synthetic fixture',
              'internal', 'national', 'validated', now(), 0, false, 'fixture', 'national_index', 'bundle-z')`
        );
        try {
          await client.query(`SELECT * FROM activate_dataset_bundle('ver-f', 'rehearsal', 'bundle guard')`);
        } catch (error) {
          code = error.code;
        }
      } finally {
        await client.query('ROLLBACK').catch(() => {});
      }
      return code;
    })();
    check(scope, 'activation refuses a bundle containing an unvalidated member (23514)', completeness === '23514', `got ${completeness}`);

    await expectFailure(
      scope,
      'two versions of one family in one bundle rejected (23505)',
      ['23505'],
      `INSERT INTO dataset_versions
         (id, version, filename, object_key, checksum_sha256, format, source, license, coverage,
          validation_status, created_by, dataset_family, bundle_key)
       VALUES ('ver-g', 'v-g', 'g.json', 'datasets/g.json', repeat('g', 64), 'json', 'fixture',
               'internal', 'national', 'validated', 'fixture', 'national_index', 'bundle-x')`
    );
  } else {
    note(scope, 'bundle-specific assertions are not applicable (no bundles in this state)');
  }

  await expectFailure(
    scope,
    'activation with blank actor rejected (22023)',
    ['22023'],
    `SELECT * FROM activate_dataset_bundle('ver-a', '   ', 'reason')`
  );
  await expectFailure(
    scope,
    'activation of a missing version rejected (23503)',
    ['23503'],
    `SELECT * FROM activate_dataset_bundle('no-such-version', 'rehearsal', 'reason')`
  );

  // Single-active mirror and audit trail, committed then removed.
  await client.query('BEGIN');
  try {
    await client.query(`SELECT * FROM activate_dataset_bundle('ver-a', 'rehearsal', 'mirror check')`);
    const pointer = await scalar(
      client,
      `SELECT active_dataset_version_id FROM dataset_runtime_state WHERE dataset_family = 'national_index'`
    );
    const actives = await count(
      client,
      `SELECT count(*)::int FROM dataset_versions WHERE is_active AND dataset_family = 'national_index'`
    );
    const events = await count(
      client,
      `SELECT count(*)::int FROM dataset_activation_events WHERE dataset_version_id = 'ver-a'`
    );
    check(scope, 'activation sets the single active pointer to ver-a', pointer === 'ver-a', String(pointer));
    check(scope, 'activation mirrors exactly one active version in the family', actives === 1, `got ${actives}`);
    check(scope, 'activation writes an audit event naming the actor', events >= 1, `got ${events}`);
    check(
      scope,
      'activation audit event records actor and reason',
      (await count(
        client,
        `SELECT count(*)::int FROM dataset_activation_events
          WHERE dataset_version_id = 'ver-a' AND actor = 'rehearsal' AND btrim(reason) <> ''`
      )) >= 1
    );
  } finally {
    await client.query('ROLLBACK').catch(() => {});
  }
}

async function assertLineage(client, scope, expected) {
  await client.query('BEGIN');
  try {
    const observation = (
      await client.query(
        `INSERT INTO region_observations (dataset_version_id, region_id, classification)
         VALUES ('ver-a', 'alpha', 'synthetic') RETURNING id`
      )
    ).rows[0];

    const okLink = await client.query(
      `INSERT INTO observation_source_records
         (observation_type, observation_id, dataset_version_id, dataset_record_id)
       VALUES ('region_observation', $1, 'ver-a', 'rec-a-1') RETURNING *`,
      [observation.id]
    );
    check(scope, 'observation-source link to a record of the same version accepted', okLink.rowCount === 1);
    check(
      scope,
      'lineage reconciliation reports no mismatch for a same-version link',
      (await scalar(client, `SELECT report_lineage_version_mismatches()::int`)) === 0
    );

    await client.query(
      `INSERT INTO observation_source_records
         (observation_type, observation_id, dataset_version_id, dataset_record_id)
       VALUES ('region_observation', $1, 'ver-a', 'rec-b-1')`,
      [observation.id]
    );
    check(
      scope,
      'cross-version link is detected by report_lineage_version_mismatches()',
      (await scalar(client, `SELECT report_lineage_version_mismatches()::int`)) === 1
    );

    await client.query(
      `INSERT INTO observation_source_records
         (observation_type, observation_id, dataset_version_id, dataset_record_id)
       VALUES ('region_observation', 99999999, 'ver-a', 'rec-a-1')`
    );
    check(
      scope,
      'orphan link is detected by report_orphan_observation_source_records()',
      (await scalar(client, `SELECT report_orphan_observation_source_records()::int`)) === 1
    );

    await expectFailure(
      scope,
      'duplicate observation-source link rejected (23505)',
      ['23505'],
      `INSERT INTO observation_source_records
         (observation_type, observation_id, dataset_version_id, dataset_record_id)
       VALUES ('region_observation', ${observation.id}, 'ver-a', 'rec-a-1')`
    );
  } finally {
    await client.query('ROLLBACK').catch(() => {});
  }

  // Evidence is never cascade-deleted.
  await client.query('BEGIN');
  try {
    const observation = (
      await client.query(
        `INSERT INTO region_observations (dataset_version_id, region_id, classification)
         VALUES ('ver-a', 'alpha', 'synthetic') RETURNING id`
      )
    ).rows[0];
    await client.query(
      `INSERT INTO observation_source_records (observation_type, observation_id, dataset_version_id, dataset_record_id)
       VALUES ('region_observation', $1, 'ver-a', 'rec-a-1')`,
      [observation.id]
    );
    await expectFailure(
      scope,
      'deleting a dataset_record that supports evidence rejected (23001)',
      ['23001'],
      `DELETE FROM dataset_records WHERE id = 'rec-a-1'`
    );
    await expectFailure(
      scope,
      'deleting a dataset_version that owns raw records rejected (23001)',
      ['23001'],
      `DELETE FROM dataset_versions WHERE id = 'ver-a'`
    );
  } finally {
    await client.query('ROLLBACK').catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// State orchestration
// ---------------------------------------------------------------------------
function expectedFor(state) {
  switch (state) {
    case 'empty':
      return { quarantine: 0, nullRegions: 0, indicators: 0, boundaries: 0, hasVersionedRows: false };
    case 'legacy':
      return { quarantine: 8, nullRegions: 2, indicators: 2, boundaries: 2, hasVersionedRows: false };
    case 'versioned':
      return { quarantine: 1, nullRegions: 1, indicators: 2, boundaries: 2, hasVersionedRows: true };
    case 'unattributable':
      return { quarantine: 8, nullRegions: 2, indicators: 2, boundaries: 2, hasVersionedRows: false };
    default:
      throw new Error(`unknown state ${state}`);
  }
}

async function runState(admin, state) {
  section(`state: ${state}`);
  const database = stateDatabase(state);
  if (!DB_NAME_PATTERN.test(database)) throw new Error(`generated database name rejected: ${database}`);

  const existing = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [database]);
  if (existing.rowCount > 0) throw new Error(`database ${database} already exists; refusing to reuse it`);
  await admin.query(`CREATE DATABASE "${database}"`);
  note(state, `created disposable database ${database}`);

  const client = new pg.Client({ connectionString: withDatabase(database) });
  let optionalApplied = false;
  try {
    await client.connect();
    activeClient = client;
    const version = await scalar(client, 'SELECT version()');
    note(state, `server: ${String(version).split(' on ')[0]}`);

    const leaked = await count(
      client,
      `SELECT count(*)::int FROM pg_namespace
        WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema'`
    );
    check(state, 'database starts with no user schemas (disposable and empty)', leaked === 1, `schemas: ${leaked}`);

    await applyLegacyBaseline(client, state);

    if (state !== 'empty') await client.query(SQL.legacyRows);
    if (state === 'versioned') await client.query(SQL.versionedRows);
    if (state === 'unattributable') await client.query(VERSIONS_ONLY_SQL);

    const before = await snapshotLegacy(client);
    check(state, `legacy snapshot captured for ${Object.keys(before).length} tables`, Object.keys(before).length >= 15);

    optionalApplied = await applyM1(
      client,
      state,
      state === 'versioned' ? () => client.query(SQL.versionedMetadata) : null
    );

    await assertSchema(client, state, optionalApplied);
    await assertLegacyPreserved(client, state, before);

    const expected = expectedFor(state);
    await assertBackfill(client, state, expected);
    await assertQuarantine(client, state, expected);

    if (state === 'versioned' || state === 'unattributable') {
      await assertDefinitionAndBoundaryConstraints(client, state, expected);
      await assertBundleActivation(client, state, expected);
    }
    if (state === 'versioned') {
      await assertLineage(client, state, expected);
    }
  } finally {
    activeClient = null;
    await client.end().catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    note(state, `dropped disposable database ${database}`);
  }
}

// ---------------------------------------------------------------------------
// Failure / rollback phase
// ---------------------------------------------------------------------------
async function runFailurePhase(admin) {
  section('failure and rollback');
  const scope = 'rollback';
  const database = failureDatabase();
  const existing = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [database]);
  if (existing.rowCount > 0) throw new Error(`database ${database} already exists; refusing to reuse it`);
  await admin.query(`CREATE DATABASE "${database}"`);
  note(scope, `created disposable database ${database}`);

  const client = new pg.Client({ connectionString: withDatabase(database) });
  try {
    await client.connect();

    // F1 — 001 refuses a database that is not the legacy schema, and leaves nothing.
    let f1Error = null;
    await client.query('BEGIN');
    try {
      await client.query(SQL.schema);
    } catch (error) {
      f1Error = error;
    }
    await client.query('ROLLBACK').catch(() => {});
    check(
      scope,
      '001 refuses a database without the legacy schema',
      f1Error !== null && /legacy Decidix schema/i.test(f1Error.message),
      f1Error ? f1Error.message : 'no error raised'
    );
    const m1TablesAfterRefusal = await count(
      client,
      `SELECT count(*)::int FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'dataset_runtime_state'`
    );
    check(scope, 'refused 001 leaves no M1 tables behind', m1TablesAfterRefusal === 0, `got ${m1TablesAfterRefusal}`);

    // F2 — 001 + 002 in the same transaction, aborted before commit.
    await applyLegacyBaseline(client, scope);
    await client.query(SQL.legacyRows);
    const legacyBefore = await snapshotLegacy(client);

    let f2Error = null;
    await client.query('BEGIN');
    try {
      await client.query(SQL.schema);
      await client.query(SQL.backfill);
      await client.query('SELECT 1 / 0'); // injected failure before COMMIT
    } catch (error) {
      f2Error = error;
    }
    await client.query('ROLLBACK').catch(() => {});
    check(scope, 'injected mid-migration failure is raised', f2Error !== null && f2Error.code === '22012', f2Error?.message);
    const runtimeAfterRollback = await count(
      client,
      `SELECT count(*)::int FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'dataset_runtime_state'`
    );
    check(scope, 'rollback removes every 001 object created in the transaction', runtimeAfterRollback === 0, `got ${runtimeAfterRollback}`);
    const backfillAfterRollback = await count(
      client,
      `SELECT count(*)::int FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'migration_quarantine_records'`
    );
    check(scope, 'rollback removes every 002 object created in the transaction', backfillAfterRollback === 0, `got ${backfillAfterRollback}`);
    const legacyAfterRollback = await fingerprintWithBaselineColumns(client, legacyBefore);
    const unchanged = Object.entries(legacyBefore).every(
      ([table, entry]) =>
        legacyAfterRollback[table] &&
        legacyAfterRollback[table].n === entry.fingerprint.n &&
        legacyAfterRollback[table].h === entry.fingerprint.h
    );
    check(scope, 'rollback leaves every legacy table unchanged', unchanged);

    // F3 — a failing 003 unique build leaves an INVALID index, not a half-valid one.
    await applyM1WithoutIndexes(client, scope);
    await client.query(
      `INSERT INTO dataset_versions
         (id, version, filename, object_key, checksum_sha256, format, source, license, coverage,
          validation_status, created_by)
       VALUES ('ver-a', 'v-a', 'a.json', 'datasets/a.json', repeat('a', 64), 'json', 'fixture',
               'internal', 'national', 'validated', 'fixture')`
    );
    await client.query(
      `INSERT INTO dataset_metadata
         (id, name, arabic_name, original_source, license, time_coverage, update_frequency, record_count,
          dataset_version_id)
       VALUES
         ('dup-meta-1', 'Dup', 'Dup', 'x', 'internal', '2024', 'annual', 0, 'ver-a'),
         ('dup-meta-2', 'Dup', 'Dup', 'x', 'internal', '2024', 'annual', 0, 'ver-a')`
    );
    let f3Error = null;
    try {
      for (const statement of splitStatements(SQL.indexes)) {
        await client.query(statement);
      }
    } catch (error) {
      f3Error = error;
    }
    check(scope, 'duplicate metadata makes the 003 unique build fail (23505)', f3Error?.code === '23505', f3Error?.message ?? 'build succeeded');

    const invalid = (
      await client.query(
        `SELECT i.indisvalid
           FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
          WHERE c.relname = 'uq_dataset_metadata_version'`
      )
    ).rows[0];
    check(scope, 'failed concurrent index is reported INVALID (indisvalid=false)', invalid?.indisvalid === false, JSON.stringify(invalid ?? {}));

    const validatedBeforeFailure = (
      await client.query(
        `SELECT convalidated FROM pg_constraint
          WHERE conname = 'dataset_records_dataset_version_id_fkey'`
      )
    ).rows[0];
    check(scope, 'statements before the failing one stay applied (fail-visible, not atomic)', validatedBeforeFailure?.convalidated === true);

    await client.query('DROP INDEX CONCURRENTLY IF EXISTS uq_dataset_metadata_version').catch(() => {});
  } finally {
    await client.end().catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    note(scope, `dropped disposable database ${database}`);
  }
}

// ---------------------------------------------------------------------------
// Down-migration phase (005): apply M1, roll it back, prove the legacy shape
// and every legacy row are exactly as they were before M1.
// ---------------------------------------------------------------------------
async function runRollbackPhase(admin) {
  section('rollback (005_rollback.sql)');
  const scope = 'down';
  const database = `decidix_m1_${runTag}_down`;
  const existing = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [database]);
  if (existing.rowCount > 0) throw new Error(`database ${database} already exists; refusing to reuse it`);
  await admin.query(`CREATE DATABASE "${database}"`);
  note(scope, `created disposable database ${database}`);

  const client = new pg.Client({ connectionString: withDatabase(database) });
  try {
    await client.connect();
    activeClient = client;

    await applyLegacyBaseline(client, scope);
    await client.query(SQL.legacyRows);
    await client.query(SQL.versionedRows);

    const before = await snapshotLegacy(client);
    await applyM1(client, scope, () => client.query(SQL.versionedMetadata));
    check(scope, 'M1 schema is present before rollback', await tableExists(client, 'dataset_runtime_state'));

    await applyMigrationFile(client, '005_rollback.sql', SQL.rollback);
    note(scope, '005_rollback.sql committed');

    const after = await fingerprintWithBaselineColumns(client, before);
    const unchanged = Object.entries(before).every(
      ([table, entry]) =>
        after[table] !== null &&
        after[table].n === entry.fingerprint.n &&
        after[table].h === entry.fingerprint.h
    );
    check(scope, 'rollback leaves every legacy table and row unchanged', unchanged);

    let remaining = 0;
    for (const table of M1_NEW_TABLES) {
      if (await tableExists(client, table)) {
        remaining += 1;
        console.log(`        still present after rollback: ${table}`);
      }
    }
    check(scope, `rollback drops all ${M1_NEW_TABLES.length} M1 tables`, remaining === 0, `${remaining} remain`);

    const m1Columns = await count(
      client,
      `SELECT count(*)::int
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND ((table_name = 'ml_forecasts' AND column_name IN ('dataset_version_id','model_run_id'))
            OR (table_name = 'ai_recommendations' AND column_name IN ('external_id','seq'))
            OR (table_name = 'rag_documents' AND column_name = 'external_id')
            OR (table_name = 'dataset_versions' AND column_name IN ('dataset_family','bundle_key')))`
    );
    check(scope, 'rollback drops every M1 column added to legacy tables', m1Columns === 0, `${m1Columns} remain`);

    const functions = await count(
      client,
      `SELECT count(*)::int FROM pg_proc
        WHERE proname IN ('activate_dataset_bundle','report_orphan_observation_source_records','report_lineage_version_mismatches')`
    );
    check(scope, 'rollback drops the M1 functions', functions === 0, `${functions} remain`);

    const restoredFk = (
      await client.query(
        `SELECT confdeltype FROM pg_constraint
          WHERE conname = 'dataset_records_dataset_version_id_fkey'
            AND conrelid = 'public.dataset_records'::regclass`
      )
    ).rows[0];
    check(scope, 'rollback restores dataset_records ON DELETE CASCADE (confdeltype=c)', restoredFk?.confdeltype === 'c', JSON.stringify(restoredFk ?? {}));

    const exclusions = await count(client, `SELECT count(*)::int FROM pg_constraint WHERE contype = 'x'`);
    check(scope, 'rollback removes the optional 004 exclusion constraints', exclusions === 0, `${exclusions} remain`);
  } finally {
    activeClient = null;
    await client.end().catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    note(scope, `dropped disposable database ${database}`);
  }
}

/** Applies 001 + 002 but stops before 003, so a failing 003 can be staged. */async function applyM1WithoutIndexes(client, scope) {
  await applyMigrationFile(client, '001_schema.sql', SQL.schema);
  await applyMigrationFile(client, '002_backfill.sql', SQL.backfill);
  for (const statement of splitStatements(SQL.indexes)) {
    if (/VALIDATE CONSTRAINT/i.test(statement)) await client.query(statement);
  }
  note(scope, '001 + 002 + FK validation applied; index builds deferred to the failing step');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`M1 rehearsal run ${runTag}`);
  console.log(`Maintenance target: ${adminTarget.host}:${adminTarget.port}/${adminTarget.database} (loopback)`);
  console.log('Application DATABASE_URL is not read by this runner.');

  const audit = auditScripts({
    schemaSql: SQL.schema,
    backfillSql: SQL.backfill,
    indexSql: SQL.indexes,
  });
  check('audit', 'M1 SQL scripts pass the destructive-statement audit', audit.ok, JSON.stringify(audit.violations));

  const admin = new pg.Client({ connectionString: String(adminUrl).trim() });
  await admin.connect();
  let serverVersion = 'unknown';
  try {
    serverVersion = String(await scalar(admin, 'SELECT version()'));
    note('run', `server: ${serverVersion.split(' on ')[0]}`);
    try {
      for (const state of STATES) await runState(admin, state);
      await runFailurePhase(admin);
      await runRollbackPhase(admin);
    } finally {
      // Defensive sweep: only databases created by this exact run tag.
      const leftovers = await admin.query(
        `SELECT datname FROM pg_database WHERE datname LIKE $1`,
        [`decidix_m1_${runTag}_%`]
      );
      for (const row of leftovers.rows) {
        await admin.query(`DROP DATABASE IF EXISTS "${row.datname}" WITH (FORCE)`);
        note('cleanup', `dropped leftover ${row.datname}`);
      }
    }
  } finally {
    await admin.end().catch(() => {});
  }

  const failures = results.filter((result) => !result.ok);
  const total = results.length;
  const passed = total - failures.length;

  console.log('\n' + '='.repeat(72));
  console.log(`${passed}/${total} M1 rehearsal assertions passed.`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} FAILURE(S):`);
    for (const failure of failures) console.log(`  [${failure.scope}] ${failure.name} — ${redact(failure.detail)}`);
    console.log('\nM1 REHEARSAL FAILED.');
  } else {
    console.log('M1 REHEARSAL PASSED against real PostgreSQL.');
  }
  console.log(`Server: ${serverVersion.split(' on ')[0]}`);
  console.log('='.repeat(72));

  const reportPath = process.env.M1_REPORT_PATH;
  if (reportPath) {
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          runTag,
          generatedAt: new Date().toISOString(),
          serverVersion,
          states: STATES,
          total,
          passed,
          ok: failures.length === 0,
          results,
          log: runLog,
        },
        null,
        2
      )
    );
    console.log(`Report written to ${reportPath}`);
  }

  process.exit(failures.length === 0 ? 0 : 1);
}

await main();
