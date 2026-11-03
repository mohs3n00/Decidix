import { Response } from 'express';

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: Record<string, string>;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', fields?: Record<string, string>) {
    return new AppError(message, 400, code, fields);
  }

  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Access forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static validation(message = 'Validation failed', fields?: Record<string, string>) {
    return new AppError(message, 422, 'VALIDATION_ERROR', fields);
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.', code = 'TOO_MANY_REQUESTS') {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }
}

export function sendSuccess<T>(res: Response, data: T, meta?: PageMeta, statusCode = 200): Response {
  const payload: ApiSuccessResponse<T> = { data };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: AppError): Response {
  const payload: ApiErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  };
  return res.status(error.statusCode).json(payload);
}

