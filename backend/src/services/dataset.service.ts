import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { R2Service, sha256Hex } from '../integrations/r2.service.js';
import { normalizeDecidixCsv } from './dataset_csv.js';
import { DatasetParserService } from './dataset_parser.js';
import { MlForecasterService } from './ml_forecaster.service.js';
import { AppError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export type DatasetFormat = 'json' | 'csv' | 'tsv' | 'xlsx' | 'xls' | 'jsonl' | 'ndjson';

export interface DatasetMetadataInput {
  filename: string;
  format: DatasetFormat;
  source: string;
  license: string;
  coverage: string;
  name?: string;
  sourceUrl?: string;
  description?: string;
  classification?: string;
  sizeBytes?: number;
  checksumSha256?: string;
  sheetName?: string;
}

/** Upload hardening limits for the graduation MVP. */
export const DATASET_UPLOAD_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  supported: {
    json: { extension: '.json', mime: 'application/json' },
    csv: { extension: '.csv', mime: 'text/csv' },
    tsv: { extension: '.tsv', mime: 'text/tab-separated-values' },
    xlsx: { extension: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    xls: { extension: '.xls', mime: 'application/vnd.ms-excel' },
    jsonl: { extension: '.jsonl', mime: 'application/x-ndjson' },
    ndjson: { extension: '.ndjson', mime: 'application/x-ndjson' },
  } as const,
};

function assertSupportedUpload(filename: string, format: DatasetFormat, sizeBytes?: number): void {
  const spec = DATASET_UPLOAD_LIMITS.supported[format];
  if (!spec) {
    throw AppError.validation('Unsupported dataset format.', { format: 'UNSUPPORTED_FORMAT' });
  }
  const lower = filename.toLowerCase();
  const validExts: string[] = [spec.extension];
  if (format === 'jsonl') validExts.push('.ndjson');
  if (format === 'ndjson') validExts.push('.jsonl');
  if (!validExts.some((ext) => lower.endsWith(ext))) {
    throw AppError.validation(`File extension must match format ${format}.`, {
      filename: 'INVALID_FILE_EXTENSION',
    });
  }
  if (sizeBytes !== undefined && sizeBytes > DATASET_UPLOAD_LIMITS.maxBytes) {
    throw AppError.validation(
      `Dataset file exceeds the ${DATASET_UPLOAD_LIMITS.maxBytes} byte upload limit.`,
      { sizeBytes: 'FILE_TOO_LARGE' }
    );
  }
}

interface CanonicalDataset {
  regions: Array<{
    id: string;
    name: string;
    arabic_name: string;
    rank: number;
    score: number;
    change?: number;
    priority: string;
    population: number;
    latitude: number;
    longitude: number;
    boundary_geojson?: unknown;
  }>;
  indicators: Array<{
    key: string;
    label: string;
    arabic_label: string;
    domain: string;
    unit: string;
    higher_is_better?: boolean;
  }>;
  national_index_history: Array<{
    period: string;
    year: number;
    score: number;
    max_score?: number;
    change?: number;
    compared_with?: string;
    band: string;
    population: number;
    regions_count: number;
    at_risk_count?: number;
    ai_insight_text: string;
    ai_insight_arabic_text: string;
  }>;
  regional_metrics: Array<{
    region_id: string;
    indicator_key: string;
    year: number;
    value: number;
    change?: number;
    sparkline?: unknown;
  }>;
  sector_breakdowns?: Array<{
    sector: string;
    key: string;
    label: string;
    arabic_label: string;
    value: number;
    unit: string;
    sort_order?: number;
  }>;
  recommendations?: Array<{
    id: string;
    priority: string;
    region_id: string;
    domain: string;
    title: string;
    arabic_title: string;
    summary: string;
    arabic_summary: string;
    index_impact: number;
    estimated_cost_amount: number;
    estimated_cost_currency: string;
    confidence: number;
    status?: string;
  }>;
  metadata: {
    name: string;
    arabic_name: string;
    original_source: string;
    source_url?: string;
    license: string;
    geographic_coverage: string;
    time_coverage: string;
    update_frequency: string;
    record_count?: number;
    completeness_pct: number;
    timeliness_pct?: number;
    accuracy_pct?: number;
    age_days?: number;
    status?: string;
  };
  rag_documents?: Array<{
    id: string;
    title: string;
    arabic_title: string;
    content: string;
    arabic_content: string;
    source: string;
    source_url?: string;
    category: string;
    region_id?: string;
    access_scope?: string;
    metadata?: unknown;
  }>;
}

function requireCanonicalDataset(records: Array<Record<string, unknown>>): CanonicalDataset {
  if (records.length !== 1 || !records[0].canonical) {
    throw AppError.validation(
      'Dataset must contain one canonical object with versioned analytical tables.',
      { schema: 'CANONICAL_DATASET_REQUIRED' }
    );
  }
  const candidate = records[0].canonical;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw AppError.validation('Canonical dataset payload is invalid.', { schema: 'CANONICAL_DATASET_INVALID' });
  }
  const value = candidate as Record<string, unknown>;
  const requiredArrays = ['regions', 'indicators', 'national_index_history', 'regional_metrics'];
  for (const key of requiredArrays) {
    if (!Array.isArray(value[key]) || value[key].length === 0) {
      throw AppError.validation(`Canonical dataset field '${key}' must be a non-empty array.`, {
        schema: 'CANONICAL_DATASET_FIELD_REQUIRED',
      });
    }
  }
  if (!value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata)) {
    throw AppError.validation('Canonical dataset metadata is required.', {
      schema: 'CANONICAL_DATASET_METADATA_REQUIRED',
    });
  }
  return value as unknown as CanonicalDataset;
}

