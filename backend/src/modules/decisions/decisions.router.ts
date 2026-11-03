import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { optionalAuth } from '../../middleware/auth.js';
import { DecisionsRepository } from '../../repositories/decisions.repository.js';

export const decisionsRouter = Router();

// POST /v1/decisions/simulate
const simulateBodySchema = z.object({
  region_id: z.string().min(1, 'region_id is required'),
  allocations: z.object({
    education: z.number().nonnegative(),
    healthcare: z.number().nonnegative(),
    infrastructure: z.number().nonnegative(),
    economy: z.number().nonnegative(),
  }),
});

decisionsRouter.post(
  '/decisions/simulate',
  validateRequest({ body: simulateBodySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { region_id, allocations } = req.body as {
        region_id: string;
        allocations: { education: number; healthcare: number; infrastructure: number; economy: number };
      };

      const response = await DecisionsRepository.simulate(region_id, allocations);
      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/decisions/projects
const projectsQuerySchema = z.object({
  status: z.enum(['all', 'in_progress', 'planned', 'delayed', 'completed']).default('all'),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  per_page: z.string().optional().default('20').transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
});

decisionsRouter.get(
  '/decisions/projects',
  validateRequest({ query: projectsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, page, per_page } = req.query as unknown as {
        status: string;
        page: number;
        per_page: number;
      };

      const { summary, items, total } = await DecisionsRepository.getProjects({
        status,
        page,
        per_page,
      });

      sendSuccess(res, { summary, items }, { page, per_page, total });
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/decisions/citizen-reports
const reportsQuerySchema = z.object({
  category: z.enum(['all', 'roads', 'health', 'schools', 'water']).default('all'),
  status: z.string().optional(),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  per_page: z.string().optional().default('20').transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
});

decisionsRouter.get(
  '/decisions/citizen-reports',
  optionalAuth,
  validateRequest({ query: reportsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, status, page, per_page } = req.query as unknown as {
        category: string;
        status?: string;
        page: number;
        per_page: number;
      };

      const userIdentifier = req.user?.id || req.ip || 'anonymous';

      const { summary, items, total } = await DecisionsRepository.getCitizenReports({
        category,
        status,
        page,
        per_page,
        userIdentifier,
      });

      sendSuccess(res, { summary, items }, { page, per_page, total });
    } catch (error) {
      next(error);
    }
  }
);

// POST /v1/decisions/citizen-reports/:id/like
decisionsRouter.post(
  '/decisions/citizen-reports/:id/like',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userIdentifier = req.user?.id || req.ip || 'anonymous';

      const result = await DecisionsRepository.toggleLike(id, userIdentifier);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);
