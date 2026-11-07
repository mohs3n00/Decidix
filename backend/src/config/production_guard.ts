/**
 * Production startup guard.
 *
 * The development defaults exist so `npm run dev` and the test suite need no
 * setup. They must never reach production, because a published JWT secret or a
 * localhost database silently yields forgeable tokens or a backend that serves
 * nothing. Only rule names are reported; environment values are never included.
 */

export const DEVELOPMENT_JWT_SECRET =
  'decidix-super-secret-jwt-key-min-32-chars-long!';

export const MIN_JWT_SECRET_LENGTH = 32;

export interface ProductionConfigInput {
  nodeEnv: string;
  jwtSecret?: string;
  databaseUrl?: string;
  corsOrigin?: string;
}

export function productionConfigProblems(
  input: ProductionConfigInput
): string[] {
  if (input.nodeEnv !== 'production') return [];

  const problems: string[] = [];

  const secret = (input.jwtSecret ?? '').trim();
  if (!secret) {
    problems.push('JWT_SECRET is required');
  } else if (secret === DEVELOPMENT_JWT_SECRET) {
    problems.push('JWT_SECRET must not use the built-in development default');
  } else if (secret.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`
    );
  }

  if (!(input.databaseUrl ?? '').trim()) {
    problems.push('DATABASE_URL is required');
  }

  const cors = (input.corsOrigin ?? '').trim();
  if (!cors || cors === '*') {
    problems.push('CORS_ORIGIN must be an explicit origin');
  }

  return problems;
}
