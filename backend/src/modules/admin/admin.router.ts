import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { sendSuccess } from '../../utils/response.js';
import { AuthRepository } from '../../repositories/auth.repository.js';
import { AuthService } from '../auth/auth.service.js';

export const adminRouter = Router();

/**
 * GET /v1/admin/users
 * Administrative user listing — strictly restricted to users with 'admin' role.
 */
adminRouter.get(
  '/admin/users',
  requireAuth,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await AuthRepository.listUsers();
      sendSuccess(res, { users });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/admin/users/:id/revoke-sessions
 * Administrative global session revocation for a specific user.
 */
adminRouter.post(
  '/admin/users/:id/revoke-sessions',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await AuthRepository.revokeAllUserSessions(id);
      sendSuccess(res, { message: `All sessions revoked for user ${id}` });
    } catch (error) {
      next(error);
    }
  }
);

