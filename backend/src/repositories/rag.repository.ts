import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_RAG_DOCUMENTS } from '../database/seed_data.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  EmbeddingService,
  cosineSimilarity,
  generateDeterministicEmbedding,
  EMBEDDING_DIMENSIONS,
} from '../integrations/embedding.service.js';
import { DatasetService } from '../services/dataset.service.js';

export interface RetrievedDocument {
  id: string;
  title: string;
  arabicTitle: string;
  content: string;
  arabicContent: string;
  source: string;
  sourceUrl: string | null;
  period: string;
  category: string;
  regionId: string | null;
  accessScope: string;
  similarityScore: number;
  citation: string;
}

export interface RagSearchOptions {
  query?: string;
  queryEmbedding?: number[];
  queryModel?: string;
  regionId?: string | null;
  category?: string;
  accessScope?: 'public' | 'analyst' | 'restricted';
  minSimilarity?: number;
  limit?: number;
  allowInMemoryFallback?: boolean;
}

export interface RagSearchResult {
  documents: RetrievedDocument[];
  query: string;
  queryModel: string;
  totalFound: number;
  retrievalEngine: 'pgvector' | 'in_memory_cosine' | 'lexical_fallback';
  executionTimeMs: number;
}

export interface InMemoryRagDocument {
  id: string;
  title: string;
  arabicTitle: string;
  content: string;
  arabicContent: string;
  source: string;
  sourceUrl: string | null;
  period: string;
  category: string;
  regionId: string | null;
  accessScope: string;
  metadata: Record<string, any>;
  embedding: number[] | null;
}

/**
 * Builds standard citation format: [Source: Document Name (Period)]
 */
export function formatCitation(title: string, period: string): string {
  return `[Source: ${title} (${period})]`;
}

/**
 * In-memory document storage for deterministic offline testing and database fallback
 */
const inMemoryDocuments = new Map<string, InMemoryRagDocument>();

// Diagnostic test flags
let simulateDbFailureFlag = false;
let simulateMissingVectorExtensionFlag = false;

function initializeInMemoryStore(): void {
  inMemoryDocuments.clear();
  for (const doc of SEED_RAG_DOCUMENTS) {
    // Generate deterministic embedding for initial seed documents
    const textToEmbed = `${doc.title} ${doc.arabic_title} ${doc.content} ${doc.arabic_content} ${doc.category}`;
    const embedding = generateDeterministicEmbedding(textToEmbed);

    inMemoryDocuments.set(doc.id, {
      id: doc.id,
      title: doc.title,
      arabicTitle: doc.arabic_title,
      content: doc.content,
      arabicContent: doc.arabic_content,
      source: doc.source,
      sourceUrl: null,
      period: doc.period,
      category: doc.category,
      regionId: doc.region_id,
      accessScope: 'public',
      metadata: {
        period: doc.period,
        embedding_provider: 'deterministic_local',
        embedding_model: 'deterministic-fnv1a-v1',
        embedding_dimensions: EMBEDDING_DIMENSIONS,
        embedding_version: '1.0.0',
      },
      embedding,
    });
  }
}

// Initial populate
initializeInMemoryStore();

export class RagRepository {
  /**
   * Resets in-memory document store and test simulation flags.
   */
  static resetInMemoryStore(): void {
    simulateDbFailureFlag = false;
    simulateMissingVectorExtensionFlag = false;
    initializeInMemoryStore();
  }

  /**
   * Sets test diagnostic simulation flags.
   */
  static setSimulations(options: { dbFailure?: boolean; missingVectorExtension?: boolean }): void {
    if (options.dbFailure !== undefined) simulateDbFailureFlag = options.dbFailure;
    if (options.missingVectorExtension !== undefined) simulateMissingVectorExtensionFlag = options.missingVectorExtension;
  }

  /**
   * Adds or updates an in-memory document.
   */
  static upsertInMemoryDocument(doc: InMemoryRagDocument): void {
    inMemoryDocuments.set(doc.id, doc);
  }

  /**
   * Removes an in-memory document by ID.
   */
  static removeInMemoryDocument(id: string): boolean {
    return inMemoryDocuments.delete(id);
  }

