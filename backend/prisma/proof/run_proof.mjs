#!/usr/bin/env node
// Decidix versioned-model proof runner.
//
// Runs the A -> B -> A lifecycle against a REAL PostgreSQL database using the
// project's existing `pg` driver. This is intentionally NOT a Prisma mock.
//
// Safety contract:
//   * connection target comes only from PROOF_DATABASE_URL (never from the app URL)
//   * host must be loopback: localhost, 127.0.0.1 or ::1
//   * database name must match ^decidix_proof_[A-Za-z0-9_]+$
//   * the target must not be the configured application database
//   * refuses to run if the `proof` schema already exists
//   * creates and drops only the `proof` schema, and only if this run created it
//   * no other schema, database, role or object is modified or dropped
//   * credentials and full URLs are never printed
//
// Usage:
//   PROOF_DATABASE_URL=postgresql://user:pass@localhost:5432/decidix_proof_v1 \
//     node prisma/proof/run_proof.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { evaluateGuard, planCleanup, PROOF_SCHEMA } from './guard.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const proofUrl = process.env.PROOF_DATABASE_URL;

/**
 * The application URL is read ONLY to compare targets, never to connect.
 * Preference order: process env (the running app's value), then backend/.env.
 * The parsed value is never logged.
 */
function readConfiguredAppUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const text = readFileSync(join(here, '..', '..', '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
      if (!match) continue;
      const value = match[1].replace(/^["']|["']$/g, '');
      if (value) return value;
    }
  } catch {
    // No .env available: comparison against the app URL is simply skipped.
  }
  return null;
}

/** Removes any credential material that could reach output through an error. */
function redact(input) {
  let out = String(input ?? '');
  for (const candidate of [proofUrl, process.env.DATABASE_URL, readConfiguredAppUrl()]) {
    if (!candidate) continue;
    out = out.split(candidate).join('[redacted-url]');
    try {
      const password = decodeURIComponent(new URL(candidate).password);
      if (password) out = out.split(password).join('[redacted]');
    } catch {
      // Not a URL: nothing further to strip.
    }
  }
  return out;
}

const guard = evaluateGuard({ proofUrl, appDatabaseUrl: readConfiguredAppUrl() });
if (!guard.ok) {
  console.error(`\nBLOCKED [${guard.code}]: ${guard.message}\n`);
  process.exit(2);
}

const client = new pg.Client({ connectionString: proofUrl });
let schemaCreatedByRun = false;
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${redact(detail)}`}`);
}

function expectReject(code, fn) {
  return (async () => {
    try {
      await fn();
      return `expected rejection (${code}) but the statement succeeded`;
    } catch (error) {
      if (error?.code === code) return '';
      if (typeof error?.message === 'string' && error.message.includes(code)) return '';
      return `expected ${code}, received ${error?.code || error?.message}`;
    }
  })();
}

