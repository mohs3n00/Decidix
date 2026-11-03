export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (/password|token|secret|authorization|api_key|key/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitize(value);
    }
  }
  return sanitized;
}

export const logger = {
  info(message: string, context?: unknown) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: LogLevel.INFO, message, context: sanitize(context) }));
  },
  warn(message: string, context?: unknown) {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: LogLevel.WARN, message, context: sanitize(context) }));
  },
  error(message: string, error?: unknown) {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : sanitize(error);
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: LogLevel.ERROR, message, error: errorDetails }));
  },
  debug(message: string, context?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ timestamp: new Date().toISOString(), level: LogLevel.DEBUG, message, context: sanitize(context) }));
    }
  },
};

