import { describe, expect, it } from 'vitest';
import { evaluateGuard, parseTarget, planCleanup, PROOF_SCHEMA } from '../prisma/proof/guard.mjs';

// These tests never connect to a database. They lock in the refusal rules that
// protect the project's configured database from the proof runner.
const APP_URL = 'postgresql://decidix_app:app-secret@localhost:5432/decidix';
const VALID = 'postgresql://proof:proof-secret@localhost:5432/decidix_proof_v1';

describe('proof runner guard', () => {
  it('refuses to run without an explicit proof URL', () => {
    const result = evaluateGuard({ proofUrl: undefined });
    expect(result).toEqual({ ok: false, code: 'MISSING_PROOF_URL', message: expect.any(String) });
  });

  it('refuses a non-postgresql URL', () => {
    expect(evaluateGuard({ proofUrl: 'mysql://localhost/decidix_proof_v1' })).toMatchObject({
      ok: false,
      code: 'INVALID_PROOF_URL',
    });
  });

  it('refuses a URL without a database name', () => {
    expect(evaluateGuard({ proofUrl: 'postgresql://proof@localhost:5432/' })).toMatchObject({
      ok: false,
      code: 'INVALID_PROOF_URL',
    });
  });

  it('refuses a remote host even when the database name looks correct', () => {
    const result = evaluateGuard({ proofUrl: 'postgresql://proof@db.example.com:5432/decidix_proof_v1' });
    expect(result).toMatchObject({ ok: false, code: 'NON_LOOPBACK_HOST' });
    expect(result.message).toContain('db.example.com');
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])('accepts loopback host %s', (host) => {
    const result = evaluateGuard({ proofUrl: `postgresql://proof@${host}:5432/decidix_proof_v1` });
    expect(result.ok).toBe(true);
  });

  it('refuses a database that does not use the proof prefix', () => {
    expect(evaluateGuard({ proofUrl: 'postgresql://proof@localhost:5432/decidix' })).toMatchObject({
      ok: false,
      code: 'NON_PROOF_DATABASE',
    });
  });

  it('refuses the prefix with no suffix', () => {
    expect(evaluateGuard({ proofUrl: 'postgresql://proof@localhost:5432/decidix_proof_' })).toMatchObject({
      ok: false,
      code: 'NON_PROOF_DATABASE',
    });
  });

  it('refuses a database name that only contains the prefix as a substring', () => {
    expect(evaluateGuard({ proofUrl: 'postgresql://proof@localhost:5432/my_decidix_proof_v1' })).toMatchObject({
      ok: false,
      code: 'NON_PROOF_DATABASE',
    });
  });

  it('refuses the configured application database even with different credentials', () => {
    expect(evaluateGuard({ proofUrl: VALID, appDatabaseUrl: APP_URL }).ok).toBe(true);
    expect(
      evaluateGuard({
        proofUrl: 'postgresql://someone:else@127.0.0.1:5432/decidix_proof_v1',
        appDatabaseUrl: 'postgresql://decidix_app:app-secret@127.0.0.1:5432/decidix_proof_v1',
      })
    ).toMatchObject({ ok: false, code: 'PROOF_URL_MATCHES_APP' });
  });

  it('compares host, port and database, not credentials', () => {
    const result = evaluateGuard({
      proofUrl: 'postgresql://proof:one@localhost:5432/decidix_proof_v1',
      appDatabaseUrl: 'postgresql://app:two@localhost:5432/decidix_proof_v1',
    });
    expect(result).toMatchObject({ ok: false, code: 'PROOF_URL_MATCHES_APP' });
  });

  it('allows a proof database on the same server as the application', () => {
    const result = evaluateGuard({ proofUrl: VALID, appDatabaseUrl: APP_URL });
    expect(result.ok).toBe(true);
  });

  it('never exposes credentials in the guard result', () => {
    const accepted = evaluateGuard({ proofUrl: VALID, appDatabaseUrl: APP_URL });
    const rejected = evaluateGuard({ proofUrl: VALID, appDatabaseUrl: 'postgresql://app:app-secret@localhost:5432/decidix_proof_v1' });
    const rendered = JSON.stringify([accepted, rejected]);
    expect(rendered).not.toContain('proof-secret');
    expect(rendered).not.toContain('app-secret');
    expect(rendered).not.toContain('postgresql://');
  });

  it('does not treat a missing application URL as a match', () => {
    expect(evaluateGuard({ proofUrl: VALID, appDatabaseUrl: null }).ok).toBe(true);
  });

  it('parses targets without returning a password field', () => {
    const target = parseTarget(VALID);
    expect(target).toMatchObject({ host: 'localhost', port: '5432', database: 'decidix_proof_v1' });
    expect(Object.keys(target)).not.toContain('password');
  });
});

describe('proof runner cleanup plan', () => {
  it('drops the proof schema only when this run created it', () => {
    expect(planCleanup({ schemaCreatedByRun: true })).toEqual({
      dropSchema: true,
      schema: PROOF_SCHEMA,
      dropDatabase: false,
    });
  });

  it('never drops a pre-existing schema', () => {
    expect(planCleanup({ schemaCreatedByRun: false }).dropSchema).toBe(false);
  });

  it('never drops a database', () => {
    expect(planCleanup({ schemaCreatedByRun: true }).dropDatabase).toBe(false);
    expect(planCleanup({ schemaCreatedByRun: false }).dropDatabase).toBe(false);
  });
});
