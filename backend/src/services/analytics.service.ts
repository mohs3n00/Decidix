import { prisma, testPrismaConnection } from '../database/prisma.js';
import { AuthRepository } from '../repositories/auth.repository.js';
import { logger } from '../utils/logger.js';

export interface ActivityEventInput {
  userId?: string | null;
  module: 'overview' | 'insights' | 'intelligence' | 'decisions' | 'datasets' | 'assistant';
  eventType: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  private static readonly DISALLOWED_METADATA_KEYS = new Set([
    'prompt',
    'response',
    'content',
    'password',
    'token',
    'secret',
    'rows',
    'records',
    'payload',
    'query',
  ]);

  /**
   * Sanitizes metadata to strictly exclude any user input, prompts, responses, or dataset rows.
   */
  private static sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta || typeof meta !== 'object') return undefined;

    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(meta)) {
      const lowerKey = key.toLowerCase();
      if (this.DISALLOWED_METADATA_KEYS.has(lowerKey)) {
        continue;
      }
      // Only keep primitive or safe descriptive fields (e.g. format, sector, regionId, tabIndex)
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        clean[key] = String(val).slice(0, 100);
      }
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  }

  /**
   * Records a user activity event with privacy guarantees.
   */
  static async trackActivity(input: ActivityEventInput): Promise<void> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady) return;

    try {
      const safeMeta = this.sanitizeMetadata(input.metadata);

      await prisma.activityLog.create({
        data: {
          userId: input.userId || null,
          module: input.module,
          eventType: input.eventType,
          metadata: safeMeta,
        },
      });

      if (input.userId) {
        await AuthRepository.updateLastActive(input.userId);
      }
    } catch (err: any) {
      logger.debug(`[ANALYTICS] Failed to record activity event: ${err.message}`);
    }
  }
}
