import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rate_limit.js';
import { DeviceTokenRepository } from '../../repositories/device_token.repository.js';
import { FirebaseService } from '../../integrations/firebase.js';

export const notificationsRouter = Router();

const registerDeviceTokenSchema = z.object({
  token: z.string().min(10, 'FCM token must be at least 10 characters').max(512, 'FCM token exceeds maximum length'),
  platform: z.enum(['android', 'ios'], { errorMap: () => ({ message: "Platform must be either 'android' or 'ios'" }) }),
  device_model: z.string().max(128).optional(),
});

const unregisterDeviceTokenSchema = z.object({
  token: z.string().min(10, 'FCM token must be at least 10 characters'),
});

const sendNotificationSchema = z.object({
  user_id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(120),
  body: z.string().min(1, 'Body is required').max(500),
  arabic_title: z.string().max(120).optional(),
  arabic_body: z.string().max(500).optional(),
  data: z.record(z.string()).optional(),
});

/**
 * POST /v1/notifications/device-token
 * Registers or rotates a device token for the authenticated user.
 */
notificationsRouter.post(
  '/notifications/device-token',
  requireAuth,
  authRateLimiter,
  validateRequest({ body: registerDeviceTokenSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, platform, device_model } = req.body;
      const userId = req.user!.id;

      const device = await DeviceTokenRepository.upsertToken({
        userId,
        token: token.trim(),
        platform,
        deviceModel: device_model,
      });

      sendSuccess(
        res,
        {
          id: device.id,
          user_id: device.userId,
          token: device.token,
          platform: device.platform,
          device_model: device.deviceModel,
          is_active: device.isActive,
          last_seen_at: device.lastSeenAt,
        },
        undefined,
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /v1/notifications/device-token
 * Deactivates a device token. Enforces user ownership.
 */
notificationsRouter.delete(
  '/notifications/device-token',
  requireAuth,
  authRateLimiter,
  validateRequest({ body: unregisterDeviceTokenSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      const userId = req.user!.id;

      await DeviceTokenRepository.deactivateToken(token.trim(), userId);

      sendSuccess(res, {
        message: 'Device token deactivated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/notifications/send-test
 * Administrative diagnostic endpoint to verify push notification delivery.
 */
notificationsRouter.post(
  '/notifications/send-test',
  requireAuth,
  requireRole('admin'),
  validateRequest({ body: sendNotificationSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, title, body, arabic_title, arabic_body, data } = req.body;
      const targetUserId = user_id || req.user!.id;

      const delivery = await FirebaseService.sendToUser(targetUserId, {
        title,
        body,
        arabicTitle: arabic_title,
        arabicBody: arabic_body,
        data,
      });

      sendSuccess(res, {
        target_user_id: targetUserId,
        ...delivery,
      });
    } catch (error) {
      next(error);
    }
  }
);

