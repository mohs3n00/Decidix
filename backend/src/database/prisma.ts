import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Global declaration to prevent multiple client instances during hot reloading in dev
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  let dbUrl = env.DATABASE_URL;

  try {
    const urlObj = new URL(dbUrl);
    // Explicitly enforce safe connection pool limit for Heroku Essential-0 (max 20 connections total)
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', '5');
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '10');
    }

    // In production or when DATABASE_SSL is enabled, negotiate SSL with self-signed certificate acceptance
    if (env.NODE_ENV === 'production' || env.DATABASE_SSL) {
      if (!urlObj.searchParams.has('sslmode')) {
        urlObj.searchParams.set('sslmode', 'no-verify');
      }
    }
    dbUrl = urlObj.toString();
  } catch (_err) {
    // If dbUrl is not standard URL, use unmodified
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log:
      env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });
}

export const prisma = global.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

let isDbReachable: boolean | null = null;

/**
 * Returns whether PostgreSQL is currently reachable.
 * Cached after first check unless forceRefresh is true.
 */
export async function testPrismaConnection(forceRefresh = false): Promise<boolean> {
  if (isDbReachable !== null && !forceRefresh) {
    return isDbReachable;
  }

  try {
    // Lightweight raw ping
    await prisma.$queryRaw`SELECT 1`;
    isDbReachable = true;
    logger.info('Prisma Client connected to PostgreSQL successfully.');
    return true;
  } catch (error: any) {
    isDbReachable = false;
    const errorCode = error?.code || error?.name || 'UNKNOWN';
    if (env.NODE_ENV === 'production') {
      logger.error('CRITICAL: Production PostgreSQL connection failed via Prisma', {
        code: errorCode,
        message: error?.message,
      });
    } else {
      logger.warn(
        `PostgreSQL is not reachable (${errorCode}). Backend will use in-memory repository fallback.`,
        { code: errorCode }
      );
    }
    return false;
  }
}

/**
 * Gracefully disconnects Prisma connection pool on shutdown signals.
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Prisma Client disconnected cleanly.');
  } catch (error) {
    logger.error('Error during Prisma Client disconnect', error);
  }
}

