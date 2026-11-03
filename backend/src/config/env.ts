import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

dotenv.config();

/**
 * Explicit allowlist of verified zero-cost chat and embedding models.
 * Decidix is a university graduation project operating under a permanent zero-cost policy.
 */
export const VERIFIED_FREE_MODEL_ALLOWLIST = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-thinking-exp:free',
  'google/gemini-2.0-flash-lite:free',
  'deepseek/deepseek-r1:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'openrouter/free',
  'local/deterministic-fnv1a-v1',
  'deterministic-fnv1a-v1',
] as const;

/**
 * Static Configuration Validation:
 * Validates whether a model identifier is a verified zero-cost model on OpenRouter or local engine.
 * Checks against the explicit allowlist and verifies the canonical ':free' suffix or local prefix.
 *
 * Distinction:
 * - Static validation (this function): Prevents paid model selection in configuration before network dispatch.
 * - Live provider verification: OpenRouter API-level enforcement (HTTP 402 if paid credits are demanded).
 */
export function isZeroCostModel(modelId: string): boolean {
  if (!modelId) return false;
  const trimmed = modelId.trim().toLowerCase();
  if ((VERIFIED_FREE_MODEL_ALLOWLIST as readonly string[]).includes(trimmed)) {
    return true;
  }
  return (
    trimmed === 'openrouter/free' ||
    trimmed.endsWith(':free') ||
    trimmed.startsWith('local/') ||
    trimmed === 'deterministic-fnv1a-v1'
  );
}

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/v1'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/decidix_dev'),
  DATABASE_SSL: z.string().default('false').transform((val) => val === 'true'),
  JWT_SECRET: z.string().default('decidix-super-secret-jwt-key-min-32-chars-long!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.3-70b-instruct:free'),
  OPENROUTER_FALLBACK_MODEL: z.string().default('openrouter/free'),
  OPENROUTER_EMBEDDING_MODEL: z.string().default('local/deterministic-fnv1a-v1'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_REQUEST_TIMEOUT_MS: z.string().default('10000').transform((val) => parseInt(val, 10)),
  ZERO_COST_ENFORCEMENT: z.string().default('true').transform((val) => val === 'true'),
  RAG_SIMILARITY_THRESHOLD: z.string().default('0.65').transform((val) => parseFloat(val)),
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
});

export const env = envSchema.parse(process.env);

// Enforce Zero-Cost Policy audit warning at startup
if (env.ZERO_COST_ENFORCEMENT && !isZeroCostModel(env.OPENROUTER_MODEL)) {
  logger.warn(
    `[Permanent Cost Policy Warning] Configured OPENROUTER_MODEL "${env.OPENROUTER_MODEL}" is not a verified zero-cost model (:free). ` +
    `Decidix is a university graduation project requiring ZERO API spending. Switch to a :free model (e.g. meta-llama/llama-3.3-70b-instruct:free).`
  );
}

if (env.ZERO_COST_ENFORCEMENT && !isZeroCostModel(env.OPENROUTER_FALLBACK_MODEL)) {
  logger.warn(
    `[Permanent Cost Policy Warning] Configured OPENROUTER_FALLBACK_MODEL "${env.OPENROUTER_FALLBACK_MODEL}" is not a verified zero-cost model (:free).`
  );
}


