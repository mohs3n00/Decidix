import { env, isZeroCostModel } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  provider: 'openrouter' | 'deterministic_local';
  model: string;
  dimensions: number;
  version: string;
}

export class MissingProviderCredentialsError extends Error {
  constructor(message = 'OPENROUTER_API_KEY is not configured for remote embedding generation.') {
    super(message);
    this.name = 'MissingProviderCredentialsError';
  }
}

export class EmbeddingGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingGenerationError';
  }
}

export class ZeroCostPolicyViolationError extends Error {
  constructor(message = 'Paid embedding APIs are strictly forbidden by the Decidix Zero-Cost Policy.') {
    super(message);
    this.name = 'ZeroCostPolicyViolationError';
  }
}

/**
 * Calculates cosine similarity between two equal-length numerical vectors:
 * cos(theta) = (A . B) / (||A|| * ||B||)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound to [-1.0, 1.0] to guard against floating-point epsilon
  return Math.max(-1, Math.min(1, similarity));
}

// Semantic topic clusters for realistic offline vector representation
const DOMAIN_CLUSTERS: Record<string, string[]> = {
  healthcare: [
    'health', 'healthcare', 'clinic', 'doctor', 'hospital', 'medical', 'disparity',
    'صحة', 'رعاية', 'عيادة', 'أطباء', 'طبيب', 'مستشفى', 'مرض'
  ],
  infrastructure: [
    'water', 'canal', 'sanitation', 'utilities', 'infrastructure', 'potable', 'drainage', 'treatment',
    'مياه', 'صرف', 'ترع', 'بنية', 'تحتية', 'محطة', 'شرب', 'صحي'
  ],
  economy: [
    'economy', 'employment', 'unemployment', 'solar', 'energy', 'jobs', 'vocational', 'transition', 'growth',
    'اقتصاد', 'بطالة', 'وظائف', 'طاقة', 'شمسية', 'تدريب', 'مهني'
  ],
  priority_need: [
    'need', 'needs', 'help', 'most', 'disparity', 'acute', 'under-capacity', 'shortage',
    'حاجة', 'أولوية', 'أولويات', 'نقص', 'فوارق', 'مساعدة', 'تدخل'
  ],
  frontier: [
    'frontier', 'حدود', 'حدودية', 'need', 'needs', 'help', 'most', 'disparity', 'acute', 'shortage',
    'حاجة', 'أولوية', 'أولويات', 'مساعدة'
  ],
  delta: ['delta', 'دلتا', 'الدلتا'],
  steppe: ['steppe', 'سهوب', 'السهوب'],
};

/**
 * Normalizes an Arabic word token by stripping common attached prefixes (conjunctions, prepositions, definite article).
 */
function normalizeArabicStem(token: string): string | null {
  if (!/[\u0600-\u06FF]/.test(token)) return null;
  let t = token;
  // Conjunction 'و'
  if (t.length > 3 && t.startsWith('و')) {
    t = t.substring(1);
  }
  // Prepositions 'لل' / 'بال' / 'فال'
  if (t.length > 4 && (t.startsWith('لل') || t.startsWith('بال') || t.startsWith('فال'))) {
    t = t.substring(t.startsWith('لل') ? 1 : 2);
  }
  // Definite article 'ال'
  if (t.length > 3 && t.startsWith('ال')) {
    t = t.substring(2);
  } else if (t.length > 3 && t.startsWith('ل')) {
    t = t.substring(1);
  }
  return t !== token ? t : null;
}

