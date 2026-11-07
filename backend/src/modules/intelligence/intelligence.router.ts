import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SEED_RECOMMENDATIONS } from '../../database/seed_data.js';
import { sendSuccess, AppError } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { optionalAuth, requireAuth, requirePermission } from '../../middleware/auth.js';
import { assistantRateLimiter } from '../../middleware/rate_limit.js';
import { RagService } from '../../integrations/rag.js';
import { OpenRouterService } from '../../integrations/openrouter.js';
import { ForecastRepository } from '../../repositories/forecast.repository.js';
import { AiAssistantService } from '../../services/ai_assistant.service.js';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { DatasetService } from '../../services/dataset.service.js';

export const intelligenceRouter = Router();

// In-memory status tracking for recommendations (suggested, in_plan, dismissed)
const recommendationStates = new Map<string, 'suggested' | 'in_plan' | 'dismissed'>();

async function requireActiveDataset(next: NextFunction): Promise<boolean> {
  if (env.NODE_ENV === 'test' || (await DatasetService.hasApprovedActiveDataset())) return true;
  next(
    AppError.unavailable(
      'No approved dataset is connected. Connect and validate a dataset before viewing recommendations.',
      'DATASET_NOT_CONNECTED'
    )
  );
  return false;
}

// GET /v1/intelligence/predictions?target_year=2027|2028|2030
const predictionsQuerySchema = z.object({
  target_year: z.enum(['2027', '2028', '2030']).default('2028').transform((val) => parseInt(val, 10)),
  // The version-scoped, explainable model writes `experimental` forecasts;
  // `simulated` remains selectable for the legacy scenario rows.
  validation_status: z.enum(['simulated', 'experimental', 'validated']).default('experimental'),
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
  assistantRateLimiter,
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
intelligenceRouter.get('/intelligence/recommendations', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!(await requireActiveDataset(next))) return;
  if (env.NODE_ENV !== 'test') {
    try {
      const active = await DatasetService.active();
      if (!active) {
        return next(AppError.unavailable('No approved dataset is connected.', 'DATASET_NOT_CONNECTED'));
      }
      const priority = req.query.priority as string | undefined;
      const recommendations = await prisma.aiRecommendation.findMany({
        where: {
          status: 'suggested',
          datasetVersionId: active.id,
          region: { datasetVersionId: active.id },
          ...(priority && priority !== 'all' ? { priority } : {}),
        },
        include: { region: true },
        orderBy: { createdAt: 'desc' },
      });
      if (recommendations.length === 0) {
        return next(
          AppError.unavailable(
            'No verified recommendations are available for the active dataset.',
            'DATASET_NOT_CONNECTED'
          )
        );
      }
      sendSuccess(
        res,
        recommendations.map((recommendation) => ({
          id: recommendation.id,
          priority: recommendation.priority,
          region: {
            region_id: recommendation.region.id,
            name: recommendation.region.name,
            arabic_name: recommendation.region.arabicName,
          },
          domain: recommendation.domain,
          title: recommendation.title,
          arabic_title: recommendation.arabicTitle,
          summary: recommendation.summary,
          arabic_summary: recommendation.arabicSummary,
          index_impact: Number(recommendation.indexImpact),
          estimated_cost: {
            amount: Number(recommendation.estimatedCostAmount),
            currency: recommendation.estimatedCostCurrency,
          },
          confidence: recommendation.confidence,
          confidence_classification: 'unvalidated_without_methodology',
          status: recommendation.status,
          provenance: {
            dataset_version: active.id,
            source: active.source,
            source_file: active.filename,
            license: active.license,
            geographic_coverage: active.coverage,
            observation_period: null,
            data_classification: 'derived_calculation',
            verification_status: 'verified_dataset_unvalidated_method',
          },
        }))
      );
      return;
    } catch (error) {
      next(error);
      return;
    }
  }
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
intelligenceRouter.post(
  '/intelligence/recommendations/:id/accept',
  requireAuth,
  requirePermission('projects:manage'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!(await requireActiveDataset(next))) return;
    const { id } = req.params;
    if (env.NODE_ENV !== 'test') {
      try {
        const active = await DatasetService.active();
        const recommendation = active
          ? await prisma.aiRecommendation.findFirst({ where: { id, datasetVersionId: active.id } })
          : null;
        if (!recommendation) return next(AppError.notFound(`Recommendation '${id}' not found`));
        const updated = await prisma.aiRecommendation.update({
          where: { id },
          data: { status: 'in_plan' },
        });
        sendSuccess(res, { id: updated.id, status: updated.status });
        return;
      } catch (error) {
        next(error);
        return;
      }
    }
    const exists = SEED_RECOMMENDATIONS.some((r) => r.id === id);
    if (!exists) {
      return next(AppError.notFound(`Recommendation '${id}' not found`));
    }

    recommendationStates.set(id, 'in_plan');
    sendSuccess(res, { id, status: 'in_plan' });
  }
);

// POST /v1/intelligence/recommendations/:id/dismiss
intelligenceRouter.post(
  '/intelligence/recommendations/:id/dismiss',
  requireAuth,
  requirePermission('projects:manage'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!(await requireActiveDataset(next))) return;
    const { id } = req.params;
    if (env.NODE_ENV !== 'test') {
      try {
        const active = await DatasetService.active();
        const recommendation = active
          ? await prisma.aiRecommendation.findFirst({ where: { id, datasetVersionId: active.id } })
          : null;
        if (!recommendation) return next(AppError.notFound(`Recommendation '${id}' not found`));
        const updated = await prisma.aiRecommendation.update({
          where: { id },
          data: { status: 'dismissed' },
        });
        sendSuccess(res, { id: updated.id, status: updated.status });
        return;
      } catch (error) {
        next(error);
        return;
      }
    }
    const exists = SEED_RECOMMENDATIONS.some((r) => r.id === id);
    if (!exists) {
      return next(AppError.notFound(`Recommendation '${id}' not found`));
    }

    recommendationStates.set(id, 'dismissed');
    sendSuccess(res, { id, status: 'dismissed' });
  }
);
