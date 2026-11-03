import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { OverviewRepository } from '../../repositories/overview.repository.js';
import { RegionsRepository } from '../../repositories/regions.repository.js';

export const overviewRouter = Router();

const overviewQuerySchema = z.object({
  range: z.enum(['3Y', '5Y', '7Y']).default('7Y'),
});

const mapPointsQuerySchema = z.object({
  sector: z.enum(['overall', 'education', 'healthcare', 'economy', 'infrastructure']).default('overall'),
});

const regionsQuerySchema = z.object({
  q: z.string().optional().default(''),
  priority: z.enum(['all', 'critical', 'high', 'medium', 'low']).default('all'),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  per_page: z.string().optional().default('20').transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
});

// GET /v1/overview
overviewRouter.get(
  '/overview',
  validateRequest({ query: overviewQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { range } = req.query as { range: '3Y' | '5Y' | '7Y' };
      const responseData = await OverviewRepository.getOverview(range);
      sendSuccess(res, responseData);
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/regions/map-points
overviewRouter.get(
  '/regions/map-points',
  validateRequest({ query: mapPointsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sector } = req.query as { sector: 'overall' | 'education' | 'healthcare' | 'economy' | 'infrastructure' };
      const points = await RegionsRepository.getMapPoints(sector);
      sendSuccess(res, points);
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/regions
overviewRouter.get(
  '/regions',
  validateRequest({ query: regionsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, priority, page, per_page } = req.query as unknown as {
        q: string;
        priority: string;
        page: number;
        per_page: number;
      };

      const { items, total } = await RegionsRepository.getRegions({
        q,
        priority,
        page,
        per_page,
      });

      sendSuccess(res, items, {
        page,
        per_page,
        total,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/regions/:id
overviewRouter.get(
  '/regions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const profile = await RegionsRepository.getRegionById(id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }
);
