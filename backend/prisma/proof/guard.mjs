// Pure safety guards for the versioned-model proof runner.
//
// No database connection, no filesystem access, no environment reads: every
// input is passed in, so the rejection cases are testable without PostgreSQL.
// Nothing here ever returns or logs a password or a full connection URL.

export const PROOF_SCHEMA = 'proof';
export const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
export const PROOF_DATABASE_PATTERN = /^decidix_proof_[A-Za-z0-9_]+$/;

/**
 * Parses a postgresql:// URL into the parts the guards need.
 * Throws on a non-postgres protocol or a missing database name.
 */
export function parseTarget(connectionString) {
  const parsed = new URL(String(connectionString).trim());
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('unsupported protocol');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) throw new Error('missing database name');
  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || '5432',
    database,
    // Kept for comparisons only. Never logged, never rendered in messages.
    user: decodeURIComponent(parsed.username),
  };
}

/**
 * Decides whether a proof run may start.
 * Returns { ok: true, target } or { ok: false, code, message }.
 */
export function evaluateGuard({ proofUrl, appDatabaseUrl } = {}) {
  if (!proofUrl || !String(proofUrl).trim()) {
    return {
      ok: false,
      code: 'MISSING_PROOF_URL',
      message:
        'PROOF_DATABASE_URL is not set. This proof needs an explicitly named, disposable local database.',
    };
  }

  let target;
  try {
    target = parseTarget(proofUrl);
  } catch {
    return {
      ok: false,
      code: 'INVALID_PROOF_URL',
      message: 'PROOF_DATABASE_URL is not a valid postgresql:// URL with a database name.',
    };
  }

  if (!LOOPBACK_HOSTS.has(target.host)) {
    return {
      ok: false,
      code: 'NON_LOOPBACK_HOST',
      message: `host "${target.host}" is not loopback. Only localhost, 127.0.0.1 and ::1 are allowed.`,
    };
  }

  if (!PROOF_DATABASE_PATTERN.test(target.database)) {
    return {
      ok: false,
      code: 'NON_PROOF_DATABASE',
      message: `database "${target.database}" is not an approved proof database. The name must match ${PROOF_DATABASE_PATTERN}.`,
    };
  }

  if (appDatabaseUrl) {
    let app = null;
    try {
      app = parseTarget(appDatabaseUrl);
    } catch {
      app = null; // An unparseable app URL is not usable as a comparison target.
    }
    if (app && app.host === target.host && app.port === target.port && app.database === target.database) {
      return {
        ok: false,
        code: 'PROOF_URL_MATCHES_APP',
        message:
          'PROOF_DATABASE_URL resolves to the same host, port and database as the configured application DATABASE_URL.',
      };
    }
  }

  return { ok: true, target };
}

/**
 * Cleanup is permitted only for the schema this process created.
 * A pre-existing schema, a database, or any other object is never dropped.
 */
export function planCleanup({ schemaCreatedByRun }) {
  return {
    dropSchema: schemaCreatedByRun === true,
    schema: PROOF_SCHEMA,
    dropDatabase: false,
  };
}
