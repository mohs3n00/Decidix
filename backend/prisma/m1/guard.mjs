// Pure safety guards for the M1 migration rehearsal.
//
// No database connection, no filesystem access, no environment reads: every
// input is passed in, so the rejection cases are testable without PostgreSQL.
// Nothing here ever returns or logs a password or a full connection URL.

export const REHEARSAL_DATABASE_PATTERN = /^decidix_m1_[a-z0-9_]+$/;
export const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Parses a postgresql:// URL into the parts the guards need. */
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
    user: decodeURIComponent(parsed.username),
  };
}

/**
 * A rehearsal may only target a dedicated, disposable loopback database.
 * Returns { ok: true, target } or { ok: false, code, message }.
 */
export function evaluateGuard({ databaseUrl, appDatabaseUrl } = {}) {
  if (!databaseUrl || !String(databaseUrl).trim()) {
    return {
      ok: false,
      code: 'MISSING_DATABASE_URL',
      message:
        'M1_DATABASE_URL is not set. The rehearsal needs an explicitly named, disposable loopback database.',
    };
  }

  let target;
  try {
    target = parseTarget(databaseUrl);
  } catch {
    return {
      ok: false,
      code: 'INVALID_DATABASE_URL',
      message: 'M1_DATABASE_URL is not a valid postgresql:// URL with a database name.',
    };
  }

  if (!LOOPBACK_HOSTS.has(target.host)) {
    return {
      ok: false,
      code: 'NON_LOOPBACK_HOST',
      message: `host "${target.host}" is not loopback. Only localhost, 127.0.0.1 and ::1 are allowed.`,
    };
  }

  if (!REHEARSAL_DATABASE_PATTERN.test(target.database)) {
    return {
      ok: false,
      code: 'NON_REHEARSAL_DATABASE',
      message:
        `database "${target.database}" is not an approved rehearsal database. ` +
        `The name must match ${REHEARSAL_DATABASE_PATTERN}.`,
    };
  }

  if (appDatabaseUrl) {
    let app = null;
    try {
      app = parseTarget(appDatabaseUrl);
    } catch {
      app = null;
    }
    if (app && app.host === target.host && app.port === target.port && app.database === target.database) {
      return {
        ok: false,
        code: 'URL_MATCHES_APP',
        message:
          'M1_DATABASE_URL resolves to the same host, port and database as the configured application DATABASE_URL.',
      };
    }
  }

  return { ok: true, target };
}

/** Only system schemas may exist besides `public`; anything else means the
 *  database may hold someone else's data and the rehearsal must refuse. */
export function evaluateExistingSchemas(schemaNames) {
  const foreign = schemaNames.filter(
    (name) => !['public', 'information_schema'].includes(name) && !/^pg_/.test(name)
  );
  return foreign.length === 0
    ? { ok: true }
    : {
        ok: false,
        code: 'FOREIGN_SCHEMAS_PRESENT',
        message: `database contains non-system schema(s): ${foreign.join(', ')}. Refusing to reset it.`,
      };
}

/** Patterns that must never appear in a migration script under any scenario. */
const FORBIDDEN = [
  { code: 'DROP_TABLE', pattern: /\bdrop\s+table\b/i },
  { code: 'TRUNCATE', pattern: /\btruncate\b/i },
  { code: 'DELETE_FROM', pattern: /\bdelete\s+from\b/i },
  { code: 'DROP_COLUMN', pattern: /\bdrop\s+column\b/i },
  { code: 'DROP_SCHEMA', pattern: /\bdrop\s+schema\b/i },
  { code: 'DROP_DATABASE', pattern: /\bdrop\s+database\b/i },
  { code: 'ALTER_COLUMN_TYPE', pattern: /\balter\s+column\s+\w+\s+type\b/i },
];

/**
 * Audits the M1 scripts themselves, before they touch a database.
 * `allowedDropConstraints` lists the only FK replacements M1 is permitted to
 * perform (the dataset_records evidence FK).
 */
export function auditScripts({
  schemaSql = '',
  backfillSql = '',
  indexSql = '',
  allowedDropConstraints = ['dataset_records_dataset_version_id_fkey'],
} = {}) {
  const violations = [];

  for (const [name, text] of [
    ['001_schema.sql', schemaSql],
    ['002_backfill.sql', backfillSql],
    ['003_indexes.sql', indexSql],
  ]) {
    for (const { code, pattern } of FORBIDDEN) {
      if (pattern.test(text)) violations.push({ script: name, code });
    }
  }

  // DROP CONSTRAINT is only permitted for the documented FK replacement.
  for (const match of schemaSql.matchAll(/\bdrop\s+constraint\s+(?:if\s+exists\s+)?"?([a-z0-9_]+)"?/gi)) {
    if (!allowedDropConstraints.includes(match[1])) {
      violations.push({ script: '001_schema.sql', code: `DROP_CONSTRAINT:${match[1]}` });
    }
  }

  // CONCURRENTLY cannot run inside a transaction, and 001/002 are transactional.
  for (const [name, text] of [
    ['001_schema.sql', schemaSql],
    ['002_backfill.sql', backfillSql],
  ]) {
    if (/\bconcurrently\b/i.test(text)) {
      violations.push({ script: name, code: 'CONCURRENTLY_IN_TRANSACTIONAL_SCRIPT' });
    }
  }

  // 003 must never open its own transaction around concurrent builds.
  if (/\b(begin|commit|rollback)\b/i.test(indexSql.replace(/--[^\n]*/g, ''))) {
    violations.push({ script: '003_indexes.sql', code: 'TRANSACTION_CONTROL_IN_INDEX_SCRIPT' });
  }

  return { ok: violations.length === 0, violations };
}

/** Splits a script of simple statements into individual statements. Refuses a
 *  script it cannot split safely (dollar-quoted bodies belong in 001, which is
 *  executed as one multi-statement query).
 *
 *  Line comments are removed before splitting: a semicolon inside a comment
 *  (e.g. "an INVALID index; check pg_index") must not terminate a statement.
 *  The scripts this serves carry no string literal containing `--`. */
export function splitStatements(sql) {
  if (/\$\$/.test(sql)) throw new Error('splitStatements refuses dollar-quoted bodies');
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part};`);
}

/** Legacy tables whose pre-existing rows must be preserved byte-for-byte. */
export const LEGACY_TABLES = [
  'users',
  'regions',
  'indicators',
  'regional_metrics',
  'national_index_history',
  'sector_breakdowns',
  'development_projects',
  'citizen_reports',
  'ai_recommendations',
  'dataset_metadata',
  'dataset_versions',
  'dataset_records',
  'rag_documents',
  'ml_forecasts',
  'audit_logs',
];

export const M1_NEW_TABLES = [
  'dataset_runtime_state',
  'dataset_activation_events',
  'indicator_definitions',
  'region_boundaries',
  'region_relations',
  'region_observations',
  'national_index_observations',
  'regional_metric_observations',
  'sector_breakdown_observations',
  'observation_source_records',
  'model_runs',
  'migration_quarantine_records',
];
