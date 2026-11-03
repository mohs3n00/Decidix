import { prisma, testPrismaConnection } from '../database/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

export interface DeviceTokenEntity {
  id: string;
  userId: string;
  token: string;
  platform: 'android' | 'ios';
  deviceModel?: string | null;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const localDeviceTokens = new Map<string, DeviceTokenEntity>();

export class DeviceTokenRepository {
  /**
   * Upserts a device token for a user.
   * If the token already exists, rotates/updates the ownership, platform, deviceModel,
   * reactivates the token if inactive, and refreshes lastSeenAt.
   */
  static async upsertToken(input: {
    userId: string;
    token: string;
    platform: 'android' | 'ios';
    deviceModel?: string | null;
  }): Promise<DeviceTokenEntity> {
    const isDbReady = await testPrismaConnection();
    const now = new Date();

    if (!isDbReady) {
      const existing = localDeviceTokens.get(input.token);
      if (existing) {
        existing.userId = input.userId;
        existing.platform = input.platform;
        existing.deviceModel = input.deviceModel ?? existing.deviceModel;
        existing.isActive = true;
        existing.lastSeenAt = now;
        existing.updatedAt = now;
        return existing;
      }

      const created: DeviceTokenEntity = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId: input.userId,
        token: input.token,
        platform: input.platform,
        deviceModel: input.deviceModel ?? null,
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      };
      localDeviceTokens.set(input.token, created);
      return created;
    }

    try {
      const result = await prisma.deviceToken.upsert({
        where: { token: input.token },
        update: {
          userId: input.userId,
          platform: input.platform,
          deviceModel: input.deviceModel ?? undefined,
          isActive: true,
          lastSeenAt: now,
        },
        create: {
          userId: input.userId,
          token: input.token,
          platform: input.platform,
          deviceModel: input.deviceModel ?? undefined,
          isActive: true,
          lastSeenAt: now,
        },
      });

      return {
        id: result.id,
        userId: result.userId,
        token: result.token,
        platform: result.platform as 'android' | 'ios',
        deviceModel: result.deviceModel,
        isActive: result.isActive,
        lastSeenAt: result.lastSeenAt,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;

      // Fallback
      const existing = localDeviceTokens.get(input.token);
      if (existing) {
        existing.userId = input.userId;
        existing.platform = input.platform;
        existing.deviceModel = input.deviceModel ?? existing.deviceModel;
        existing.isActive = true;
        existing.lastSeenAt = now;
        existing.updatedAt = now;
        return existing;
      }

      const created: DeviceTokenEntity = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId: input.userId,
        token: input.token,
        platform: input.platform,
        deviceModel: input.deviceModel ?? null,
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      };
      localDeviceTokens.set(input.token, created);
      return created;
    }
  }

  /**
   * Finds a device token record by raw token.
   */
  static async findByToken(token: string): Promise<DeviceTokenEntity | null> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      return localDeviceTokens.get(token) || null;
    }

    try {
      const record = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (!record) {
        return localDeviceTokens.get(token) || null;
      }

      return {
        id: record.id,
        userId: record.userId,
        token: record.token,
        platform: record.platform as 'android' | 'ios',
        deviceModel: record.deviceModel,
        isActive: record.isActive,
        lastSeenAt: record.lastSeenAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      return localDeviceTokens.get(token) || null;
    }
  }

  /**
   * Retrieves all active device tokens for a user.
   */
  static async findActiveTokensByUser(userId: string): Promise<DeviceTokenEntity[]> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      return Array.from(localDeviceTokens.values()).filter(
        (t) => t.userId === userId && t.isActive
      );
    }

    try {
      const records = await prisma.deviceToken.findMany({
        where: { userId, isActive: true },
        orderBy: { lastSeenAt: 'desc' },
      });

      return records.map((record) => ({
        id: record.id,
        userId: record.userId,
        token: record.token,
        platform: record.platform as 'android' | 'ios',
        deviceModel: record.deviceModel,
        isActive: record.isActive,
        lastSeenAt: record.lastSeenAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      return Array.from(localDeviceTokens.values()).filter(
        (t) => t.userId === userId && t.isActive
      );
    }
  }

  /**
   * Deactivates or removes a device token with ownership verification.
   */
  static async deactivateToken(token: string, userId?: string): Promise<{ success: boolean }> {
    const record = await this.findByToken(token);
    if (!record) {
      return { success: true };
    }

    // Verify token ownership: users cannot deactivate another user's device token
    if (userId && record.userId !== userId) {
      throw AppError.forbidden(
        'Cannot deactivate a device token registered to another user.',
        'TOKEN_OWNERSHIP_DENIED'
      );
    }

    const isDbReady = await testPrismaConnection();

    const local = localDeviceTokens.get(token);
    if (local) {
      local.isActive = false;
      local.updatedAt = new Date();
    }

    if (isDbReady) {
      try {
        await prisma.deviceToken.update({
          where: { token },
          data: { isActive: false },
        });
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }

    return { success: true };
  }

  /**
   * Batch deactivates invalid/expired tokens returned by FCM delivery results.
   */
  static async deactivateTokens(tokens: string[]): Promise<number> {
    if (!tokens || tokens.length === 0) return 0;

    for (const token of tokens) {
      const local = localDeviceTokens.get(token);
      if (local) {
        local.isActive = false;
        local.updatedAt = new Date();
      }
    }

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        const result = await prisma.deviceToken.updateMany({
          where: { token: { in: tokens } },
          data: { isActive: false },
        });
        return result.count;
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }

    return tokens.length;
  }

  /**
   * Testing helper to reset in-memory records.
   */
  static _resetLocal(): void {
    localDeviceTokens.clear();
  }
}

