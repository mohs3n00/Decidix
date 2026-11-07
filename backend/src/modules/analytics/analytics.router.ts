import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { optionalAuth } from '../../middleware/auth.js';
import { AnalyticsService } from '../../services/analytics.service.js';

export const analyticsRouter = Router();

const trackEventSchema = z.object({
  module: z.enum(['overview', 'insights', 'intelligence', 'decisions', 'datasets', 'assistant']),
  event_type: z.string().min(1).max(64),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /v1/analytics/track
 * Privacy-preserving platform activity event ingestion.
 */
analyticsRouter.post(
  '/track',
  optionalAuth,
  validateRequest({ body: trackEventSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { module, event_type, metadata } = req.body;
      await AnalyticsService.trackActivity({
        userId: req.user?.id || null,
        module,
        eventType: event_type,
        metadata,
      });

      sendSuccess(res, { tracked: true }, undefined, 201);
    } catch (error) {
      next(error);
    }
  }
);
