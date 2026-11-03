import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const useSsl = env.DATABASE_SSL || env.NODE_ENV === 'production';

// Standalone script pool (max 2 connections, used only by standalone migrate.ts)
export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

let isConnected = false;

dbPool.on('connect', () => {
  if (!isConnected) {
    logger.info('Connected to PostgreSQL database');
    isConnected = true;
  }
});

dbPool.on('error', (err) => {
  logger.error('PostgreSQL client pool error', err);
});

export async function testDbConnection(): Promise<boolean> {
  try {
    const res = await dbPool.query('SELECT NOW()');
    return !!res.rows[0];
  } catch (error) {
    logger.warn('PostgreSQL database not currently reachable at DATABASE_URL. Memory repository will be used as operational fallback.', error);
    return false;
  }
}

/**
 * Gracefully disconnects the pg.Pool connection pool on shutdown signals.
 */
export async function disconnectPool(): Promise<void> {
  try {
    await dbPool.end();
    logger.info('PostgreSQL dbPool disconnected cleanly.');
  } catch (error) {
    logger.error('Error during PostgreSQL dbPool disconnect', error);
  }
}

