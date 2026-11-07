import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import { R2Service, sha256Hex } from '../src/integrations/r2.service.js';
import { DatasetService } from '../src/services/dataset.service.js';

/**
 * The 503 STORAGE_CONFIG_MISSING case needs an unconfigured storage config. The
 * process environment is pinned here so the suite does not start returning 200
 * merely because a developer's `backend/.env` holds working R2 credentials.
 */
vi.mock('../src/config/env.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config/env.js')>();
  return {
    ...actual,
    env: {
      ...actual.env,
      R2_ACCOUNT_ID: undefined,
      R2_ACCESS_KEY_ID: undefined,
      R2_SECRET_ACCESS_KEY: undefined,
      R2_BUCKET_NAME: 'your_bucket_name',
      R2_ENDPOINT: undefined,
    },
  };
});

/**
 * Mock-level upload tests (Batch: R2 upload).
 * These mock R2 and Prisma; they do NOT prove a real Cloudflare upload.
 */
const CONTENT = Buffer.from('region_id,year,development_index\ncentral_capital,2025,90.0\n', 'utf8');

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    filename: 'demo.csv',
    format: 'csv' as const,
    source: 'Synthetic demonstration fixture',
    license: 'test-only',
    coverage: 'one region',
    sizeBytes: CONTENT.length,
    ...overrides,
  };
}

function createToken(role: 'admin' | 'analyst' | 'viewer') {
  return jwt.sign(
    { id: `usr_${role}`, email: `${role}@decidix.gov.sa`, role, name: `${role} User` },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Dataset upload contract (mocked R2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a filename whose extension does not match the declared format', async () => {
    await expect(
      DatasetService.initiateUpload('usr_admin', baseInput({ filename: 'demo.txt' }))
    ).rejects.toMatchObject({ fields: { filename: 'INVALID_FILE_EXTENSION' } });
  });

  it('rejects an oversized file before presigning', async () => {
    await expect(
      DatasetService.initiateUpload('usr_admin', baseInput({ sizeBytes: 26 * 1024 * 1024 }))
    ).rejects.toMatchObject({ fields: { sizeBytes: 'FILE_TOO_LARGE' } });
  });

  it('returns a presigned upload response with a unique object key', async () => {
    const presign = vi
      .spyOn(R2Service, 'createPresignedUploadUrl')
      .mockResolvedValue('https://example.invalid/presigned' as never);
    const result = await DatasetService.initiateUpload('usr_admin', baseInput());
    expect(presign).toHaveBeenCalledOnce();
    expect(result.object_key).toContain('datasets/');
    expect(result.upload_url).toContain('presigned');
    expect(result.max_bytes).toBe(25 * 1024 * 1024);
  });

  it('returns 503 STORAGE_CONFIG_MISSING when R2 configuration is incomplete', async () => {
    const app = createApp();
    const token = createToken('admin');
    const res = await request(app)
      .post('/v1/datasets/uploads/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send(baseInput());

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('STORAGE_CONFIG_MISSING');
  });

  it('rejects upload initiation from a viewer role with 403 ROLE_NOT_AUTHORIZED', async () => {
    const app = createApp();
    const token = createToken('viewer');
    const res = await request(app)
      .post('/v1/datasets/uploads/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send(baseInput());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');
  });

  it('rejects completion when the object is missing from storage', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(null);
    vi.spyOn(R2Service, 'headObject').mockRejectedValue(new Error('NotFound') as never);
    await expect(
      DatasetService.completeUpload('v1', 'usr_admin', {
        ...baseInput(),
        version: 'v1',
        objectKey: 'datasets/v1/demo.csv',
      })
    ).rejects.toMatchObject({ fields: { objectKey: 'DATASET_OBJECT_MISSING' } });
  });

  it('rejects a stored size that differs from the declared size', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(null);
    vi.spyOn(R2Service, 'headObject').mockResolvedValue({
      key: 'datasets/v1/demo.csv',
      contentType: 'text/csv',
      contentLength: CONTENT.length + 5,
    } as never);
    await expect(
      DatasetService.completeUpload('v1', 'usr_admin', {
        ...baseInput(),
        version: 'v1',
        objectKey: 'datasets/v1/demo.csv',
      })
    ).rejects.toMatchObject({ fields: { sizeBytes: 'SIZE_MISMATCH' } });
  });

  it('rejects a checksum mismatch against the stored bytes', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue(null);
    vi.spyOn(R2Service, 'headObject').mockResolvedValue({
      key: 'datasets/v1/demo.csv',
      contentType: 'text/csv',
      contentLength: CONTENT.length,
    } as never);
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(CONTENT as never);
    await expect(
      DatasetService.completeUpload('v1', 'usr_admin', {
        ...baseInput({ checksumSha256: 'a'.repeat(64) }),
        version: 'v1',
        objectKey: 'datasets/v1/demo.csv',
      })
    ).rejects.toMatchObject({ fields: { checksumSha256: 'CHECKSUM_MISMATCH' } });
  });

  it('stores the computed SHA-256 and is idempotent for the same object', async () => {
    const digest = sha256Hex(CONTENT);
    vi.spyOn(R2Service, 'headObject').mockResolvedValue({
      key: 'datasets/v1/demo.csv',
      contentType: 'text/csv',
      contentLength: CONTENT.length,
    } as never);
    vi.spyOn(R2Service, 'downloadObject').mockResolvedValue(CONTENT as never);
    const created = { id: 'v1', objectKey: 'datasets/v1/demo.csv', checksumSha256: digest };
    vi.spyOn(prisma.datasetVersion, 'findUnique')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created as never);
    vi.spyOn(prisma.datasetVersion, 'create').mockResolvedValue(created as never);

    const first = await DatasetService.completeUpload('v1', 'usr_admin', {
      ...baseInput(),
      version: 'v1',
      objectKey: 'datasets/v1/demo.csv',
    });
    const second = await DatasetService.completeUpload('v1', 'usr_admin', {
      ...baseInput(),
      version: 'v1',
      objectKey: 'datasets/v1/demo.csv',
    });

    expect(first).toEqual(created);
    expect(second).toEqual(created);
    expect(prisma.datasetVersion.create).toHaveBeenCalledOnce();
  });

  it('rejects a duplicate completion for a different object', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue({
      id: 'v1',
      objectKey: 'datasets/other/demo.csv',
    } as never);
    await expect(
      DatasetService.completeUpload('v1', 'usr_admin', {
        ...baseInput(),
        version: 'v1',
        objectKey: 'datasets/v1/demo.csv',
      })
    ).rejects.toMatchObject({ code: 'DATASET_UPLOAD_CONFLICT' });
  });

  it('requires authentication for the upload endpoints', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/v1/datasets/uploads/initiate')
      .send(baseInput());
    expect(res.status).toBe(401);
  });

  it('preserves the active dataset when activation fails due to missing ingestion', async () => {
    vi.spyOn(prisma.datasetVersion, 'findUnique').mockResolvedValue({
      id: 'v_unintegrated',
      validationStatus: 'validated',
      isActive: false,
    } as never);
    vi.spyOn(prisma.datasetMetadata, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.region, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.regionalMetric, 'count').mockResolvedValue(0);
    const updateMany = vi.spyOn(prisma.datasetVersion, 'updateMany');

    await expect(DatasetService.activate('v_unintegrated')).rejects.toMatchObject({
      code: 'DATASET_NOT_INGESTED',
    });
    // The active version flag was not deactivated
    expect(updateMany).not.toHaveBeenCalled();
  });
});