function validateCanonicalDataset(dataset: CanonicalDataset): void {
  // Ensure default metadata if omitted or partial
  dataset.metadata = {
    name: dataset.metadata?.name || 'Decidix Dataset',
    arabic_name: dataset.metadata?.arabic_name || 'مجموعة بيانات ديسيدكس',
    original_source: dataset.metadata?.original_source || 'Decidix Platform',
    source_url: dataset.metadata?.source_url,
    license: dataset.metadata?.license || 'Open Data License',
    geographic_coverage: dataset.metadata?.geographic_coverage || 'National',
    time_coverage: dataset.metadata?.time_coverage || '2025',
    update_frequency: dataset.metadata?.update_frequency || 'Annual',
    completeness_pct: typeof dataset.metadata?.completeness_pct === 'number' ? dataset.metadata.completeness_pct : 95.0,
    timeliness_pct: typeof dataset.metadata?.timeliness_pct === 'number' ? dataset.metadata.timeliness_pct : 90.0,
    accuracy_pct: typeof dataset.metadata?.accuracy_pct === 'number' ? dataset.metadata.accuracy_pct : 92.0,
    age_days: typeof dataset.metadata?.age_days === 'number' ? dataset.metadata.age_days : 0,
    status: dataset.metadata?.status || 'synced',
    record_count: dataset.metadata?.record_count ?? dataset.regional_metrics?.length ?? 0,
  };

  const regionIds = new Set(dataset.regions.map((region) => region.id));
  const indicatorKeys = new Set(dataset.indicators.map((indicator) => indicator.key));
  for (const metric of dataset.regional_metrics) {
    if (!regionIds.has(metric.region_id) || !indicatorKeys.has(metric.indicator_key)) {
      throw AppError.validation('Regional metrics must reference declared regions and indicators.', {
        referential_integrity: 'REGIONAL_METRIC_REFERENCE_MISSING',
      });
    }
  }
  for (const recommendation of dataset.recommendations ?? []) {
    if (!regionIds.has(recommendation.region_id)) {
      throw AppError.validation('Recommendations must reference declared regions.', {
        referential_integrity: 'RECOMMENDATION_REGION_MISSING',
      });
    }
  }
}

function parseDataset(
  content: Buffer,
  format: DatasetFormat,
  filename?: string,
  datasetId?: string
): { records: Array<Record<string, unknown>>; canonical?: CanonicalDataset; report: any } {
  if (content.length === 0) throw AppError.validation('Dataset file is empty.');
  const result = DatasetParserService.parse(content, format, { filename, datasetId });
  return {
    records: result.records,
    canonical: result.canonical as CanonicalDataset | undefined,
    report: result.report,
  };
}


/**
 * Runs a dataset write in one transaction.
 *
 * Ingesting the curated dataset writes ~1.5k regional-metric rows. Prisma's
 * interactive-transaction default of 5s is enough locally but expires against a
 * remote database (Heroku staging, ~30-60ms per round trip), aborting ingestion
 * with "Transaction already closed". The budget is widened explicitly rather
 * than retried, so a partial ingest can never be committed.
 */
function runInWriteTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, { maxWait: 15_000, timeout: 120_000 });
}

export class DatasetService {
  static async hasApprovedActiveDataset(): Promise<boolean> {
    try {
      return (await this.active()) !== null;
    } catch {
      return false;
    }
  }

