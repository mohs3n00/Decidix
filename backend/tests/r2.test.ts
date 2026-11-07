import { describe, expect, it, vi } from 'vitest';

/**
 * The R2 configuration status is derived from the process environment, so the
 * assertions below pin an UNCONFIGURED environment. Without this the suite would
 * change behaviour as soon as a developer puts working credentials in the
 * git-ignored `backend/.env`, which is exactly what happened once the real
 * bucket was connected.
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

import { R2Service, sha256Hex } from '../src/integrations/r2.service.js';

describe('Cloudflare R2 integration', () => {
  it('reports incomplete configuration without attempting a request', () => {
    const status = R2Service.configurationStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain('R2_ACCOUNT_ID');
    expect(status.bucketIsPlaceholder).toBe(true);
    expect(status.invalid).toContain('R2_BUCKET_NAME');
  });

  it('calculates and verifies SHA-256 checksums', () => {
    const content = Buffer.from('decidix-r2-test', 'utf8');
    const checksum = sha256Hex(content);
    expect(checksum).toHaveLength(64);
    expect(R2Service.verifyChecksum(content, checksum)).toBe(true);
    expect(R2Service.verifyChecksum(content, `${checksum.slice(0, -1)}0`)).toBe(false);
  });

  it('rejects connectivity when configuration is incomplete', async () => {
    await expect(R2Service.verifyConnection()).rejects.toThrow('R2 configuration is incomplete');
  });

  it('refuses to presign or read objects when configuration is incomplete', async () => {
    await expect(R2Service.createPresignedUploadUrl('datasets/v1/x.csv', 'text/csv')).rejects.toMatchObject({
      code: 'STORAGE_CONFIG_MISSING',
    });
    await expect(R2Service.headObject('datasets/v1/x.csv')).rejects.toMatchObject({
      code: 'STORAGE_CONFIG_MISSING',
    });
  });
});
