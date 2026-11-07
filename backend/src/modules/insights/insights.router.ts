import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../utils/response.js';
import { validateRequest } from '../../middleware/validator.js';
import { InsightsRepository } from '../../repositories/insights.repository.js';

export const insightsRouter = Router();

// GET /v1/insights/education
insightsRouter.get('/insights/education', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InsightsRepository.getSectorData('education');
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

// GET /v1/insights/healthcare
insightsRouter.get('/insights/healthcare', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InsightsRepository.getSectorData('healthcare');
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

// GET /v1/insights/economy
insightsRouter.get('/insights/economy', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InsightsRepository.getSectorData('economy');
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

// GET /v1/insights/infrastructure
insightsRouter.get('/insights/infrastructure', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InsightsRepository.getSectorData('infrastructure');
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

// GET /v1/insights/comparison?a={id}&b={id}
const comparisonQuerySchema = z.object({
  a: z.string().min(1, 'Region a is required'),
  b: z.string().min(1, 'Region b is required'),
});

insightsRouter.get(
  '/insights/comparison',
  validateRequest({ query: comparisonQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { a, b } = req.query as { a: string; b: string };
      const response = await InsightsRepository.getComparison(a, b);
      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/insights/historical
const historicalQuerySchema = z.object({
  sector: z.enum(['overall', 'education', 'healthcare', 'economy']).default('overall'),
  range: z.enum(['3Y', '5Y', '7Y']).default('7Y'),
});

insightsRouter.get(
  '/insights/historical',
  validateRequest({ query: historicalQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sector, range } = req.query as { sector: string; range: '3Y' | '5Y' | '7Y' };
      const response = await InsightsRepository.getHistorical(sector, range);
      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /v1/insights/priority?limit=
insightsRouter.get('/insights/priority', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const response = await InsightsRepository.getPriorityQueue(limit);
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
});

// GET /v1/insights/data-quality
insightsRouter.get('/insights/data-quality', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const response = await InsightsRepository.getDataQuality();
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
});