  /**
   * Searches knowledge documents using vector similarity and metadata filters.
   */
  static async search(options: RagSearchOptions): Promise<RagSearchResult> {
    const startTime = Date.now();
    const query = options.query || '';
    const minSimilarity = options.minSimilarity ?? env.RAG_SIMILARITY_THRESHOLD ?? 0.65;
    const limit = options.limit ?? 3;
    const activeDataset = env.NODE_ENV === 'test' ? true : await DatasetService.active();
    if (!activeDataset) {
      return {
        documents: [],
        query,
        queryModel: options.queryModel || 'deterministic-fnv1a-v1',
        totalFound: 0,
        retrievalEngine: 'lexical_fallback',
        executionTimeMs: Date.now() - startTime,
      };
    }
    const activeDatasetId = activeDataset === true ? null : activeDataset.id;

    // 1. Resolve query vector and model
    let queryVector = options.queryEmbedding;
    let queryModel = options.queryModel;

    if (!queryVector || queryVector.length !== EMBEDDING_DIMENSIONS) {
      if (query.trim().length > 0) {
        const embedRes = await EmbeddingService.generateEmbeddingWithMetadata(query);
        queryVector = embedRes.embedding;
        queryModel = queryModel || embedRes.model;
      }
    } else if (!queryModel) {
      queryModel = 'deterministic-fnv1a-v1';
    }

    const activeModel = queryModel || 'deterministic-fnv1a-v1';

    // 2. Attempt live PostgreSQL vector retrieval if reachable and not simulated failing
    const isDbReady = !simulateDbFailureFlag && (await testPrismaConnection());

    if (isDbReady && queryVector && queryVector.length === EMBEDDING_DIMENSIONS) {
      try {
        // Verify pgvector extension
        if (simulateMissingVectorExtensionFlag) {
          throw new Error('Simulated pgvector extension missing');
        }

        const extCheck = await prisma.$queryRaw<Array<{ extname: string }>>`
          SELECT extname FROM pg_extension WHERE extname = 'vector';
        `;

        if (extCheck && extCheck.length > 0) {
          const vectorSql = `[${queryVector.join(',')}]`;

          const results = await prisma.$queryRawUnsafe<
            Array<{
              id: string;
              title: string;
              arabicTitle: string;
              content: string;
              arabicContent: string;
              source: string;
              sourceUrl: string | null;
              category: string;
              regionId: string | null;
              accessScope: string;
              metadata: any;
              similarityScore: number;
            }>
          >(
            `SELECT
              id,
              title,
              arabic_title AS "arabicTitle",
              content,
              arabic_content AS "arabicContent",
              source,
              source_url AS "sourceUrl",
              category,
              region_id AS "regionId",
              access_scope AS "accessScope",
              metadata,
              (1 - (embedding <=> $1::vector)) AS "similarityScore"
            FROM rag_documents
            WHERE embedding IS NOT NULL
              AND ($2::text IS NULL OR region_id = $2)
              AND ($3::text IS NULL OR category = $3)
              AND ($4::text IS NULL OR access_scope = $4)
              AND ($7::text IS NULL OR metadata->>'embedding_model' IS NULL OR metadata->>'embedding_model' = $7)
              AND ($8::text IS NULL OR dataset_version_id = $8)
              AND (1 - (embedding <=> $1::vector)) >= $5
            ORDER BY "similarityScore" DESC
            LIMIT $6;`,
            vectorSql,
            options.regionId ?? null,
            options.category ?? null,
            options.accessScope ?? null,
            minSimilarity,
            limit,
            activeModel,
            activeDatasetId
          );

          const mapped: RetrievedDocument[] = results.map((row) => {
            const period = row.metadata?.period || '2025-Q4';
            return {
              id: row.id,
              title: row.title,
              arabicTitle: row.arabicTitle,
              content: row.content,
              arabicContent: row.arabicContent,
              source: row.source,
              sourceUrl: row.sourceUrl,
              period,
              category: row.category,
              regionId: row.regionId,
              accessScope: row.accessScope,
              similarityScore: Math.round(Number(row.similarityScore) * 1000) / 1000,
              citation: formatCitation(row.title, period),
            };
          });

          return {
            documents: mapped,
            query,
            queryModel: activeModel,
            totalFound: mapped.length,
            retrievalEngine: 'pgvector',
            executionTimeMs: Date.now() - startTime,
          };
        }
      } catch (err) {
        logger.warn('Live pgvector search failed, engaging deterministic in-memory fallback', { err });
      }
    }

    // 3. In-memory retrieval fallback (for offline tests, local dev, or when pgvector is absent)
    if (options.allowInMemoryFallback === false) {
      return {
        documents: [],
        query,
        queryModel: activeModel,
        totalFound: 0,
        retrievalEngine: 'lexical_fallback',
        executionTimeMs: Date.now() - startTime,
      };
    }
    return this.searchInMemory(query, queryVector, activeModel, options, startTime);
  }

