import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import {
  DEVELOPMENT_JWT_SECRET,
  productionConfigProblems,
} from './production_guard.js';

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

/**
 * Optional variables tolerate an empty value: a blank line such as
 * `R2_PUBLIC_URL=` means "unset", not "invalid URL". Without this, a cleared
 * optional variable crashes the whole process at startup with a Zod dump.
 */
const optionalNonEmpty = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional()
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional()
);

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/v1'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/decidix_dev'),
  DATABASE_SSL: z.string().default('false').transform((val) => val === 'true'),
  JWT_SECRET: z.string().default(DEVELOPMENT_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPENROUTER_API_KEY: optionalNonEmpty,
  OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.3-70b-instruct:free'),
  OPENROUTER_FALLBACK_MODEL: z.string().default('openrouter/free'),
  OPENROUTER_EMBEDDING_MODEL: z.string().default('local/deterministic-fnv1a-v1'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_REQUEST_TIMEOUT_MS: z.string().default('10000').transform((val) => parseInt(val, 10)),
  ZERO_COST_ENFORCEMENT: z.string().default('true').transform((val) => val === 'true'),
  RAG_SIMILARITY_THRESHOLD: z.string().default('0.65').transform((val) => parseFloat(val)),
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  FIREBASE_SERVICE_ACCOUNT: optionalNonEmpty,
  FIREBASE_SERVICE_ACCOUNT_PATH: optionalNonEmpty,
  FIREBASE_PROJECT_ID: optionalNonEmpty,
  FIREBASE_CLIENT_EMAIL: optionalNonEmpty,
  FIREBASE_PRIVATE_KEY: optionalNonEmpty,
  // Google OAuth Web Client ID � required for real Google Sign-In token verification.
  // Must match the Web application OAuth client in Google Cloud Console.
  // Same value as GOOGLE_SERVER_CLIENT_ID in env/staging.json.
  GOOGLE_WEB_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  R2_ACCOUNT_ID: optionalNonEmpty,
  R2_ACCESS_KEY_ID: optionalNonEmpty,
  R2_SECRET_ACCESS_KEY: optionalNonEmpty,
  R2_BUCKET_NAME: optionalNonEmpty,
  R2_ENDPOINT: optionalUrl,
  R2_REGION: z.string().default('auto'),
  R2_PUBLIC_URL: optionalUrl,
  R2_API_TOKEN: optionalNonEmpty,
  ALLOW_SYNTHETIC_DATA: z.string().default('false').transform((val) => val === 'true'),
  // Real Email Delivery Configuration
  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z.string().default('false').transform((val) => val === 'true'),
  SMTP_USER: optionalNonEmpty,
  SMTP_PASS: optionalNonEmpty,
  EMAIL_FROM: z.string().default('Decidix Platform <noreply@decidix.org>'),
  APP_URL: z.string().default('http://localhost:5000'),
  APP_DEEP_LINK_SCHEME: z.string().default('decidix'),
});

export const env = envSchema.parse(process.env);

// Production must never start on development defaults. Only rule names are
// reported here; no environment value is ever printed.
const productionProblems = productionConfigProblems({
  nodeEnv: env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN,
});
if (productionProblems.length > 0) {
  throw new Error(
    `Invalid production configuration: ${productionProblems.join('; ')}`
  );
}

export function syntheticDataAllowed(): boolean {
  // Production never serves synthetic or seed data, even if the flag is set:
  // an unconnected dataset must surface as DATASET_NOT_CONNECTED instead.
  if (env.NODE_ENV === 'production') return false;
  return env.NODE_ENV === 'test' || env.ALLOW_SYNTHETIC_DATA;
}

// Enforce Zero-Cost Policy audit warning at startup
if (env.ZERO_COST_ENFORCEMENT && !isZeroCostModel(env.OPENROUTER_MODEL)) {
  logger.warn(
    `[Permanent Cost Policy Warning] Configured OPENROUTER_MODEL "${env.OPENROUTER_MODEL}" is not a verified zero-cost model (:free). ` +
    `Decidix is a university graduation project requiring ZERO API spending. Switch to a :free model (e.g. meta-llama/llama-3.3-70b-instruct:free).`
  );
}

// Warn at startup if Google Sign-In is not properly configured
const resolvedGoogleClientId = env.GOOGLE_WEB_CLIENT_ID || env.GOOGLE_CLIENT_ID;
if (!resolvedGoogleClientId) {
  logger.warn(
    '[Auth Config Warning] GOOGLE_WEB_CLIENT_ID is not set in environment. ' +
    'Real Google Sign-In (/auth/google) will reject all tokens with GOOGLE_CONFIG_MISSING. ' +
    'Set GOOGLE_WEB_CLIENT_ID to the Web application client ID from Google Cloud Console.'
  );
}

if (env.ZERO_COST_ENFORCEMENT && !isZeroCostModel(env.OPENROUTER_FALLBACK_MODEL)) {
  logger.warn(
    `[Permanent Cost Policy Warning] Configured OPENROUTER_FALLBACK_MODEL "${env.OPENROUTER_FALLBACK_MODEL}" is not a verified zero-cost model (:free).`
  );
}
