import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SEED_RECOMMENDATIONS } from '../../database/seed_data.js';
import { sendSuccess, AppError } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { optionalAuth } from '../../middleware/auth.js';
import { RagService } from '../../integrations/rag.js';
import { OpenRouterService } from '../../integrations/openrouter.js';
import { ForecastRepository } from '../../repositories/forecast.repository.js';
import { AiAssistantService } from '../../services/ai_assistant.service.js';

export const intelligenceRouter = Router();

// In-memory status tracking for recommendations (suggested, in_plan, dismissed)
const recommendationStates = new Map<string, 'suggested' | 'in_plan' | 'dismissed'>();

// GET /v1/intelligence/predictions?target_year=2027|2028|2030
const predictionsQuerySchema = z.object({
  target_year: z.enum(['2027', '2028', '2030']).default('2028').transform((val) => parseInt(val, 10)),
  validation_status: z.enum(['validated', 'experimental']).default('validated').optional(),
});

intelligenceRouter.get(
  '/intelligence/predictions',
  validateRequest({ query: predictionsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { target_year, validation_status } = req.query as unknown as {
        target_year: number;
        validation_status?: string;
      };

      const response = await ForecastRepository.getPredictions(target_year, {
        validationStatus: validation_status,
      });

      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /v1/intelligence/assistant/chat
const chatBodySchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
  language: z.enum(['en', 'ar']).default('en'),
  conversation_id: z.string().nullable().optional(),
});

intelligenceRouter.post(
  '/intelligence/assistant/chat',
  optionalAuth,
  validateRequest({ body: chatBodySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, language, conversation_id } = req.body;
      const userId = req.user?.id;

      const response = await AiAssistantService.chat({
        message,
        language,
        conversationId: conversation_id,
        userId,
      });

      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/intelligence/recommendations?priority=
intelligenceRouter.get('/intelligence/recommendations', (req: Request, res: Response): void => {
  const priority = req.query.priority as string | undefined;

  let list = SEED_RECOMMENDATIONS.map((rec) => {
    const overrideStatus = recommendationStates.get(rec.id);
    return {
      ...rec,
      status: overrideStatus || rec.status,
    };
  });

  // Flutter API contract states: list returns 'suggested' items only
  list = list.filter((r) => r.status === 'suggested');

  if (priority && priority !== 'all') {
    list = list.filter((r) => r.priority === priority);
  }

  sendSuccess(res, list);
});

// POST /v1/intelligence/recommendations/:id/accept
intelligenceRouter.post('/intelligence/recommendations/:id/accept', (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  const exists = SEED_RECOMMENDATIONS.some((r) => r.id === id);
  if (!exists) {
    return next(AppError.notFound(`Recommendation '${id}' not found`));
  }

  recommendationStates.set(id, 'in_plan');
  sendSuccess(res, { id, status: 'in_plan' });
});

// POST /v1/intelligence/recommendations/:id/dismiss
intelligenceRouter.post('/intelligence/recommendations/:id/dismiss', (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  const exists = SEED_RECOMMENDATIONS.some((r) => r.id === id);
  if (!exists) {
    return next(AppError.notFound(`Recommendation '${id}' not found`));
  }

  recommendationStates.set(id, 'dismissed');
  sendSuccess(res, { id, status: 'dismissed' });
});

