import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rate_limit.js';
import { AdminService } from '../../services/admin.service.js';

export const adminRouter = Router();

// Enforce strict authentication and ADMIN role for all routes in this router
adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

const sendNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  body: z.string().min(1, 'Message body is required').max(500),
  target_audience: z.enum(['all', 'user', 'test']),
  target_user_id: z.string().optional(),
  arabic_title: z.string().max(120).optional(),
  arabic_body: z.string().max(500).optional(),
  data: z.record(z.string()).optional(),
});

/**
 * GET /v1/admin/dashboard
 * Aggregated platform metrics and KPI summary cards.
 */
adminRouter.get(
  '/dashboard',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const period = (req.query.period as string) || '30d';
      const dashboard = await AdminService.getDashboard(period);
      sendSuccess(res, dashboard);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/admin/analytics
 * Feature usage distribution, daily trends, and module activity.
 */
adminRouter.get(
  '/analytics',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const period = (req.query.period as string) || '30d';
      const analytics = await AdminService.getAnalytics(period);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/admin/users
 * Searchable, filterable paginated user accounts list.
 */
adminRouter.get(
  '/users',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await AdminService.listUsers({ search, status, page, limit });
      sendSuccess(res, result.users, { page: result.page, per_page: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/admin/users/:id
 * Detailed account metadata and dataset statistics.
 * PRIVACY GUARANTEE: Never exposes dataset records or chat prompts.
 */
adminRouter.get(
  '/users/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const details = await AdminService.getUserDetails(req.params.id);
      sendSuccess(res, details);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/admin/users/:id/suspend
 * Temporarily suspends account, invalidating sessions.
 */
adminRouter.post(
  '/users/:id/suspend',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await AdminService.suspendUser(req.user!.id, req.params.id, req.ip);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/admin/users/:id/reactivate
 * Reactivates a suspended user account.
 */
adminRouter.post(
  '/users/:id/reactivate',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await AdminService.reactivateUser(req.user!.id, req.params.id, req.ip);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /v1/admin/users/:id
 * Safely soft-deletes account, revoking sessions while preserving lineage.
 */
adminRouter.delete(
  '/users/:id',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await AdminService.deleteUser(req.user!.id, req.params.id, req.ip);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/admin/datasets/statistics
 * Platform-wide dataset format and storage statistics.
 */
adminRouter.get(
  '/datasets/statistics',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await AdminService.getDatasetStatistics();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/admin/notifications/send
 * Composes and executes push notification campaigns via FCM.
 */
adminRouter.post(
  '/notifications/send',
  authRateLimiter,
  validateRequest({ body: sendNotificationSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, body, target_audience, target_user_id, arabic_title, arabic_body, data } = req.body;
      const result = await AdminService.sendNotification(req.user!.id, {
        title,
        body,
        targetAudience: target_audience,
        targetUserId: target_user_id,
        arabicTitle: arabic_title,
        arabicBody: arabic_body,
        data,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/admin/notifications/history
 * Returns past push notification campaigns and delivery counts.
 */
adminRouter.get(
  '/notifications/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const history = await AdminService.getNotificationHistory(page, limit);
      sendSuccess(res, history.campaigns, { page: history.page, per_page: history.limit, total: history.total });
    } catch (error) {
      next(error);
    }
  }
);