/**
 * Generates a deterministic unit-normalized 1536-dimensional vector for offline testing and local development.
 * Projects lexical tokens and semantic domain clusters onto a 1536-dimensional Euclidean sphere.
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const vector = new Float64Array(EMBEDDING_DIMENSIONS);
  const normalized = text.toLowerCase().trim();

  if (!normalized) {
    return Array.from(vector);
  }

  // Extract alphanumeric tokens (English and Arabic characters)
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  if (tokens.length === 0) {
    return Array.from(vector);
  }

  for (const token of tokens) {
    // 1. Hash individual token across 16 coordinates in 1536-space
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }

    for (let k = 0; k < 16; k++) {
      const idx = Math.abs(Math.imul(h, k * 31 + 17)) % EMBEDDING_DIMENSIONS;
      vector[idx] += 1.0;
    }

    // 2. Project semantic domain cluster signals into shared coordinate space
    const stem = normalizeArabicStem(token);
    for (const [dom, keywords] of Object.entries(DOMAIN_CLUSTERS)) {
      if (keywords.includes(token) || (stem && keywords.includes(stem))) {
        let dh = 2166136261;
        for (let i = 0; i < dom.length; i++) {
          dh ^= dom.charCodeAt(i);
          dh = Math.imul(dh, 16777619);
        }
        for (let k = 0; k < 32; k++) {
          const idx = Math.abs(Math.imul(dh, k * 37 + 19)) % EMBEDDING_DIMENSIONS;
          vector[idx] += 2.5;
        }
      }
    }
  }

  // Euclidean L2 normalization (sum(v_i^2) = 1)
  let normSq = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    normSq += vector[i] * vector[i];
  }

  if (normSq > 0) {
    const invNorm = 1.0 / Math.sqrt(normSq);
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
      vector[i] *= invNorm;
    }
  }

  return Array.from(vector);
}

export class EmbeddingService {
  private static cache = new Map<string, EmbeddingResult>();

  /**
   * Generates a 1536-dimensional vector embedding along with its provenance metadata.
   * When requireRemote is true, throws an error if OPENROUTER_API_KEY is missing or the request fails.
   */
  static async generateEmbeddingWithMetadata(
    text: string,
    options?: { requireRemote?: boolean }
  ): Promise<EmbeddingResult> {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        embedding: new Array(EMBEDDING_DIMENSIONS).fill(0),
        provider: 'deterministic_local',
        model: 'deterministic-fnv1a-v1',
        dimensions: EMBEDDING_DIMENSIONS,
        version: '1.0.0',
      };
    }

    const cacheKey = `${options?.requireRemote ? 'remote_' : 'auto_'}${trimmed}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const hasCredentials = Boolean(apiKey && apiKey.trim().length > 0);

    // Strict credential check when remote embedding is explicitly mandated
    if (options?.requireRemote && !hasCredentials) {
      throw new MissingProviderCredentialsError(
        'OPENROUTER_API_KEY is not configured. Document ingestion requires verified provider credentials to avoid storing invalid or misleading vectors.'
      );
    }

    // Permanent Zero-Cost Policy:
    // Only attempt remote embedding if explicitly requested AND the model is verified zero-cost.
    // OpenRouter has no free embedding endpoints; paid embedding endpoints are strictly prohibited.
    if (options?.requireRemote && hasCredentials) {
      if (env.ZERO_COST_ENFORCEMENT && !isZeroCostModel(env.OPENROUTER_EMBEDDING_MODEL)) {
        throw new EmbeddingGenerationError(
          `Paid embedding API "${env.OPENROUTER_EMBEDDING_MODEL}" is strictly forbidden by Decidix Zero-Cost Policy. ` +
          `Decidix operates with ZERO API spending. Use local deterministic embeddings (deterministic-fnv1a-v1).`
        );
      }

      try {
        const timeoutMs = env.OPENROUTER_REQUEST_TIMEOUT_MS || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`${env.OPENROUTER_BASE_URL}/embeddings`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://decidix.gov',
            'X-Title': 'Decidix Mobile API',
          },
          body: JSON.stringify({
            model: env.OPENROUTER_EMBEDDING_MODEL,
            input: trimmed,
            dimensions: EMBEDDING_DIMENSIONS,
          }),
        }).finally(() => clearTimeout(timeoutId));

        if (response.ok) {
          const json = await response.json() as {
            data?: Array<{ embedding?: number[] }>;
          };
          const embedding = json.data?.[0]?.embedding;
          if (embedding && Array.isArray(embedding) && embedding.length === EMBEDDING_DIMENSIONS) {
            const result: EmbeddingResult = {
              embedding,
              provider: 'openrouter',
              model: env.OPENROUTER_EMBEDDING_MODEL,
              dimensions: EMBEDDING_DIMENSIONS,
              version: '1.0.0',
            };
            this.cache.set(cacheKey, result);
            return result;
          }
        }

        const errorMsg = `Remote embedding generation failed with HTTP status ${response.status}`;
        throw new EmbeddingGenerationError(errorMsg);
      } catch (error) {
        if (error instanceof MissingProviderCredentialsError || error instanceof EmbeddingGenerationError) {
          throw error;
        }
        throw new EmbeddingGenerationError(`Remote embedding call failed: ${(error as Error).message}`);
      }
    }

    // Default zero-cost engine: Deterministic L2-normalized 1536-dimensional embedding
    const localEmbedding = generateDeterministicEmbedding(trimmed);
    const result: EmbeddingResult = {
      embedding: localEmbedding,
      provider: 'deterministic_local',
      model: 'deterministic-fnv1a-v1',
      dimensions: EMBEDDING_DIMENSIONS,
      version: '1.0.0',
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Convenience wrapper that returns just the 1536-dimensional number array.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const res = await this.generateEmbeddingWithMetadata(text);
    return res.embedding;
  }

  /**
   * Clears the embedding cache (useful in test teardown).
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