  static async initiateUpload(userId: string, input: DatasetMetadataInput) {
    assertSupportedUpload(input.filename, input.format, input.sizeBytes);
    const id = randomUUID();
    const version = `v${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${id.slice(0, 8)}`;
    const objectKey = `datasets/${version}/${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const mime = DATASET_UPLOAD_LIMITS.supported[input.format]?.mime || 'application/octet-stream';
    const uploadUrl = await R2Service.createPresignedUploadUrl(
      objectKey,
      mime
    );
    return {
      id,
      version,
      object_key: objectKey,
      upload_url: uploadUrl,
      expires_in: 900,
      max_bytes: DATASET_UPLOAD_LIMITS.maxBytes,
      created_by: userId,
    };
  }

  static async completeUpload(id: string, userId: string, input: DatasetMetadataInput & { version: string; objectKey: string }) {
    assertSupportedUpload(input.filename, input.format, input.sizeBytes);

    // Idempotent completion: a retried request for an already registered
    // version returns the existing row only when it describes the same object.
    const existing = await prisma.datasetVersion.findUnique({ where: { id } });
    if (existing) {
      if (existing.objectKey !== input.objectKey) {
        throw AppError.badRequest(
          'This dataset version already exists with a different object.',
          'DATASET_UPLOAD_CONFLICT'
        );
      }
      return existing;
    }

    let object;
    try {
      object = await R2Service.headObject(input.objectKey);
    } catch {
      throw AppError.validation('The uploaded object was not found in storage.', {
        objectKey: 'DATASET_OBJECT_MISSING',
      });
    }

    const expectedMime = DATASET_UPLOAD_LIMITS.supported[input.format]?.mime;
    if (object.contentType && expectedMime) {
      const actualMime = object.contentType.split(';')[0].trim().toLowerCase();
      if (
        actualMime !== expectedMime.toLowerCase() &&
        actualMime !== 'application/octet-stream' &&
        actualMime !== 'binary/octet-stream'
      ) {
        throw AppError.validation('Stored object content type does not match the declared format.', {
          contentType: 'CONTENT_TYPE_MISMATCH',
        });
      }
    }
    if (object.contentLength !== undefined) {
      if (object.contentLength > DATASET_UPLOAD_LIMITS.maxBytes) {
        throw AppError.validation('Uploaded file exceeds the allowed size limit.', {
          sizeBytes: 'FILE_TOO_LARGE',
        });
      }
      if (input.sizeBytes !== undefined && object.contentLength !== input.sizeBytes) {
        throw AppError.validation('Stored object size does not match the declared size.', {
          sizeBytes: 'SIZE_MISMATCH',
        });
      }
    }

    // Presigned uploads carry no SHA-256 metadata, so hash the stored bytes here
    // (after the size check) and verify the caller's checksum when supplied.
    const content = await R2Service.downloadObject(input.objectKey);
    const checksumSha256 = sha256Hex(content);
    if (input.checksumSha256 && input.checksumSha256.toLowerCase() !== checksumSha256) {
      throw AppError.validation('Uploaded object checksum does not match the declared checksum.', {
        checksumSha256: 'CHECKSUM_MISMATCH',
      });
    }

    return prisma.datasetVersion.create({
      data: {
        id,
        version: input.version,
        filename: input.filename,
        objectKey: input.objectKey,
        checksumSha256,
        format: input.format,
        source: input.source,
        license: input.license,
        coverage: input.coverage,
        createdBy: userId,
        validationStatus: 'uploaded',
      },
    });
  }

  /**
   * Registers a dataset version from content already available in this process
   * (local bootstrap). The R2 upload path above remains the production entry
   * point; this only fills the same version row so validate()/ingest() run the
   * real canonical pipeline unchanged, including the checksum check.
   */
  static async registerLocalVersion(input: {
    id: string;
    version: string;
    filename: string;
    objectKey: string;
    content: Buffer;
    format: DatasetFormat;
    source: string;
    license: string;
    coverage: string;
    createdBy: string;
  }) {
    return prisma.datasetVersion.create({
      data: {
        id: input.id,
        version: input.version,
        filename: input.filename,
        objectKey: input.objectKey,
        checksumSha256: sha256Hex(input.content),
        format: input.format,
        source: input.source,
        license: input.license,
        coverage: input.coverage,
        createdBy: input.createdBy,
        validationStatus: 'uploaded',
      },
    });
  }

  static async inspect(id: string) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    const object = await R2Service.headObject(dataset.objectKey);
    return { ...dataset, object };
  }

  static async validate(id: string, providedContent?: Buffer) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    const content = providedContent ?? (await R2Service.downloadObject(dataset.objectKey));
    const actualChecksum = sha256Hex(content);
    if (actualChecksum !== dataset.checksumSha256) {
      await prisma.datasetVersion.update({
        where: { id },
        data: { validationStatus: 'invalid', validationError: 'SHA-256 checksum mismatch.' },
      });
      throw AppError.validation('Dataset checksum verification failed.', { checksumSha256: 'CHECKSUM_MISMATCH' });
    }
    // A version may only become "validated" when the payload is a usable
    // canonical dataset: it has to parse, and provenance, referential integrity
    // and quality ranges are all required, otherwise activation would publish an
    // empty or inconsistent dataset. A parse failure marks the version invalid
    // instead of leaving it in the "uploaded" state.
    let records: Array<Record<string, unknown>> = [];
    let canonical: CanonicalDataset | null = null;
    let report: any = null;
    try {
      const parsed = parseDataset(content, dataset.format as DatasetFormat, dataset.filename, dataset.id);
      records = parsed.records;
      canonical = parsed.canonical || null;
      report = parsed.report;

      if (canonical) {
        validateCanonicalDataset(canonical);
      } else {
        throw AppError.validation(
          'Dataset structure could not be mapped to required Decidix dimensions (region, indicator, year, value).',
          { mapping: 'CANONICAL_MAPPING_FAILED' }
        );
      }
    } catch (error) {
      if (report) {
        await prisma.datasetRecord.deleteMany({ where: { datasetVersionId: id } }).catch(() => {});
        await prisma.datasetRecord.create({
          data: {
            id: `${id}:report`,
            datasetVersionId: id,
            recordIndex: 0,
            payload: { __quality_report: report } as Prisma.InputJsonValue,
            isRetrievable: false,
          },
        }).catch(() => {});
      }
      const message =
        error instanceof AppError
          ? `${error.code}: ${error.message}`
          : 'Dataset validation failed.';
      await prisma.datasetVersion.update({
        where: { id },
        data: { validationStatus: 'invalid', validationError: message },
      });
      throw error;
    }

    // Persist quality report in dataset_records at index 0 for inspection
    if (report) {
      await prisma.datasetRecord.deleteMany({ where: { datasetVersionId: id } });
      await prisma.datasetRecord.create({
        data: {
          id: `${id}:report`,
          datasetVersionId: id,
          recordIndex: 0,
          payload: { __quality_report: report } as Prisma.InputJsonValue,
          isRetrievable: false,
        },
      });
    }

    return prisma.datasetVersion.update({
      where: { id },
      data: {
        validationStatus: 'validated',
        validationError: null,
        validatedAt: new Date(),
        recordCount: canonical?.metadata?.record_count ?? report?.processedRecords ?? records.length,
      },
    });
  }

  static async ingest(id: string, providedContent?: Buffer) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    if (dataset.validationStatus !== 'validated') {
      throw AppError.badRequest('Only validated dataset versions can be ingested.', 'DATASET_NOT_VALIDATED');
    }
    const content = providedContent ?? (await R2Service.downloadObject(dataset.objectKey));
    const parsed = parseDataset(content, dataset.format as DatasetFormat, dataset.filename, dataset.id);
    const records = parsed.records;
    const canonical = parsed.canonical;
    const report = parsed.report;

    if (canonical) {
      validateCanonicalDataset(canonical);
    }

    await runInWriteTransaction(async (tx) => {
      await tx.datasetRecord.deleteMany({ where: { datasetVersionId: id } });

      const recordsToInsert: Array<{
        id: string;
        datasetVersionId: string;
        recordIndex: number;
        payload: Prisma.InputJsonValue;
        isRetrievable: boolean;
      }> = [];

      if (report) {
        recordsToInsert.push({
          id: `${id}:report`,
          datasetVersionId: id,
          recordIndex: 0,
          payload: { __quality_report: report } as Prisma.InputJsonValue,
          isRetrievable: false,
        });
      }

      records.forEach((payload, idx) => {
        recordsToInsert.push({
          id: `${id}:${idx + 1}`,
          datasetVersionId: id,
          recordIndex: idx + 1,
          payload: payload as Prisma.InputJsonValue,
          isRetrievable: true,
        });
      });

      if (recordsToInsert.length > 0) {
        await tx.datasetRecord.createMany({ data: recordsToInsert });
      }

      await tx.datasetVersion.update({
        where: { id },
        data: { recordCount: canonical?.metadata?.record_count ?? report?.processedRecords ?? records.length },
      });

      if (canonical) {
        await tx.datasetMetadata.upsert({
          where: { id: `${id}:metadata` },
          create: {
            id: `${id}:metadata`,
            name: canonical.metadata.name,
            arabicName: canonical.metadata.arabic_name,
            originalSource: canonical.metadata.original_source,
            sourceUrl: canonical.metadata.source_url,
            license: canonical.metadata.license,
            geographicCoverage: canonical.metadata.geographic_coverage,
            timeCoverage: canonical.metadata.time_coverage,
            updateFrequency: canonical.metadata.update_frequency,
            datasetVersionId: id,
            recordCount: canonical?.metadata?.record_count ?? records.length,
            timelinessPct: canonical.metadata.timeliness_pct,
            accuracyPct: canonical.metadata.accuracy_pct,
            ageDays: canonical.metadata.age_days,
            status: canonical.metadata.status,
          },
          update: {
            name: canonical.metadata.name,
            arabicName: canonical.metadata.arabic_name,
            originalSource: canonical.metadata.original_source,
            sourceUrl: canonical.metadata.source_url,
            license: canonical.metadata.license,
            geographicCoverage: canonical.metadata.geographic_coverage,
            timeCoverage: canonical.metadata.time_coverage,
            updateFrequency: canonical.metadata.update_frequency,
            datasetVersionId: id,
            recordCount: canonical?.metadata?.record_count ?? records.length,
            timelinessPct: canonical.metadata.timeliness_pct,
            accuracyPct: canonical.metadata.accuracy_pct,
            ageDays: canonical.metadata.age_days,
            status: canonical.metadata.status,
          },
        });

        for (const region of canonical.regions) {
          await tx.region.upsert({
            where: { id: region.id },
            create: {
              id: region.id,
              name: region.name,
              arabicName: region.arabic_name,
              rank: region.rank,
              score: region.score,
              change: region.change ?? 0,
              priority: region.priority,
              population: region.population,
              latitude: region.latitude,
              longitude: region.longitude,
              boundaryGeojson: region.boundary_geojson as Prisma.InputJsonValue | undefined,
              datasetVersionId: id,
            },
            update: {
              name: region.name,
              arabicName: region.arabic_name,
              rank: region.rank,
              score: region.score,
              change: region.change ?? 0,
              priority: region.priority,
              population: region.population,
              latitude: region.latitude,
              longitude: region.longitude,
              boundaryGeojson: region.boundary_geojson as Prisma.InputJsonValue | undefined,
              datasetVersionId: id,
            },
          });
        }

        for (const indicator of canonical.indicators) {
          await tx.indicator.upsert({
            where: { key: indicator.key },
            create: {
              key: indicator.key,
              label: indicator.label,
              arabicLabel: indicator.arabic_label,
              domain: indicator.domain,
              unit: indicator.unit,
              higherIsBetter: indicator.higher_is_better ?? true,
              datasetVersionId: id,
            },
            update: {
              label: indicator.label,
              arabicLabel: indicator.arabic_label,
              domain: indicator.domain,
              unit: indicator.unit,
              higherIsBetter: indicator.higher_is_better ?? true,
              datasetVersionId: id,
            },
          });
        }

        if (canonical.national_index_history?.length) {
          await tx.nationalIndexHistory.deleteMany({ where: { datasetVersionId: id } });
          await tx.nationalIndexHistory.createMany({
            data: canonical.national_index_history.map((row: any) => ({
              period: row.period,
              year: row.year,
              score: row.score,
              maxScore: row.max_score ?? 100,
              change: row.change ?? 0,
              comparedWith: row.compared_with ?? 'previous period',
              band: row.band,
              population: row.population,
              regionsCount: row.regions_count,
              atRiskCount: row.at_risk_count ?? 0,
              aiInsightText: row.ai_insight_text,
              aiInsightArabicText: row.ai_insight_arabic_text,
              datasetVersionId: id,
            })),
          });
        }

        if (canonical.regional_metrics?.length) {
          await tx.regionalMetric.deleteMany({ where: { datasetVersionId: id } });
          const observationPairs = canonical.regional_metrics.map(
            (r: any) => Prisma.sql`(${r.region_id}, ${r.indicator_key}, ${r.year})`
          );
          if (observationPairs.length > 0) {
            await tx.$executeRaw`
              DELETE FROM regional_metrics
              WHERE (region_id, indicator_key, year) IN (${Prisma.join(observationPairs)})
            `;
          }
          await tx.regionalMetric.createMany({
            data: canonical.regional_metrics.map((row: any) => ({
              regionId: row.region_id,
              indicatorKey: row.indicator_key,
              year: row.year,
              value: row.value,
              change: row.change ?? 0,
              sparkline: row.sparkline as Prisma.InputJsonValue | undefined,
              datasetVersionId: id,
            })),
          });
        }
      await tx.sectorBreakdown.deleteMany({ where: { datasetVersionId: id } });
      if (canonical.sector_breakdowns?.length) {
        await tx.sectorBreakdown.createMany({
          data: canonical.sector_breakdowns.map((row) => ({
            sector: row.sector,
            key: row.key,
            label: row.label,
            arabicLabel: row.arabic_label,
            value: row.value,
            unit: row.unit,
            sortOrder: row.sort_order ?? 0,
            datasetVersionId: id,
          })),
        });
      }
      if (canonical.recommendations?.length) {
        await tx.aiRecommendation.deleteMany({
          where: {
            OR: [
              { datasetVersionId: id },
              { id: { in: canonical.recommendations.map((r) => r.id) } },
            ],
          },
        });
        await tx.aiRecommendation.createMany({
          data: canonical.recommendations.map((row) => ({
            id: row.id,
            priority: row.priority,
            regionId: row.region_id,
            domain: row.domain,
            title: row.title,
            arabicTitle: row.arabic_title,
            summary: row.summary,
            arabicSummary: row.arabic_summary,
            indexImpact: row.index_impact,
            estimatedCostAmount: row.estimated_cost_amount,
            estimatedCostCurrency: row.estimated_cost_currency,
            confidence: row.confidence,
            status: row.status ?? 'suggested',
            datasetVersionId: id,
          })),
        });
      } else {
        await tx.aiRecommendation.deleteMany({ where: { datasetVersionId: id } });
      }
      if (canonical.rag_documents?.length) {
        await tx.ragDocument.deleteMany({
          where: {
            OR: [
              { datasetVersionId: id },
              { id: { in: canonical.rag_documents.map((d) => d.id) } },
            ],
          },
        });
        await tx.ragDocument.createMany({
          data: canonical.rag_documents.map((row) => ({
            id: row.id,
            title: row.title,
            arabicTitle: row.arabic_title,
            content: row.content,
            arabicContent: row.arabic_content,
            source: row.source,
            sourceUrl: row.source_url,
            category: row.category,
            regionId: row.region_id,
            accessScope: row.access_scope ?? 'public',
            metadata: row.metadata as Prisma.InputJsonValue | undefined,
            datasetVersionId: id,
          })),
        });
      } else {
        await tx.ragDocument.deleteMany({ where: { datasetVersionId: id } });
      }
    }
  });
    return { id, record_count: records.length, status: 'ingested' };
  }

  static async activate(id: string) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    if (dataset.validationStatus !== 'validated') {
      throw AppError.badRequest('Only validated dataset versions can be activated.', 'DATASET_NOT_VALIDATED');
    }
    // A validated file that was never ingested has no rows to serve. Activating
    // it would leave every analytical endpoint answering for an empty version.
    const [metadataRows, regionRows, metricRows] = await Promise.all([
      prisma.datasetMetadata.count({ where: { datasetVersionId: id } }),
      prisma.region.count({ where: { datasetVersionId: id } }),
      prisma.regionalMetric.count({ where: { datasetVersionId: id } }),
    ]);
    if (metadataRows === 0 || regionRows === 0 || metricRows === 0) {
      throw AppError.badRequest(
        'Dataset version has not been ingested. Validate and ingest it before activation.',
        'DATASET_NOT_INGESTED'
      );
    }
    return runInWriteTransaction(async (tx) => {
      await tx.datasetVersion.updateMany({ data: { isActive: false }, where: { isActive: true } });
      return tx.datasetVersion.update({ where: { id }, data: { isActive: true } });
    });
  }

  static async active() {
    return prisma.datasetVersion.findFirst({
      where: { isActive: true, validationStatus: 'validated' },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  static async list(query?: { search?: string; status?: string }) {
    const where: Prisma.DatasetVersionWhereInput = {};
    if (query?.status) {
      where.validationStatus = query.status;
    }
    if (query?.search) {
      where.OR = [
        { version: { contains: query.search, mode: 'insensitive' } },
        { filename: { contains: query.search, mode: 'insensitive' } },
        { source: { contains: query.search, mode: 'insensitive' } },
        { coverage: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const versions = await prisma.datasetVersion.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        metadata: true,
      },
    });
    return versions.map((v) => {
      const meta = Array.isArray(v.metadata) ? v.metadata[0] : (v.metadata as any);
      return {
        id: v.id,
        version: v.version,
        filename: v.filename,
        format: v.format,
        source: v.source,
        license: v.license,
        coverage: v.coverage,
        validation_status: v.validationStatus,
        validation_error: v.validationError,
        record_count: meta?.recordCount ?? v.recordCount,
        is_active: v.isActive,
        created_by: v.createdBy,
        uploaded_at: v.uploadedAt,
        validated_at: v.validatedAt,
        metadata: meta
          ? {
              name: meta.name,
              arabic_name: meta.arabicName,
              geographic_coverage: meta.geographicCoverage,
              time_coverage: meta.timeCoverage,
              update_frequency: meta.updateFrequency,
              completeness_pct: meta.completenessPct,
              timeliness_pct: meta.timelinessPct,
              accuracy_pct: meta.accuracyPct,
              status: meta.status,
            }
          : null,
      };
    });
  }

  static async stats() {
    const [total, validated, pending, failed, active, lastUpdated] = await Promise.all([
      prisma.datasetVersion.count(),
      prisma.datasetVersion.count({ where: { validationStatus: 'validated' } }),
      prisma.datasetVersion.count({ where: { validationStatus: 'pending' } }),
      prisma.datasetVersion.count({ where: { validationStatus: 'invalid' } }),
      prisma.datasetVersion.findFirst({ where: { isActive: true } }),
      prisma.datasetVersion.findFirst({ orderBy: { uploadedAt: 'desc' }, select: { uploadedAt: true } }),
    ]);
    return {
      total,
      processed: validated,
      pending,
      failed,
      active_version: active?.version ?? null,
      active_version_id: active?.id ?? null,
      last_updated_at: lastUpdated?.uploadedAt ?? null,
    };
  }

  static async getById(id: string) {
    const dataset = await prisma.datasetVersion.findUnique({
      where: { id },
      include: { metadata: true },
    });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    let downloadUrl: string | null = null;
    try {
      if (dataset.objectKey && !dataset.objectKey.startsWith('local://')) {
        downloadUrl = await R2Service.createPresignedDownloadUrl(dataset.objectKey, 3600);
      }
    } catch {
      // non-blocking
    }
    const meta = Array.isArray(dataset.metadata) ? dataset.metadata[0] : (dataset.metadata as any);
    return {
      id: dataset.id,
      version: dataset.version,
      filename: dataset.filename,
      format: dataset.format,
      source: dataset.source,
      license: dataset.license,
      coverage: dataset.coverage,
      validation_status: dataset.validationStatus,
      validation_error: dataset.validationError,
      record_count: meta?.recordCount ?? dataset.recordCount,
      is_active: dataset.isActive,
      created_by: dataset.createdBy,
      uploaded_at: dataset.uploadedAt,
      validated_at: dataset.validatedAt,
      download_url: downloadUrl,
      metadata: meta
        ? {
            name: meta.name,
            arabic_name: meta.arabicName,
            geographic_coverage: meta.geographicCoverage,
            time_coverage: meta.timeCoverage,
            update_frequency: meta.updateFrequency,
            completeness_pct: meta.completenessPct,
            timeliness_pct: meta.timelinessPct,
            accuracy_pct: meta.accuracyPct,
            age_days: meta.ageDays,
            status: meta.status,
          }
        : null,
    };
  }

  static async getRecords(id: string, page = 1, limit = 20) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    const take = Math.min(100, Math.max(1, limit));
    const skip = Math.max(0, (page - 1) * take);
    const [total, records] = await Promise.all([
      prisma.datasetRecord.count({ where: { datasetVersionId: id, isRetrievable: true } }),
      prisma.datasetRecord.findMany({
        where: { datasetVersionId: id, isRetrievable: true },
        orderBy: { recordIndex: 'asc' },
        skip,
        take,
      }),
    ]);
    return {
      dataset_id: id,
      version: dataset.version,
      page,
      limit: take,
      total,
      total_pages: Math.ceil(total / take),
      records: records.map((r) => ({
        index: r.recordIndex,
        payload: r.payload,
      })),
    };
  }

  static async getReport(id: string) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    const reportRecord = await prisma.datasetRecord.findFirst({
      where: { datasetVersionId: id, recordIndex: 0 },
    });
    const payload = reportRecord?.payload as any;
    if (payload && payload.__quality_report) {
      return payload.__quality_report;
    }
    return {
      datasetId: id,
      filename: dataset.filename,
      format: dataset.format,
      totalInputRecords: dataset.recordCount,
      processedRecords: dataset.recordCount,
      rejectedRecords: 0,
      duplicateRecords: 0,
      rejectedRowDetails: [],
      columnStatistics: {},
      detectedColumns: [],
      canonicalMapping: null,
      appliedTransformations: ['Stored in database.'],
      validationWarnings: [],
      processingErrors: dataset.validationError ? [dataset.validationError] : [],
      status: dataset.validationStatus === 'validated' ? 'READY' : 'FAILED',
    };
  }

  static async retry(id: string) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    const validated = await this.validate(id);
    const ingested = await this.ingest(id);
    return {
      id,
      validation_status: validated.validationStatus,
      ingest_status: ingested.status,
      record_count: ingested.record_count,
    };
  }

  static async delete(id: string) {
    const dataset = await prisma.datasetVersion.findUnique({ where: { id } });
    if (!dataset) throw AppError.notFound('Dataset version not found.', 'DATASET_NOT_FOUND');
    if (dataset.isActive) {
      throw AppError.badRequest('Cannot delete an active dataset version. Activate another version first.', 'DATASET_ACTIVE');
    }
    await runInWriteTransaction(async (tx) => {
      await tx.datasetRecord.deleteMany({ where: { datasetVersionId: id } });
      await tx.datasetMetadata.deleteMany({ where: { datasetVersionId: id } });
      await tx.regionalMetric.deleteMany({ where: { datasetVersionId: id } });
      await tx.nationalIndexHistory.deleteMany({ where: { datasetVersionId: id } });
      await tx.sectorBreakdown.deleteMany({ where: { datasetVersionId: id } });
      await tx.aiRecommendation.deleteMany({ where: { datasetVersionId: id } });
      await tx.ragDocument.deleteMany({ where: { datasetVersionId: id } });
      await tx.region.updateMany({ where: { datasetVersionId: id }, data: { datasetVersionId: null } });
      await tx.indicator.updateMany({ where: { datasetVersionId: id }, data: { datasetVersionId: null } });
      await tx.datasetVersion.delete({ where: { id } });
    });
    try {
      if (dataset.objectKey && !dataset.objectKey.startsWith('local://')) {
        await R2Service.deleteObject(dataset.objectKey);
      }
    } catch {
      // non-blocking
    }
    return { message: 'Dataset version deleted successfully.', id };
  }

  static async uploadDirect(
    userId: string,
    input: DatasetMetadataInput & {
      content: string;
      autoActivate?: boolean;
    }
  ) {
    assertSupportedUpload(input.filename, input.format, input.sizeBytes);
    let contentBuffer: Buffer;
    if (input.content.startsWith('base64:')) {
      contentBuffer = Buffer.from(input.content.slice(7), 'base64');
    } else if (input.format === 'xlsx' || input.format === 'xls') {
      // Decode base64 for binary spreadsheets
      try {
        contentBuffer = Buffer.from(input.content, 'base64');
      } catch {
        contentBuffer = Buffer.from(input.content, 'binary');
      }
    } else {
      contentBuffer = Buffer.from(input.content, 'utf8');
    }
    const checksumSha256 = sha256Hex(contentBuffer);
    const id = randomUUID();
    const version = `v${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${id.slice(0, 8)}`;
    const objectKey = `datasets/${version}/${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    let storedInR2 = false;
    const mime = DATASET_UPLOAD_LIMITS.supported[input.format]?.mime || 'application/octet-stream';
    try {
      await R2Service.uploadObject(objectKey, contentBuffer, {
        contentType: mime,
      });
      storedInR2 = true;
    } catch (r2Err) {
      logger.warn('[DatasetService] R2 upload failed, using local storage fallback for dataset', { err: r2Err });
    }

    const finalObjectKey = storedInR2 ? objectKey : `local://${objectKey}`;

    await prisma.datasetVersion.create({
      data: {
        id,
        version,
        filename: input.filename,
        objectKey: finalObjectKey,
        checksumSha256,
        format: input.format,
        source: input.source,
        license: input.license,
        coverage: input.coverage,
        createdBy: userId,
        recordCount: 0,
        validationStatus: 'uploaded',
      },
    });

    const validationResult = await this.validate(id, contentBuffer);

    let ingestResult = null;
    if (validationResult.validationStatus === 'validated') {
      ingestResult = await this.ingest(id, contentBuffer);
      if (input.autoActivate) {
        await this.activate(id);
      }
    }

    return {
      id,
      version,
      filename: input.filename,
      validation_status: validationResult.validationStatus,
      ingest_status: ingestResult?.status ?? 'pending',
      record_count: ingestResult?.record_count ?? 0,
      is_active: !!input.autoActivate,
      message: 'Dataset uploaded and processed successfully.',
    };
  }
}
