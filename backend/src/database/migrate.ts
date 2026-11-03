import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbPool, testDbConnection } from './pool.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const isAvailable = await testDbConnection();
  if (!isAvailable) {
    logger.warn('Skipping SQL migrations execution: PostgreSQL is not currently reachable at DATABASE_URL.');
    return;
  }

  const localDir = path.join(__dirname, 'migrations');
  const srcDir = path.join(__dirname, '../../src/database/migrations');
  const migrationsDir = fs.existsSync(localDir) ? localDir : srcDir;

  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Migrations directory not found at ${migrationsDir}. Skipping raw SQL migrations.`);
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  logger.info(`Found ${files.length} migration file(s)`);

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const res = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
      if (res.rows.length === 0) {
        logger.info(`Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        logger.info(`Applied migration: ${file} successfully.`);
      } else {
        logger.debug(`Migration ${file} already applied.`);
      }
    }
    await client.query('COMMIT');
    logger.info('All database migrations applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to run database migrations', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

