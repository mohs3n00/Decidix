import { describe, it, expect, beforeEach } from 'vitest';
import {
  RagRepository,
  RetrievedDocument,
  formatCitation,
} from '../src/repositories/rag.repository.js';
import {
  EmbeddingService,
  cosineSimilarity,
  generateDeterministicEmbedding,
  MissingProviderCredentialsError,
  EmbeddingGenerationError,
  EMBEDDING_DIMENSIONS,
} from '../src/integrations/embedding.service.js';
import { RagService } from '../src/integrations/rag.js';
import { OpenRouterService } from '../src/integrations/openrouter.js';
import { isZeroCostModel } from '../src/config/env.js';
import { runRagIngestion } from '../src/database/ingest_rag_documents.js';

describe('Phase C3.1 & C3.1.1 — RAG Infrastructure, Embedding Compatibility & Retrieval Integrity Audit Suite', () => {
  beforeEach(() => {
    RagRepository.resetInMemoryStore();
    EmbeddingService.clearCache();
  });

  describe('1. Embedding Service & Dimensionality Tests', () => {
    it('generates an embedding vector of exactly 1536 dimensions', async () => {
      const vector = await EmbeddingService.generateEmbedding('Healthcare disparity in Frontier region');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe(EMBEDDING_DIMENSIONS);
      expect(vector.length).toBe(1536);

      // Verify each element is a finite number
      for (const val of vector) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it('generates identical vectors deterministically for identical text inputs', async () => {
      const text = 'Water sanitation canal infrastructure in Delta';
      const vectorA = await EmbeddingService.generateEmbedding(text);
      const vectorB = await EmbeddingService.generateEmbedding(text);

      expect(vectorA).toEqual(vectorB);
      expect(cosineSimilarity(vectorA, vectorB)).toBeCloseTo(1.0, 5);
    });

    it('produces unit-normalized vectors where ||v||_2 = 1.0', () => {
      const vector = generateDeterministicEmbedding('Steppe employment solar micro-grid');
      let normSq = 0;
      for (const v of vector) normSq += v * v;
      expect(Math.sqrt(normSq)).toBeCloseTo(1.0, 4);
    });

    it('calculates cosine similarity accurately and bounds to [-1, 1]', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      const vecC = [0, 1, 0];
      const vecD = [-1, 0, 0];

      expect(cosineSimilarity(vecA, vecB)).toBe(1.0);
      expect(cosineSimilarity(vecA, vecC)).toBe(0.0);
      expect(cosineSimilarity(vecA, vecD)).toBe(-1.0);

      // Empty or mismatched dimensions guard
      expect(cosineSimilarity([], [])).toBe(0.0);
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0.0);
    });

    it('attaches explicit provider, model, dimension, and version metadata', async () => {
      const meta = await EmbeddingService.generateEmbeddingWithMetadata('National economic diversification plan');
      expect(meta.dimensions).toBe(1536);
      expect(meta.version).toBe('1.0.0');
      expect(['openrouter', 'deterministic_local']).toContain(meta.provider);
      expect(['openai/text-embedding-3-small', 'deterministic-fnv1a-v1']).toContain(meta.model);
    });
  });

  describe('2. Provider Credentials & Ingestion Guardrails (Phase C3.1.1)', () => {
    it('throws MissingProviderCredentialsError when requireRemote is requested without credentials', async () => {
      // Force empty key environment test
      const originalKey = process.env.OPENROUTER_API_KEY;
      try {
        delete process.env.OPENROUTER_API_KEY;
        await expect(
          EmbeddingService.generateEmbeddingWithMetadata('Test document content', { requireRemote: true })
        ).rejects.toThrow(MissingProviderCredentialsError);
      } finally {
        if (originalKey) process.env.OPENROUTER_API_KEY = originalKey;
      }
    });

    it('ingestion refuses to inject unverified synthetic vectors into production when credentials are missing', async () => {
      const originalKey = process.env.OPENROUTER_API_KEY;
      try {
        delete process.env.OPENROUTER_API_KEY;
        // Ingestion with allowLocalFallback = false must abort rather than store fake vectors
        await expect(
          runRagIngestion({ allowLocalFallback: false })
        ).rejects.toThrow(MissingProviderCredentialsError);
      } finally {
        if (originalKey) process.env.OPENROUTER_API_KEY = originalKey;
      }
    });

    it('ingestion succeeds idempotently in offline test mode when allowLocalFallback = true', async () => {
      const summary1 = await runRagIngestion({ allowLocalFallback: true });
      expect(summary1.totalProcessed).toBe(3);
      expect(summary1.status).toBe('offline_fallback');
      expect(summary1.model).toBe('deterministic-fnv1a-v1');

      // Repeated ingestion is idempotent
      const summary2 = await runRagIngestion({ allowLocalFallback: true });
      expect(summary2.totalProcessed).toBe(3);
      expect(summary2.errors).toHaveLength(0);
    });
  });

  describe('3. Query/Document Embedding Consistency & Mixed-Model Rejection (Phase C3.1.1)', () => {
    it('strictly isolates and rejects comparing vectors from mismatched embedding models', async () => {
      // Insert document embedded with foreign/incompatible model
      RagRepository.upsertInMemoryDocument({
        id: 'doc_incompatible_model',
        title: 'Mismatched Embedding Model Document',
        arabicTitle: 'وثيقة بنموذج تضمين غير متوافق',
        content: 'Healthcare disparity clinic shortages in Frontier region.',
        arabicContent: 'فوارق الرعاية الصحية في الحدود.',
        source: 'External Incompatible Source',
        sourceUrl: null,
        period: '2025-Q4',
        category: 'healthcare',
        regionId: 'frontier',
        accessScope: 'public',
        metadata: {
          period: '2025-Q4',
          embedding_provider: 'legacy_vendor',
          embedding_model: 'legacy-cohere-v3', // INCOMPATIBLE MODEL
          embedding_dimensions: 1536,
          embedding_version: '1.0.0',
        },
        embedding: generateDeterministicEmbedding('Healthcare disparity clinic shortages in Frontier region.'),
      });

      // Query executed under standard active model ('deterministic-fnv1a-v1')
      const result = await RagRepository.search({
        query: 'healthcare clinic shortages in Frontier',
        queryModel: 'deterministic-fnv1a-v1',
        minSimilarity: 0.5,
      });

      // The incompatible model document must be rejected/excluded
      expect(result.documents.some((d) => d.id === 'doc_incompatible_model')).toBe(false);
    });

    it('permits vector similarity comparison when query and document embedding models match', async () => {
      const result = await RagRepository.search({
        query: 'healthcare clinic shortages in Frontier',
        queryModel: 'deterministic-fnv1a-v1',
        minSimilarity: 0.5,
      });

      // The standard seed document with matching model must be retrieved
      expect(result.documents.some((d) => d.id === 'doc_health_frontier')).toBe(true);
      expect(result.queryModel).toBe('deterministic-fnv1a-v1');
    });
  });

  describe('4. Similarity Threshold & Top-K Retrieval Tests [In-Memory Offline]', () => {
    it('retrieves relevant documents above the standard threshold (minSimilarity = 0.65)', async () => {
      const result = await RagRepository.search({
        query: 'healthcare clinic doctor shortage frontier',
        minSimilarity: 0.65,
        limit: 3,
      });

      expect(result.retrievalEngine).toBe('in_memory_cosine');
      expect(result.documents.length).toBeGreaterThan(0);

      const topMatch = result.documents[0];
      expect(topMatch.id).toBe('doc_health_frontier');
      expect(topMatch.category).toBe('healthcare');
      expect(topMatch.regionId).toBe('frontier');
      expect(topMatch.similarityScore).toBeGreaterThanOrEqual(0.65);
    });

    it('filters out documents falling below a strict similarity threshold', async () => {
      // Very strict threshold that candidate documents do not meet
      const result = await RagRepository.search({
        query: 'quantum computing and space astrophysics',
        minSimilarity: 0.85,
        limit: 3,
      });

      expect(result.documents).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('respects Top-K limit parameter strictly', async () => {
      // Query that matches multiple sectors
      const resultLimit1 = await RagRepository.search({
        query: 'region development index study',
        minSimilarity: 0.3,
        limit: 1,
      });
      expect(resultLimit1.documents.length).toBeLessThanOrEqual(1);

      const resultLimit2 = await RagRepository.search({
        query: 'region development index study',
        minSimilarity: 0.3,
        limit: 2,
      });
      expect(resultLimit2.documents.length).toBeLessThanOrEqual(2);
    });
  });

  describe('5. Metadata Filtering Tests [In-Memory Offline]', () => {
    it('filters strictly by regionId without cross-regional contamination', async () => {
      const result = await RagRepository.search({
        query: 'water sanitation economy healthcare infrastructure',
        regionId: 'delta',
        minSimilarity: 0.3,
      });

      expect(result.documents.length).toBeGreaterThan(0);
      for (const doc of result.documents) {
        expect(doc.regionId).toBe('delta');
      }
    });

    it('filters strictly by category/sector', async () => {
      const result = await RagRepository.search({
        query: 'development study assessment transition',
        category: 'economy',
        minSimilarity: 0.3,
      });

      expect(result.documents.length).toBeGreaterThan(0);
      for (const doc of result.documents) {
        expect(doc.category).toBe('economy');
      }
    });

    it('returns empty array when region and category combination has no matches', async () => {
      // Delta has infrastructure/water document, but no healthcare document in seed
      const result = await RagRepository.search({
        query: 'healthcare clinic doctor',
        regionId: 'delta',
        category: 'healthcare',
        minSimilarity: 0.5,
      });

      expect(result.documents).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });
  });

  describe('6. Missing Documents & Missing Embeddings Tests [In-Memory Offline]', () => {
    it('returns empty results and never fabricates fake documents on empty query or store', async () => {
      const result = await RagRepository.search({
        query: '',
        minSimilarity: 0.7,
      });

      expect(result.documents).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('excludes documents that have missing or null embeddings from vector retrieval', async () => {
      // Insert a document with null embedding
      RagRepository.upsertInMemoryDocument({
        id: 'doc_unembedded',
        title: 'Document Without Vector Embedding',
        arabicTitle: 'وثيقة بلا تضمين متجهي',
        content: 'This document has no precomputed vector embedding and must be excluded.',
        arabicContent: 'هذه الوثيقة لا تحتوي على تضمين.',
        source: 'Test Authority',
        sourceUrl: null,
        period: '2025-Q4',
        category: 'healthcare',
        regionId: 'frontier',
        accessScope: 'public',
        metadata: { period: '2025-Q4' },
        embedding: null, // Null embedding!
      });

      const result = await RagRepository.search({
        query: 'Document Without Vector Embedding',
        minSimilarity: 0.5,
      });

      // The document with null embedding must NOT appear in vector results
      expect(result.documents.some((d) => d.id === 'doc_unembedded')).toBe(false);
    });
  });

  describe('7. Database & pgvector Extension Failure Handling', () => {
    it('gracefully handles database failure simulation without crashing', async () => {
      RagRepository.setSimulations({ dbFailure: true });

      const result = await RagRepository.search({
        query: 'healthcare frontier clinic shortage',
        minSimilarity: 0.65,
      });

      expect(result).toBeDefined();
      expect(result.retrievalEngine).toBe('in_memory_cosine');
      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.documents[0].id).toBe('doc_health_frontier');
    });

    it('gracefully falls back when vector extension is missing', async () => {
      RagRepository.setSimulations({ missingVectorExtension: true });

      const result = await RagRepository.search({
        query: 'Delta canal sanitation potable water',
        minSimilarity: 0.65,
      });

      expect(result).toBeDefined();
      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.documents[0].id).toBe('doc_water_delta');
    });
  });

  describe('8. Evidence Attribution & Citation Formatting Tests', () => {
    it('strictly preserves document provenance and formats citation as [Source: Document Name (Period)]', async () => {
      const result = await RagRepository.search({
        query: 'Steppe employment renewable energy',
        minSimilarity: 0.6,
      });

      expect(result.documents.length).toBeGreaterThan(0);
      const doc = result.documents[0];

      expect(doc.id).toBe('doc_economy_steppe');
      expect(doc.title).toBe('Steppe Employment and Renewable Energy Transition');
      expect(doc.source).toBe('Decidix Synthetic Sector Assessment (not an official publication)');
      expect(doc.period).toBe('2025-Q4');
      expect(doc.content).toContain('Steppe region has registered unemployment');
      expect(typeof doc.similarityScore).toBe('number');

      // Citation template check
      expect(doc.citation).toBe(
        formatCitation('Steppe Employment and Renewable Energy Transition', '2025-Q4')
      );
      expect(doc.citation).toBe(
        '[Source: Steppe Employment and Renewable Energy Transition (2025-Q4)]'
      );
    });

    it('RagService formats prompt context with verified citations in English and Arabic', () => {
      const testDocs: RetrievedDocument[] = [
        {
          id: 'doc_health_frontier',
          title: 'Healthcare Disparity Assessment in Frontier Region',
          arabicTitle: 'تقييم فوارق الرعاية الصحية في المنطقة الحدودية',
          content: 'Clinic density is 38% below national mean.',
          arabicContent: 'كثافة العيادات تقل بـ 38% عن المتوسط الوطني.',
          source: 'Decidix Synthetic Sector Assessment (not an official publication)',
          sourceUrl: null,
          period: '2025-Q4',
          category: 'healthcare',
          regionId: 'frontier',
          accessScope: 'public',
          similarityScore: 0.912,
          citation: '[Source: Healthcare Disparity Assessment in Frontier Region (2025-Q4)]',
        },
      ];

      const enContext = RagService.formatContextForPrompt(testDocs, 'en');
      expect(enContext).toContain('[Source: Healthcare Disparity Assessment in Frontier Region (2025-Q4)]');
      expect(enContext).toContain('Clinic density is 38% below national mean.');

      const arContext = RagService.formatContextForPrompt(testDocs, 'ar');
      expect(arContext).toContain('[Source: Healthcare Disparity Assessment in Frontier Region (2025-Q4)]');
      expect(arContext).toContain('كثافة العيادات تقل بـ 38% عن المتوسط الوطني.');
    });

    it('RagService returns verified refusal message when document list is empty', () => {
      const emptyContext = RagService.formatContextForPrompt([], 'en');
      expect(emptyContext).toBe('No directly matching verified documents found in authoritative registry.');
    });
  });

  describe('9. Permanent Cost Policy Enforcement Tests (Zero API Spending)', () => {
    it('isZeroCostModel validates :free suffix and free-router models strictly', () => {
      // Verified zero-cost models
      expect(isZeroCostModel('meta-llama/llama-3.3-70b-instruct:free')).toBe(true);
      expect(isZeroCostModel('meta-llama/llama-3.1-8b-instruct:free')).toBe(true);
      expect(isZeroCostModel('google/gemini-2.0-flash-exp:free')).toBe(true);
      expect(isZeroCostModel('openrouter/free')).toBe(true);
      expect(isZeroCostModel('local/deterministic-fnv1a-v1')).toBe(true);
      expect(isZeroCostModel('deterministic-fnv1a-v1')).toBe(true);

      // Paid models MUST evaluate to false to protect university budget
      expect(isZeroCostModel('anthropic/claude-3.5-sonnet')).toBe(false);
      expect(isZeroCostModel('anthropic/claude-3-haiku')).toBe(false);
      expect(isZeroCostModel('openai/text-embedding-3-small')).toBe(false);
      expect(isZeroCostModel('openai/gpt-4o')).toBe(false);
      expect(isZeroCostModel('meta-llama/llama-3.3-70b-instruct')).toBe(false);
      expect(isZeroCostModel('')).toBe(false);
    });

    it('rejects remote paid embedding calls under Zero-Cost Policy', async () => {
      const originalKey = process.env.OPENROUTER_API_KEY;
      try {
        process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
        // With credentials present, attempting remote embedding with a paid model must be blocked
        await expect(
          EmbeddingService.generateEmbeddingWithMetadata('Test document for cost policy', {
            requireRemote: true,
          })
        ).rejects.toThrow(EmbeddingGenerationError);
      } finally {
        if (originalKey) {
          process.env.OPENROUTER_API_KEY = originalKey;
        } else {
          delete process.env.OPENROUTER_API_KEY;
        }
      }
    });

    it('OpenRouterService refuses non-free models and uses deterministic fallback without spending', async () => {
      const originalKey = process.env.OPENROUTER_API_KEY;
      try {
        process.env.OPENROUTER_API_KEY = 'sk-or-test-mock-key';
        // When configured with non-free model (or in fallback), generateAnswer provides grounded analysis safely
        const testDocs = [
          {
            id: 'doc_economy_steppe',
            title: 'Steppe Employment and Renewable Energy Transition',
            arabicTitle: 'التوظيف والانتقال نحو الطاقة المتجددة في السهوب',
            content: 'Steppe region economic diversification.',
            arabicContent: 'تنويع اقتصاد السهوب.',
            source: 'Decidix Synthetic Sector Assessment (not an official publication)',
            sourceUrl: null,
            period: '2025-Q4',
            category: 'economy',
            regionId: 'steppe',
            accessScope: 'public',
            similarityScore: 0.85,
            citation: '[Source: Steppe Employment and Renewable Energy Transition (2025-Q4)]',
          },
        ];
        const result = await OpenRouterService.generateAnswer(
          'Compare Delta and Steppe',
          'en',
          testDocs
        );

        expect(result).toBeDefined();
        expect(result.reply.text).toContain('Based on the retrieved Decidix records:');
        expect(result.reply.text).toContain('[Source: Steppe Employment and Renewable Energy Transition (2025-Q4)]');
        expect(result.suggested_prompts.length).toBeGreaterThan(0);
      } finally {
        if (originalKey) {
          process.env.OPENROUTER_API_KEY = originalKey;
        } else {
          delete process.env.OPENROUTER_API_KEY;
        }
      }
    });
  });
});
