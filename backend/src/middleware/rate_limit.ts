import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates an in-memory rate limiting middleware per client IP.
 * Operates purely in-memory without requiring Redis or external stores.
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

  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.skipInTest && process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
    const key = `${req.baseUrl || ''}:${req.path}:${clientIp}`;
    const now = Date.now();

    let record = store.get(key);

    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + options.windowMs };
      store.set(key, record);
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
      return next();
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
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
 * Protects login and token refresh endpoints against brute-force attacks.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again after one minute.',
  skipInTest: true,
});

/**
 * AI Assistant rate limiter: 20 requests per minute per IP.
 * Enforces strict alignment with OpenRouter free-tier quota (20 req/min).
 */
export const assistantRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'AI Assistant request quota reached (max 20 req/min). Please try again shortly.',
  skipInTest: true,
});

/**
 * Citizen reports rate limiter: 30 requests per minute per IP.
 * Protects citizen report submissions and likes against automated spamming.
 */
export const reportsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many citizen report actions from this IP. Please slow down.',
  skipInTest: true,
});

/**
 * What-If Simulation rate limiter: 30 requests per minute per IP.
 * Protects decision simulation computational engine against exhaustion.
 */
export const simulationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many simulation requests from this IP. Please wait a moment.',
  skipInTest: true,
});

/**
 * Administrative action rate limiter: 30 requests per minute per IP.
 * Protects admin user management and session revocation operations.
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many administrative requests from this IP. Please slow down.',
  skipInTest: true,
});

/**
 * General Public API rate limiter: 120 requests per minute per IP.
 * Protects public unauthenticated endpoints against aggressive scraping / DDoS.
 */
export const publicApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Global API rate limit exceeded. Please try again later.',
  skipInTest: true,
});
