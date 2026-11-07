import { describe, it, expect } from 'vitest';

import {
  DEVELOPMENT_JWT_SECRET,
  productionConfigProblems,
} from '../src/config/production_guard.js';

const valid = {
  nodeEnv: 'production',
  jwtSecret: 'a'.repeat(48),
  databaseUrl: 'postgresql://user:pass@db.internal:5432/decidix',
  corsOrigin: 'https://app.decidix.app',
};

describe('Production configuration guard', () => {
  it('accepts a complete production configuration', () => {
    expect(productionConfigProblems(valid)).toEqual([]);
  });

  it('requires an explicit JWT_SECRET', () => {
    expect(productionConfigProblems({ ...valid, jwtSecret: undefined })).toEqual([
      'JWT_SECRET is required',
    ]);
  });

  it('rejects the built-in development JWT secret', () => {
    const problems = productionConfigProblems({
      ...valid,
      jwtSecret: DEVELOPMENT_JWT_SECRET,
    });
    expect(problems.join(' ')).toContain('JWT_SECRET');
    expect(problems.join(' ')).toContain('development default');
  });

  it('rejects a JWT secret that is too short', () => {
    const problems = productionConfigProblems({ ...valid, jwtSecret: 'short' });
    expect(problems.join(' ')).toContain('at least 32 characters');
  });

  it('requires DATABASE_URL', () => {
    expect(productionConfigProblems({ ...valid, databaseUrl: '   ' })).toEqual([
      'DATABASE_URL is required',
    ]);
  });

  it('rejects a wildcard CORS origin', () => {
    const problems = productionConfigProblems({ ...valid, corsOrigin: '*' });
    expect(problems.join(' ')).toContain('CORS_ORIGIN');
  });

  it('does not constrain development or test configuration', () => {
    expect(
      productionConfigProblems({
        nodeEnv: 'development',
        corsOrigin: '*',
        jwtSecret: undefined,
      })
    ).toEqual([]);
    expect(productionConfigProblems({ nodeEnv: 'test' })).toEqual([]);
  });

  it('never echoes the secret value in its messages', () => {
    const secret = 'leaky-value-that-must-not-appear';
    const problems = productionConfigProblems({ ...valid, jwtSecret: secret });
    expect(problems.join(' ')).not.toContain(secret);
  });
});
