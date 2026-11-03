import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rate_limit.js';
import { AuthService } from './auth.service.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  arabic_name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'analyst', 'decision_maker', 'planner', 'viewer']).default('viewer'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refresh_token: z.string().optional(),
});

/**
 * POST /v1/auth/register
 * Registers a new user and returns user info with access token and refresh token.
 */
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, arabic_name, email, password, role } = req.body;
      const meta = {
        userAgent: req.headers['user-agent'],
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,
      };

      const result = await AuthService.register(
        { name, arabic_name, email, password, role },
        meta
      );

      sendSuccess(res, result, undefined, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/auth/login
 * Verifies credentials and returns access token and rotating refresh token.
 */
authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const meta = {
        userAgent: req.headers['user-agent'],
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,
      };

      const result = await AuthService.login({ email, password }, meta);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/auth/refresh
 * Rotates refresh token: revokes provided token and issues new access and refresh tokens.
 */
authRouter.post(
  '/refresh',
  authRateLimiter,
  validateRequest({ body: refreshSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refresh_token } = req.body;
      const meta = {
        userAgent: req.headers['user-agent'],
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,
      };

      const tokens = await AuthService.refresh(refresh_token, meta);
      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/auth/me
 * Retrieves current authenticated user record.
 */
authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await AuthService.getMe(req.user!.id);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/auth/logout
 * Revokes current session and refresh token.
 */
authRouter.post(
  '/logout',
  optionalAuth,
  validateRequest({ body: logoutSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refresh_token } = req.body;
      const result = await AuthService.logout(refresh_token, req.user?.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);