try {
  await client.connect();
  console.log(`Connected to loopback proof database "${guard.target.database}".`);

  const existingSchema = await client.query(
    'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
    [PROOF_SCHEMA]
  );
  if (existingSchema.rowCount > 0) {
    console.error(
      `\nBLOCKED [PROOF_SCHEMA_EXISTS]: schema "${PROOF_SCHEMA}" already exists in this database.\n` +
        'The runner will not drop or reuse it. Use a fresh decidix_proof_ database, or drop the\n' +
        'schema yourself after confirming it is disposable.\n'
    );
    await client.end();
    process.exit(2);
  }

  await client.query(`CREATE SCHEMA ${PROOF_SCHEMA}`);
  schemaCreatedByRun = true;

  try {
    await client.query(readFileSync(join(here, '001_schema.sql'), 'utf8'));
    await client.query(readFileSync(join(here, '002_fixtures.sql'), 'utf8'));
    console.log('Proof schema and synthetic fixtures loaded.\n');

    const activeId = async () =>
      (await client.query(`SELECT active_dataset_version_id AS id FROM ${PROOF_SCHEMA}.dataset_runtime_state`))
        .rows[0].id;

    const scores = async () =>
      (await client.query(`SELECT code, score FROM ${PROOF_SCHEMA}.active_region_scores ORDER BY code`)).rows
        .map((r) => `${r.code}=${Number(r.score).toFixed(2)}`)
        .join(',');

    const indexScore = async () =>
      Number((await client.query(`SELECT score FROM ${PROOF_SCHEMA}.active_national_index`)).rows[0]?.score);

    const metric = async (region) =>
      Number(
        (
          await client.query(
            `SELECT value FROM ${PROOF_SCHEMA}.active_regional_metrics WHERE region_id = $1`,
            [region]
          )
        ).rows[0]?.value
      );

    // --- A: ingest / validate / activate / read -----------------------------
    await client.query("SELECT proof.activate_dataset('ds_a', 'proof_runner', 'baseline A')");
    check('A1  activate A moves the active pointer to A', (await activeId()) === 'ds_a', String(await activeId()));
    check(
      'A2  active region scores equal A',
      (await scores()) === 'SA-01=80.00,SA-02=50.00',
      await scores()
    );
    check('A3  active national index equals A (70)', (await indexScore()) === 70, String(await indexScore()));
    check('A4  active frontier clinic density equals A (6)', (await metric('frontier')) === 6, String(await metric('frontier')));

    // --- B: ingest without touching A, activate, read -----------------------
    const aCountBefore = (
      await client.query("SELECT count(*)::int AS n FROM proof.region_observations WHERE dataset_version_id = 'ds_a'")
    ).rows[0].n;
    const aScoreBefore = Number(
      (
        await client.query(
          "SELECT score FROM proof.region_observations WHERE dataset_version_id = 'ds_a' AND region_id = 'central_capital'"
        )
      ).rows[0].score
    );

    await client.query("SELECT proof.activate_dataset('ds_b', 'proof_runner', 'candidate B')");

    const aCountAfter = (
      await client.query("SELECT count(*)::int AS n FROM proof.region_observations WHERE dataset_version_id = 'ds_a'")
    ).rows[0].n;
    const aScoreAfter = Number(
      (
        await client.query(
          "SELECT score FROM proof.region_observations WHERE dataset_version_id = 'ds_a' AND region_id = 'central_capital'"
        )
      ).rows[0].score
    );

    check('B1  activating B leaves A row count intact', aCountBefore === aCountAfter, `${aCountBefore} -> ${aCountAfter}`);
    check('B2  activating B leaves A observation values intact', aScoreBefore === aScoreAfter, `${aScoreBefore} -> ${aScoreAfter}`);
    check('B3  activate B moves the active pointer to B', (await activeId()) === 'ds_b', String(await activeId()));
    check(
      'B4  active region scores equal B',
      (await scores()) === 'SA-01=90.00,SA-02=60.00',
      await scores()
    );
    check('B5  active national index equals B (78)', (await indexScore()) === 78, String(await indexScore()));
    check('B6  active frontier clinic density equals B (9)', (await metric('frontier')) === 9, String(await metric('frontier')));

    // --- Roll back to A -----------------------------------------------------
    await client.query("SELECT proof.activate_dataset('ds_a', 'proof_runner', 'rollback to A')");
    const bRows = (
      await client.query("SELECT count(*)::int AS n FROM proof.region_observations WHERE dataset_version_id = 'ds_b'")
    ).rows[0].n;

    check('R1  rollback moves the active pointer back to A', (await activeId()) === 'ds_a', String(await activeId()));
    check(
      'R2  rollback restores A region scores',
      (await scores()) === 'SA-01=80.00,SA-02=50.00',
      await scores()
    );
    check('R3  rollback restores A national index (70)', (await indexScore()) === 70, String(await indexScore()));
    check('R4  rollback preserves B observations', bRows === 2, `B rows=${bRows}`);

    // --- Edge: invalid activation ------------------------------------------
    const pointerBeforeInvalid = await activeId();
    const invalidResult = await expectReject('DATASET_NOT_VALIDATED', () =>
      client.query("SELECT proof.activate_dataset('ds_invalid', 'proof_runner', 'must fail')")
    );
    check('E1  invalid (not validated) dataset activation is rejected', invalidResult === '', invalidResult);
    check(
      'E2  rejected activation leaves the pointer unchanged',
      (await activeId()) === pointerBeforeInvalid,
      `pointer=${await activeId()}`
    );

    // --- Edge: duplicate observation ---------------------------------------
    const dupResult = await expectReject('23505', () =>
      client.query(
        `INSERT INTO proof.regional_metric_observations
           (dataset_version_id, region_id, indicator_key, reference_period, year, value)
         VALUES ('ds_a', 'frontier', 'clinic_density', '2025', 2025, 99)`
      )
    );
    check('E3  duplicate observation inside one version is rejected (23505)', dupResult === '', dupResult);

    // --- Edge: cross-version isolation -------------------------------------
    const isolation = (
      await client.query(
        `SELECT o.dataset_version_id,
                max(o.score) FILTER (WHERE o.region_id = 'frontier') AS frontier
           FROM proof.region_observations o
          WHERE o.dataset_version_id IN ('ds_a', 'ds_b')
          GROUP BY o.dataset_version_id ORDER BY 1`
      )
    ).rows;
    const isolated =
      isolation.length === 2 && Number(isolation[0].frontier) === 50 && Number(isolation[1].frontier) === 60;
    check('E4  shared region keys stay isolated per version (50 vs 60)', isolated, JSON.stringify(isolation));

    // --- Edge: concurrent activation ---------------------------------------
    const race1 = new pg.Client({ connectionString: proofUrl });
    const race2 = new pg.Client({ connectionString: proofUrl });
    await Promise.all([race1.connect(), race2.connect()]);
    try {
      await Promise.all([
        (async () => {
          await race1.query('BEGIN');
          await race1.query('SELECT pg_sleep(0.6)');
          await race1.query("SELECT proof.activate_dataset('ds_b', 'race_1', 'concurrent B')");
          await race1.query('COMMIT');
        })(),
        (async () => {
          await race2.query('BEGIN');
          await race2.query('SELECT pg_sleep(0.1)');
          await race2.query("SELECT proof.activate_dataset('ds_a', 'race_2', 'concurrent A')");
          await race2.query('COMMIT');
        })(),
      ]);
    } finally {
      await Promise.all([race1.end(), race2.end()]);
    }

    const raceState = (
      await client.query(
        `SELECT s.active_dataset_version_id AS active,
                (SELECT count(*)::int FROM proof.dataset_activation_events WHERE actor LIKE 'race_%') AS events
           FROM proof.dataset_runtime_state s`
      )
    ).rows[0];
    check(
      'E5  concurrent activation leaves exactly one active pointer',
      ['ds_a', 'ds_b'].includes(raceState.active) && (await activeId()) === raceState.active,
      JSON.stringify(raceState)
    );
    check('E6  concurrent activation audits both attempts', raceState.events === 2, JSON.stringify(raceState));

    // --- Edge: transaction rollback after simulated failure ---------------
    await client.query(
      `INSERT INTO proof.dataset_versions
         (id, version, source, license, coverage, validation_status, created_by)
       VALUES ('ds_fail', 'proof-fail', 'synthetic failure probe', 'test-only', 'two regions', 'validated', 'proof_runner')`
    );
    let failureCaught = false;
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO proof.regional_metric_observations
           (dataset_version_id, region_id, indicator_key, reference_period, year, value)
         VALUES ('ds_fail', 'frontier', 'clinic_density', '2025', 2025, 1)`
      );
      await client.query("DO $$ BEGIN RAISE EXCEPTION 'simulated failure'; END $$");
      await client.query('COMMIT');
    } catch {
      failureCaught = true;
      await client.query('ROLLBACK');
    }
    const orphanRows = (
      await client.query(
        "SELECT count(*)::int AS n FROM proof.regional_metric_observations WHERE dataset_version_id = 'ds_fail'"
      )
    ).rows[0].n;
    check('E7  simulated mid-transaction failure is raised', failureCaught);
    check('E8  failed transaction leaves no partial version rows', orphanRows === 0, `rows=${orphanRows}`);

    // --- Edge: provenance retention and delete restriction ----------------
    const provenance = (
      await client.query(
        `SELECT dataset_version_id, count(*)::int AS records
           FROM proof.dataset_records GROUP BY 1 ORDER BY 1`
      )
    ).rows;
    // PostgreSQL raises restrict_violation (23001) for ON DELETE RESTRICT; NO ACTION
    // would raise foreign_key_violation (23503). Both mean the delete was blocked.
    const restrict = await expectReject('23001', () =>
      client.query("DELETE FROM proof.dataset_versions WHERE id = 'ds_a'")
    );
    check('E9  raw records are retained for both versions', provenance.length === 2, JSON.stringify(provenance));
    check('E10 deleting a version with evidence is restricted', restrict === '', restrict);
  } catch (error) {
    check('RUN completed without an unexpected exception', false, error?.message);
  }
} catch (error) {
  console.error(`\nABORTED: ${redact(error?.message)}\n`);
  results.push({ name: 'connect', ok: false });
} finally {
  const cleanup = planCleanup({ schemaCreatedByRun });
  if (cleanup.dropSchema) {
    try {
      await client.query(`DROP SCHEMA ${cleanup.schema} CASCADE`);
      console.log(`\nCleaned up schema "${cleanup.schema}" created by this run.`);
    } catch (error) {
      console.error(`Cleanup failed: ${redact(error?.message)}`);
    }
  } else {
    console.log('\nNo schema was created by this run; nothing was dropped.');
  }
  await client.end().catch(() => {});
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} proof assertions passed.`);
if (failed.length > 0) {
  console.error('FAILED ASSERTIONS:');
  for (const failure of failed) console.error(` - ${failure.name}`);
  process.exit(1);
}
console.log('PROOF PASSED against real PostgreSQL.');
