import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

export interface R2ConfigurationStatus {
  configured: boolean;
  missing: string[];
  invalid: string[];
  bucketIsPlaceholder: boolean;
}

export interface R2ObjectMetadata {
  key: string;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  checksumSha256?: string;
  metadata?: Record<string, string>;
}

function isPlaceholder(value: string | undefined): boolean {
  return !value || /^(your_|change_|replace_|placeholder|<)/i.test(value.trim());
}

export function getR2ConfigurationStatus(): R2ConfigurationStatus {
  const resolvedEndpoint =
    env.R2_ENDPOINT ||
    (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

  const required: Array<[string, string | undefined]> = [
    ['R2_ACCOUNT_ID', env.R2_ACCOUNT_ID],
    ['R2_ACCESS_KEY_ID', env.R2_ACCESS_KEY_ID],
    ['R2_SECRET_ACCESS_KEY', env.R2_SECRET_ACCESS_KEY],
    ['R2_BUCKET_NAME', env.R2_BUCKET_NAME],
    ['R2_ENDPOINT', resolvedEndpoint],
  ];
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  const invalid: string[] = [];

  if (env.R2_ACCOUNT_ID && isPlaceholder(env.R2_ACCOUNT_ID)) {
    invalid.push('R2_ACCOUNT_ID');
  }
  if (env.R2_ACCESS_KEY_ID && isPlaceholder(env.R2_ACCESS_KEY_ID)) {
    invalid.push('R2_ACCESS_KEY_ID');
  }
  if (env.R2_SECRET_ACCESS_KEY && isPlaceholder(env.R2_SECRET_ACCESS_KEY)) {
    invalid.push('R2_SECRET_ACCESS_KEY');
  }
  if (resolvedEndpoint) {
    if (isPlaceholder(resolvedEndpoint) || !resolvedEndpoint.includes('.r2.cloudflarestorage.com')) {
      invalid.push('R2_ENDPOINT');
    }
  }

  const bucketIsPlaceholder = isPlaceholder(env.R2_BUCKET_NAME);
  if (bucketIsPlaceholder && env.R2_BUCKET_NAME) invalid.push('R2_BUCKET_NAME');

  return {
    configured: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    bucketIsPlaceholder,
  };
}

function requireR2Configuration(): {
  bucket: string;
  client: S3Client;
} {
  const status = getR2ConfigurationStatus();
  if (!status.configured) {
    throw AppError.unavailable(
      `R2 configuration is incomplete. Missing: ${status.missing.join(', ') || 'none'}; invalid: ${status.invalid.join(', ') || 'none'}.`,
      'STORAGE_CONFIG_MISSING'
    );
  }

  const endpoint =
    env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  return {
    bucket: env.R2_BUCKET_NAME!,
    client: new S3Client({
      region: env.R2_REGION,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    }),
  };
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  throw new Error('R2 object body is not a supported readable stream.');
}

export function sha256Hex(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export class R2Service {
  static configurationStatus(): R2ConfigurationStatus {
    return getR2ConfigurationStatus();
  }

  static async verifyConnection(): Promise<{ bucket: string; reachable: true }> {
    const { client, bucket } = requireR2Configuration();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { bucket, reachable: true };
  }

  static async uploadObject(
    key: string,
    content: Buffer,
    options: { contentType: string; metadata?: Record<string, string> }
  ): Promise<R2ObjectMetadata> {
    const { client, bucket } = requireR2Configuration();
    const checksumSha256 = sha256Hex(content);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: options.contentType,
        Metadata: { ...options.metadata, sha256: checksumSha256 },
      })
    );
    return { key, contentType: options.contentType, contentLength: content.length, checksumSha256 };
  }

  static async downloadObject(key: string): Promise<Buffer> {
    const { client, bucket } = requireR2Configuration();
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return bodyToBuffer(response.Body);
  }

  static async headObject(key: string): Promise<R2ObjectMetadata> {
    const { client, bucket } = requireR2Configuration();
    const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      key,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag,
      checksumSha256: response.Metadata?.sha256,
      metadata: response.Metadata,
    };
  }

  static async deleteObject(key: string): Promise<void> {
    const { client, bucket } = requireR2Configuration();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  static async createPresignedUploadUrl(key: string, contentType: string, expiresIn = 900): Promise<string> {
    const { client, bucket } = requireR2Configuration();
    return getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn }
    );
  }

  static async createPresignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    const { client, bucket } = requireR2Configuration();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }

  static verifyChecksum(content: Buffer, expectedSha256: string): boolean {
    return sha256Hex(content).toLowerCase() === expectedSha256.trim().toLowerCase();
  }
}
