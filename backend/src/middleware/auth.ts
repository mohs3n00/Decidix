import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

export type UserRole = 'admin' | 'analyst' | 'decision_maker' | 'planner' | 'viewer';

export type Permission =
  | 'data:read'
  | 'analytics:read'
  | 'predictions:read'
  | 'assistant:use'
  | 'simulation:run'
  | 'projects:read'
  | 'projects:manage'
  | 'citizen_reports:read'
  | 'citizen_reports:manage'
  | 'citizen_reports:like'
  | 'users:manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'data:read',
    'analytics:read',
    'predictions:read',
    'assistant:use',
    'simulation:run',
    'projects:read',
    'projects:manage',
    'citizen_reports:read',
    'citizen_reports:manage',
    'citizen_reports:like',
    'users:manage',
  ],
  decision_maker: [
    'data:read',
    'analytics:read',
    'predictions:read',
    'assistant:use',
    'simulation:run',
    'projects:read',
    'projects:manage',
    'citizen_reports:read',
    'citizen_reports:like',
  ],
  planner: [
    'data:read',
    'analytics:read',
    'predictions:read',
    'assistant:use',
    'simulation:run',
    'projects:read',
    'projects:manage',
    'citizen_reports:read',
    'citizen_reports:like',
  ],
  analyst: [
    'data:read',
    'analytics:read',
    'predictions:read',
    'assistant:use',
    'simulation:run',
    'projects:read',
    'citizen_reports:read',
    'citizen_reports:like',
  ],
  viewer: [
    'data:read',
    'projects:read',
    'citizen_reports:read',
  ],
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Optional authentication: decodes Bearer JWT if present, but permits anonymous guests.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
  } catch {
    // For optional auth, ignore invalid or expired tokens
  }
  next();
}

/**
 * Strict authentication: requires a valid, non-expired Bearer JWT.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token is required.', 'TOKEN_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized('Session has expired. Please sign in again.', 'SESSION_EXPIRED'));
    }
    return next(AppError.unauthorized('Invalid authentication token.', 'INVALID_TOKEN'));
  }
}

/**
 * Role-Based Access Control: ensures the user possesses one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required.', 'UNAUTHORIZED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource.`,
          'ROLE_NOT_AUTHORIZED'
        )
      );
    }
    next();
  };
}

/**
 * Permission-Based Access Control: verifies the user's role grants the required permission.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required.', 'UNAUTHORIZED'));
    }
    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!permissions.includes(permission)) {
      return next(
        AppError.forbidden(
          `User role '${req.user.role}' lacks permission '${permission}' for this action.`,
          'PERMISSION_DENIED'
        )
      );
    }
    next();
  };
}
