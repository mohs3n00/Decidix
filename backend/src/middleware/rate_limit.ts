import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates an in-memory rate limiting middleware per client IP.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipInTest?: boolean;
}) {
  const store = new Map<string, RateLimitRecord>();

  // Periodically clean expired records to prevent unbounded memory growth
  const cleanupInterval = Math.max(60000, options.windowMs);
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, cleanupInterval).unref();

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (options.skipInTest && process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
    const key = `${req.baseUrl || ''}:${req.path}:${clientIp}`;
    const now = Date.now();

    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > options.maxRequests) {
      return next(
        AppError.tooManyRequests(
          options.message || 'Too many requests from this IP, please try again later.'
        )
      );
    }

    next();
  };
}

/**
 * Authentication route rate limiter: 10 requests per minute per IP.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again after one minute.',
  skipInTest: true,
});

