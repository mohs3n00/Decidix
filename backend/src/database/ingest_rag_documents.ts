import { fileURLToPath } from 'url';
import { prisma, testPrismaConnection } from './prisma.js';
import { SEED_RAG_DOCUMENTS } from './seed_data.js';
import { logger } from '../utils/logger.js';
import {
  EmbeddingService,
  MissingProviderCredentialsError,
  EmbeddingGenerationError,
  EMBEDDING_DIMENSIONS,
} from '../integrations/embedding.service.js';
import { RagRepository } from '../repositories/rag.repository.js';

export interface IngestionOptions {
  allowLocalFallback?: boolean;
}

export interface IngestionSummary {
  totalProcessed: number;
  provider: 'openrouter' | 'deterministic_local';
  model: string;
  dimensions: number;
  status: 'verified' | 'offline_fallback';
  errors: string[];
}

/**
 * Idempotently ingests and embeds RAG knowledge documents.
 * Ensures documents are NEVER silently stored with fake or truncated embeddings.
 */
export async function runRagIngestion(options?: IngestionOptions): Promise<IngestionSummary> {
  const allowLocalFallback = options?.allowLocalFallback ?? false;
  const isDbReady = await testPrismaConnection();

  logger.info(`Starting RAG document ingestion for ${SEED_RAG_DOCUMENTS.length} authoritative documents...`);

  const summary: IngestionSummary = {
    totalProcessed: 0,
    provider: 'deterministic_local',
    model: 'deterministic-fnv1a-v1',
    dimensions: EMBEDDING_DIMENSIONS,
    status: 'offline_fallback',
    errors: [],
  };

  for (const doc of SEED_RAG_DOCUMENTS) {
    const textToEmbed = `${doc.title} ${doc.arabic_title} ${doc.content} ${doc.arabic_content} ${doc.category}`;

    try {
      // 1. Generate embedding with strict metadata tracking
      const embedResult = await EmbeddingService.generateEmbeddingWithMetadata(textToEmbed, {
        requireRemote: !allowLocalFallback,
      });

      summary.provider = embedResult.provider;
      summary.model = embedResult.model;
      summary.dimensions = embedResult.dimensions;
      summary.status = embedResult.provider === 'openrouter' ? 'verified' : 'offline_fallback';

      const metadata = {
        period: doc.period,
        embedding_provider: embedResult.provider,
        embedding_model: embedResult.model,
        embedding_dimensions: embedResult.dimensions,
        embedding_version: embedResult.version,
        embedding_status: summary.status,
        embedded_at: new Date().toISOString(),
      };

      // 2. Persist in database if PostgreSQL is available
      if (isDbReady) {
        // Upsert base document fields first via Prisma
        await prisma.ragDocument.upsert({
          where: { id: doc.id },
          update: {
            title: doc.title,
            arabicTitle: doc.arabic_title,
            content: doc.content,
            arabicContent: doc.arabic_content,
            source: doc.source,
            category: doc.category,
            regionId: doc.region_id,
            metadata,
          },
          create: {
            id: doc.id,
            title: doc.title,
            arabicTitle: doc.arabic_title,
            content: doc.content,
            arabicContent: doc.arabic_content,
            source: doc.source,
            category: doc.category,
            regionId: doc.region_id,
            metadata,
          },
        });

        // Update pgvector column if vector extension is active
        try {
          const vectorSql = `[${embedResult.embedding.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE rag_documents SET embedding = $1::vector WHERE id = $2`,
            vectorSql,
            doc.id
          );
        } catch (vectorErr) {
          logger.warn(`Could not cast embedding to pgvector for document '${doc.id}'; pgvector may not be installed.`, {
            vectorErr,
          });
        }
      }

      // 3. Always update in-memory store for consistency
      RagRepository.upsertInMemoryDocument({
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
        metadata,
        embedding: embedResult.embedding,
      });

      summary.totalProcessed++;
    } catch (err) {
      const errorMsg = `Failed to embed document '${doc.id}': ${(err as Error).message}`;
      summary.errors.push(errorMsg);
      logger.error(errorMsg, { err });
      if (err instanceof MissingProviderCredentialsError || err instanceof EmbeddingGenerationError) {
        throw err;
      }
    }
  }

  logger.info(
    `RAG document ingestion completed: ${summary.totalProcessed} processed, model=${summary.model}, provider=${summary.provider}.`
  );
  return summary;
}

// Allow standalone execution: npx tsx src/database/ingest_rag_documents.ts
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runRagIngestion({ allowLocalFallback: false })
    .then(async (summary) => {
      console.log('Ingestion completed successfully:', summary);
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Ingestion aborted:', err.message);
      await prisma.$disconnect();
      process.exit(1);
    });
}