  /**
   * Internal in-memory retrieval engine.
   */
  private static searchInMemory(
    query: string,
    queryVector: number[] | undefined,
    queryModel: string,
    options: RagSearchOptions,
    startTime: number
  ): RagSearchResult {
    const minSimilarity = options.minSimilarity ?? env.RAG_SIMILARITY_THRESHOLD ?? 0.65;
    const limit = options.limit ?? 3;
    const regionId = options.regionId ? options.regionId.toLowerCase() : null;
    const category = options.category ? options.category.toLowerCase() : null;
    const accessScope = options.accessScope || null;

    // Filter documents matching metadata criteria first
    let candidateDocs = Array.from(inMemoryDocuments.values()).filter((doc) => {
      if (regionId && doc.regionId && doc.regionId.toLowerCase() !== regionId) {
        return false;
      }
      if (category && doc.category.toLowerCase() !== category) {
        return false;
      }
      if (accessScope && doc.accessScope !== accessScope) {
        return false;
      }
      return true;
    });

    // Check if query vector and document embeddings are available for cosine similarity
    const hasEmbeddings = queryVector && queryVector.length === EMBEDDING_DIMENSIONS;

    if (hasEmbeddings) {
      const scoredDocs: RetrievedDocument[] = [];

      for (const doc of candidateDocs) {
        if (!doc.embedding || doc.embedding.length !== EMBEDDING_DIMENSIONS) {
          continue; // Missing embedding on document is excluded from vector similarity
        }

        // Mixed-model vector rejection:
        // Vectors generated by different embedding models inhabit mathematically incompatible spaces.
        // Comparing vectors from disparate models produces meaningless distance and is strictly prevented.
        const docModel = doc.metadata?.embedding_model;
        if (queryModel && docModel && queryModel !== docModel) {
          continue;
        }

        const score = cosineSimilarity(queryVector, doc.embedding);
        const roundedScore = Math.round(score * 1000) / 1000;

        // Apply strict similarity threshold
        if (roundedScore >= minSimilarity) {
          scoredDocs.push({
            id: doc.id,
            title: doc.title,
            arabicTitle: doc.arabicTitle,
            content: doc.content,
            arabicContent: doc.arabicContent,
            source: doc.source,
            sourceUrl: doc.sourceUrl,
            period: doc.period,
            category: doc.category,
            regionId: doc.regionId,
            accessScope: doc.accessScope,
            similarityScore: roundedScore,
            citation: formatCitation(doc.title, doc.period),
          });
        }
      }

      scoredDocs.sort((a, b) => b.similarityScore - a.similarityScore);
      const topK = scoredDocs.slice(0, limit);

      return {
        documents: topK,
        query,
        queryModel,
        totalFound: topK.length,
        retrievalEngine: 'in_memory_cosine',
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Lexical fallback when no vector is provided (keyword overlap calculation)
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (queryTokens.length === 0) {
      return {
        documents: [],
        query,
        queryModel,
        totalFound: 0,
        retrievalEngine: 'lexical_fallback',
        executionTimeMs: Date.now() - startTime,
      };
    }

    const scoredDocs: RetrievedDocument[] = [];

    for (const doc of candidateDocs) {
      const fullText = `${doc.title} ${doc.arabicTitle} ${doc.content} ${doc.arabicContent} ${doc.category}`.toLowerCase();
      let matches = 0;
      for (const token of queryTokens) {
        if (fullText.includes(token)) matches++;
      }

      const lexicalScore = matches / queryTokens.length;
      if (lexicalScore >= minSimilarity || (lexicalScore > 0 && minSimilarity <= 0.5)) {
        scoredDocs.push({
          id: doc.id,
          title: doc.title,
          arabicTitle: doc.arabicTitle,
          content: doc.content,
          arabicContent: doc.arabicContent,
          source: doc.source,
          sourceUrl: doc.sourceUrl,
          period: doc.period,
          category: doc.category,
          regionId: doc.regionId,
          accessScope: doc.accessScope,
          similarityScore: Math.round(lexicalScore * 1000) / 1000,
          citation: formatCitation(doc.title, doc.period),
        });
      }
    }

    scoredDocs.sort((a, b) => b.similarityScore - a.similarityScore);
    const topK = scoredDocs.slice(0, limit);

    return {
      documents: topK,
      query,
      queryModel,
      totalFound: topK.length,
      retrievalEngine: 'lexical_fallback',
      executionTimeMs: Date.now() - startTime,
    };
  }
}
