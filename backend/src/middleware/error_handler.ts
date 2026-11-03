import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err);
    return;
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const fieldPath = issue.path.join('.') || 'general';
      fields[fieldPath] = issue.message;
    }
    sendError(res, AppError.validation('Validation failed for one or more fields', fields));
    return;
  }

  // SyntaxError from invalid JSON body parser
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, AppError.badRequest('Malformed JSON in request body', 'INVALID_JSON'));
    return;
  }

  logger.error('Unhandled server error', err);
  sendError(res, AppError.internal('An unexpected error occurred. Please try again later.'));
}

