import { randomUUID } from 'crypto';
import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/response.js';
import { AdminRepository } from '../repositories/admin.repository.js';
import { AuthRepository } from '../repositories/auth.repository.js';
import { FirebaseService, NotificationPayload } from '../integrations/firebase.js';
import { logger } from '../utils/logger.js';

export class AdminService {
  private static parsePeriodDate(period?: string): Date | undefined {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
        return undefined;
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  static async getDashboard(period = '30d') {
    const startDate = this.parsePeriodDate(period);
    const kpis = await AdminRepository.getDashboardKPIs(startDate);
    const analytics = await AdminRepository.getPlatformAnalytics(startDate);

    return {
      period,
      kpis,
      analytics,
    };
  }

  static async getAnalytics(period = '30d') {
    const startDate = this.parsePeriodDate(period);
    return AdminRepository.getPlatformAnalytics(startDate);
  }

  static async listUsers(options: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return AdminRepository.listUsers(options);
  }

  static async getUserDetails(userId: string) {
    const details = await AdminRepository.getUserDetails(userId);
    if (!details) {
      throw AppError.notFound('User not found.');
    }
    return details;
  }

  static async suspendUser(adminUserId: string, targetUserId: string, ipAddress?: string) {
    if (adminUserId === targetUserId) {
      throw AppError.badRequest('Administrators cannot suspend their own account.', 'CANNOT_SUSPEND_SELF');
    }

    const targetUser = await AuthRepository.findById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Target user not found.');
    }

    if (targetUser.role === 'admin') {
      const activeAdmins = await AuthRepository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw AppError.badRequest('Cannot suspend the last active administrator.', 'CANNOT_SUSPEND_LAST_ADMIN');
      }
    }

    await AuthRepository.updateUserStatus(targetUserId, 'suspended');
    await AuthRepository.revokeAllUserSessions(targetUserId);

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'user_suspend',
          entityType: 'user',
          entityId: targetUserId,
          details: { targetEmail: targetUser.email, reason: 'Administrative suspension' },
          ipAddress,
        },
      });
    } catch {
      // Continue even if audit log write fails
    }

    logger.info(`[ADMIN] User ${targetUser.email} (${targetUserId}) suspended by admin ${adminUserId}.`);
    return {
      message: 'User account has been suspended and all active sessions revoked.',
      user_id: targetUserId,
      status: 'suspended',
    };
  }

  static async reactivateUser(adminUserId: string, targetUserId: string, ipAddress?: string) {
    const targetUser = await AuthRepository.findById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Target user not found.');
    }

    await AuthRepository.updateUserStatus(targetUserId, 'active');

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'user_reactivate',
          entityType: 'user',
          entityId: targetUserId,
          details: { targetEmail: targetUser.email },
          ipAddress,
        },
      });
    } catch {
      // Continue even if audit log write fails
    }

    logger.info(`[ADMIN] User ${targetUser.email} (${targetUserId}) reactivated by admin ${adminUserId}.`);
    return {
      message: 'User account has been reactivated successfully.',
      user_id: targetUserId,
      status: 'active',
    };
  }

  static async deleteUser(adminUserId: string, targetUserId: string, ipAddress?: string) {
    if (adminUserId === targetUserId) {
      throw AppError.badRequest('Administrators cannot delete their own account.', 'CANNOT_DELETE_SELF');
    }

    const targetUser = await AuthRepository.findById(targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Target user not found.');
    }

    if (targetUser.role === 'admin') {
      const activeAdmins = await AuthRepository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw AppError.badRequest('Cannot delete the last active administrator.', 'CANNOT_DELETE_LAST_ADMIN');
      }
    }

    // Soft-delete to preserve foreign key lineage and audit trail
    await AuthRepository.updateUserStatus(targetUserId, 'deleted');
    await AuthRepository.revokeAllUserSessions(targetUserId);

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'user_delete',
          entityType: 'user',
          entityId: targetUserId,
          details: {
            targetEmail: targetUser.email,
            deletionType: 'soft_delete',
            preservedLineage: 'Datasets, regional metrics, and audit logs preserved.',
          },
          ipAddress,
        },
      });
    } catch {
      // Continue even if audit log write fails
    }

    logger.info(`[ADMIN] User ${targetUser.email} (${targetUserId}) soft-deleted by admin ${adminUserId}.`);
    return {
      message: 'User account has been safely deleted and active sessions revoked.',
      user_id: targetUserId,
      status: 'deleted',
    };
  }

  static async getDatasetStatistics() {
    return AdminRepository.getDatasetStatistics();
  }

  static async sendNotification(adminUserId: string, input: {
    title: string;
    body: string;
    targetAudience: 'all' | 'user' | 'test';
    targetUserId?: string;
    arabicTitle?: string;
    arabicBody?: string;
    data?: Record<string, string>;
  }) {
    const campaignId = randomUUID();
    const payload: NotificationPayload = {
      title: input.title,
      body: input.body,
      arabicTitle: input.arabicTitle,
      arabicBody: input.arabicBody,
      data: input.data || {},
    };

    let targetTokens: string[] = [];

    if (input.targetAudience === 'test') {
      // Target admin's own device tokens
      const adminTokens = await prisma.deviceToken.findMany({
        where: { userId: adminUserId, isActive: true },
        select: { token: true },
      });
      targetTokens = adminTokens.map((t) => t.token);
    } else if (input.targetAudience === 'user') {
      if (!input.targetUserId) {
        throw AppError.badRequest('target_user_id is required when target_audience is "user".');
      }
      // Check user is active and not suspended/deleted
      const user = await prisma.user.findUnique({
        where: { id: input.targetUserId },
        select: { status: true, isActive: true },
      });
      if (!user || user.status === 'suspended' || user.status === 'deleted' || !user.isActive) {
        throw AppError.badRequest('Target user is suspended, deleted, or does not exist.');
      }
      const userTokens = await prisma.deviceToken.findMany({
        where: { userId: input.targetUserId, isActive: true },
        select: { token: true },
      });
      targetTokens = userTokens.map((t) => t.token);
    } else {
      // Target 'all' active, non-suspended users
      const activeTokens = await prisma.deviceToken.findMany({
        where: {
          isActive: true,
          user: {
            isActive: true,
            status: 'active',
          },
        },
        select: { token: true },
      });
      targetTokens = activeTokens.map((t) => t.token);
    }

    const delivery = await FirebaseService.sendMulticast(targetTokens, payload);

    const status = delivery.deliveredCount > 0
      ? (delivery.failedCount > 0 ? 'partial' : 'sent')
      : (delivery.targetedCount === 0 ? 'no_devices' : 'failed');

    await AdminRepository.recordNotificationCampaign({
      id: campaignId,
      title: input.title,
      body: input.body,
      arabicTitle: input.arabicTitle,
      arabicBody: input.arabicBody,
      targetAudience: input.targetAudience,
      targetUserId: input.targetUserId,
      status,
      targetedCount: delivery.targetedCount,
      deliveredCount: delivery.deliveredCount,
      failedCount: delivery.failedCount,
      sentBy: adminUserId,
    });

    return {
      campaign_id: campaignId,
      status,
      targeted_count: delivery.targetedCount,
      delivered_count: delivery.deliveredCount,
      failed_count: delivery.failedCount,
      fcm_skipped: delivery.skipped ?? false,
      reason: delivery.reason,
    };
  }

  static async getNotificationHistory(page = 1, limit = 20) {
    return AdminRepository.getNotificationHistory(page, limit);
  }
}
