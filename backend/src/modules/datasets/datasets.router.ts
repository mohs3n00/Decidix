import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, requireVerifiedEmail } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validator.js';
import { sendSuccess } from '../../utils/response.js';
import { DatasetService } from '../../services/dataset.service.js';

export const datasetsRouter = Router();
const datasetRoles = requireRole('admin', 'analyst');

const metadataSchema = z.object({
  filename: z.string().min(1).max(255),
  format: z.enum(['json', 'csv']),
  source: z.string().min(1).max(255),
  license: z.string().min(1).max(255),
  coverage: z.string().min(1).max(5000),
  name: z.string().min(1).max(255).optional(),
  sourceUrl: z.string().url().max(1000).optional(),
  description: z.string().max(2000).optional(),
  classification: z.enum(['official', 'third_party', 'synthetic']).optional(),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024).optional(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
});

const completeSchema = metadataSchema.extend({
  version: z.string().min(1).max(64),
  objectKey: z.string().min(1).max(1000),
});

const uploadDirectSchema = metadataSchema.extend({
  content: z.string().min(1, 'Dataset content cannot be empty'),
  auto_activate: z.boolean().optional(),
});

function handle(handler: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await handler(req));
    } catch (error) {
      next(error);
    }
  };
}

datasetsRouter.use(requireAuth, datasetRoles, requireVerifiedEmail);

// 1. Static routes (must precede /:id)
datasetsRouter.get(
  '/',
  handle((req) =>
    DatasetService.list({
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
    })
  )
);

datasetsRouter.get('/stats', handle(() => DatasetService.stats()));

datasetsRouter.get('/active', handle(() => DatasetService.active()));

datasetsRouter.post(
  '/uploads/initiate',
  validateRequest({ body: metadataSchema }),
  handle((req) => DatasetService.initiateUpload(req.user!.id, req.body))
);

datasetsRouter.post(
  '/upload-direct',
  validateRequest({ body: uploadDirectSchema }),
  handle((req) =>
    DatasetService.uploadDirect(req.user!.id, {
      ...req.body,
      autoActivate: req.body.auto_activate,
    })
  )
);

// 2. Parameterized routes
datasetsRouter.get(
  '/:id',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.getById(req.params.id))
);

datasetsRouter.post(
  '/:id/complete',
  validateRequest({ params: z.object({ id: z.string().min(1) }), body: completeSchema }),
  handle((req) => DatasetService.completeUpload(req.params.id, req.user!.id, req.body))
);

datasetsRouter.get(
  '/:id/inspect',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.inspect(req.params.id))
);

datasetsRouter.post(
  '/:id/validate',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.validate(req.params.id))
);

datasetsRouter.post(
  '/:id/ingest',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.ingest(req.params.id))
);

datasetsRouter.post(
  '/:id/activate',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.activate(req.params.id))
);

datasetsRouter.post(
  '/:id/retry',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.retry(req.params.id))
);

datasetsRouter.delete(
  '/:id',
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.delete(req.params.id))
);
