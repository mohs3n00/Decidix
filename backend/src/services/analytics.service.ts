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
  /**
   * Strict allowlist of safe, non-sensitive telemetry metadata keys.
   * Any key not explicitly in this allowlist is discarded to prevent sensitive data,
   * dataset rows, prompts, responses, conversations, or unexpected fields from entering analytics storage.
   */
  private static readonly ALLOWED_METADATA_KEYS = new Set([
    'tab',
    'screen',
    'view_mode',
    'theme',
    'locale',
    'filter',
    'step',
    'action',
    'source',
    'sector',
    'region_id',
    'regionid',
    'indicator',
    'indicator_id',
    'indicatorid',
    'format',
    'file_type',
    'period',
    'range',
    'status',
    'count',
    'year',
    'budget_range',
    'scenario_id',
    'simulation_id',
  ]);

  /**
   * Sanitizes metadata using strict allowlisting.
   * Only allowlisted keys with primitive scalar values (string, number, boolean) are retained.
   * Discards nested objects, arrays, unrecognized keys, and sensitive data.
   */
  public static sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;

    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(meta)) {
      const lowerKey = key.toLowerCase();
      // Strict allowlist check
      if (!this.ALLOWED_METADATA_KEYS.has(lowerKey)) {
        continue;
      }
      // Strict primitive scalar check (rejects nested objects, arrays, functions)
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.length > 0) {
          clean[lowerKey] = trimmed.slice(0, 100);
        }
      } else if (typeof val === 'number' && Number.isFinite(val)) {
        clean[lowerKey] = val;
      } else if (typeof val === 'boolean') {
        clean[lowerKey] = val;
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
