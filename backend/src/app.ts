import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env, isZeroCostModel } from './config/env.js';
import { requestLogger } from './middleware/request_logger.js';
import { errorHandler } from './middleware/error_handler.js';
import { testPrismaConnection } from './database/prisma.js';
import { authRouter } from './modules/auth/auth.router.js';
import { overviewRouter } from './modules/overview/overview.router.js';
import { insightsRouter } from './modules/insights/insights.router.js';
import { intelligenceRouter } from './modules/intelligence/intelligence.router.js';
import { decisionsRouter } from './modules/decisions/decisions.router.js';
import { adminRouter } from './modules/admin/admin.router.js';

export function createApp(): Express {
  const app = express();

  // Basic security and request processing
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(requestLogger);

  // Health-check endpoint for Heroku and uptime monitors
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'decidix-backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API v1 Router Registration
  const v1 = express.Router();

  // Subsystem health check (live DB query, ML status, zero-cost policy compliance)
  v1.get('/health', async (_req: Request, res: Response) => {
    // Real query execution via forceRefresh = true
    const isDbConnected = await testPrismaConnection(true);
    const isCompliant = isZeroCostModel(env.OPENROUTER_MODEL) && isZeroCostModel(env.OPENROUTER_FALLBACK_MODEL);
    const isHealthy = isDbConnected || env.NODE_ENV !== 'production';

    res.status(isHealthy ? 200 : 503).json({
      status: isDbConnected ? 'healthy' : (env.NODE_ENV === 'production' ? 'unhealthy' : 'degraded'),
      service: 'decidix-backend',
      version: '1.0.0',
      database: isDbConnected ? 'connected' : 'fallback_memory',
      ml_engine: 'ready',
      zero_cost_policy: {
        enforced: env.ZERO_COST_ENFORCEMENT,
        compliant: isCompliant,
        model: env.OPENROUTER_MODEL,
      },
      timestamp: new Date().toISOString(),
    });
  });

  v1.use('/auth', authRouter);
  v1.use(overviewRouter);
  v1.use(insightsRouter);
  v1.use(intelligenceRouter);
  v1.use(decisionsRouter);
  v1.use(adminRouter);

  app.use(env.API_PREFIX, v1);

  // 404 for unmapped routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint does not exist',
      },
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

