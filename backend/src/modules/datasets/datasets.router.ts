import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, requireVerifiedEmail } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validator.js';
import { sendSuccess, AppError } from '../../utils/response.js';
import { DatasetService } from '../../services/dataset.service.js';

export const datasetsRouter = Router();
const datasetRoles = requireRole('admin', 'analyst');
const adminOnly = requireRole('admin');

const uploadGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required.', 'UNAUTHORIZED'));
  }
  // When viewer uploads are explicitly enabled or scoped to personal/team workspaces, allow upload
  if (
    process.env.ALLOW_VIEWER_UPLOADS === 'true' ||
    req.user.role === 'admin' ||
    req.user.role === 'analyst' ||
    req.body?.workspaceType === 'personal' ||
    req.body?.workspaceType === 'team'
  ) {
    return next();
  }
  return datasetRoles(req, res, next);
};

const metadataSchema = z.object({
  filename: z.string().min(1).max(255),
  format: z.enum(['json', 'csv', 'tsv', 'xlsx', 'xls', 'jsonl', 'ndjson']),
  source: z.string().min(1).max(255).default('Decidix Platform'),
  license: z.string().min(1).max(255).default('CC-BY-4.0'),
  coverage: z.string().min(1).max(5000).default('Egypt Regions 2018-2025'),
  name: z.string().min(1).max(255).optional(),
  sourceUrl: z.string().url().max(1000).optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  classification: z.enum(['official', 'third_party', 'synthetic']).optional(),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024).optional(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  sheetName: z.string().max(255).optional(),
  workspaceType: z.enum(['national', 'personal', 'team']).optional(),
  teamId: z.string().optional(),
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

// 1. Static routes (must precede /:id) - readable by all authenticated users
datasetsRouter.get(
  '/',
  requireAuth,
  handle((req) =>
    DatasetService.list({
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      viewerUserId: req.user!.role === 'viewer' ? req.user!.id : undefined,
    })
  )
);

datasetsRouter.get('/stats', requireAuth, handle(() => DatasetService.stats()));

datasetsRouter.get('/active', requireAuth, handle(() => DatasetService.active()));

// Upload initiation and direct upload (uploadGuard + verified email)
datasetsRouter.post(
  '/uploads/initiate',
  requireAuth,
  requireVerifiedEmail,
  uploadGuard,
  validateRequest({ body: metadataSchema }),
  handle((req) => DatasetService.initiateUpload(req.user!.id, req.body))
);

datasetsRouter.post(
  '/upload-direct',
  requireAuth,
  requireVerifiedEmail,
  uploadGuard,
  validateRequest({ body: uploadDirectSchema }),
  handle((req) => {
    const canAutoActivate = req.user!.role === 'admin' || req.user!.role === 'analyst';
    return DatasetService.uploadDirect(req.user!.id, {
      ...req.body,
      autoActivate: canAutoActivate ? req.body.auto_activate : false,
    });
  })
);

// 2. Parameterized routes
datasetsRouter.get(
  '/:id',
  requireAuth,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.getById(req.params.id, req.user))
);

datasetsRouter.get(
  '/:id/records',
  requireAuth,
  validateRequest({
    params: z.object({ id: z.string().min(1) }),
    query: z.object({
      page: z.string().regex(/^\d+$/).transform((v) => parseInt(v, 10)).optional(),
      limit: z.string().regex(/^\d+$/).transform((v) => parseInt(v, 10)).optional(),
      per_page: z.string().regex(/^\d+$/).transform((v) => parseInt(v, 10)).optional(),
    }),
  }),
  handle((req) => {
    const page = typeof req.query.page === 'number' ? req.query.page : 1;
    const limit =
      typeof req.query.limit === 'number'
        ? req.query.limit
        : typeof req.query.per_page === 'number'
        ? req.query.per_page
        : 50;
    return DatasetService.getRecords(req.params.id, page, limit, req.user);
  })
);

datasetsRouter.get(
  '/:id/report',
  requireAuth,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.getReport(req.params.id, req.user))
);

datasetsRouter.get(
  '/:id/inspect',
  requireAuth,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.inspect(req.params.id, req.user))
);

datasetsRouter.post(
  '/:id/complete',
  requireAuth,
  requireVerifiedEmail,
  uploadGuard,
  validateRequest({ params: z.object({ id: z.string().min(1) }), body: completeSchema }),
  handle((req) => DatasetService.completeUpload(req.params.id, req.user!.id, req.body))
);

datasetsRouter.post(
  '/:id/validate',
  requireAuth,
  requireVerifiedEmail,
  uploadGuard,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.validate(req.params.id))
);

datasetsRouter.post(
  '/:id/ingest',
  requireAuth,
  requireVerifiedEmail,
  datasetRoles,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.ingest(req.params.id))
);

datasetsRouter.post(
  '/:id/activate',
  requireAuth,
  requireVerifiedEmail,
  datasetRoles,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.activate(req.params.id))
);

datasetsRouter.post(
  '/:id/retry',
  requireAuth,
  requireVerifiedEmail,
  datasetRoles,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.retry(req.params.id))
);

/**
 * Admin approves a dataset version
 */
datasetsRouter.post(
  '/:id/approve',
  requireAuth,
  adminOnly,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.approve(req.params.id, req.user!.id))
);

/**
 * Admin rejects a dataset version
 */
datasetsRouter.post(
  '/:id/reject',
  requireAuth,
  adminOnly,
  validateRequest({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ reason: z.string().optional() }),
  }),
  handle((req) => DatasetService.reject(req.params.id, req.user!.id, req.body?.reason))
);

datasetsRouter.delete(
  '/:id',
  requireAuth,
  adminOnly,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => DatasetService.delete(req.params.id))
);
