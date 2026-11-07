import { randomUUID } from 'node:crypto';
import { R2Service, sha256Hex } from '../integrations/r2.service.js';

async function main(): Promise<void> {
  const status = R2Service.configurationStatus();
  console.log(
    JSON.stringify({
      configured: status.configured,
      missing: status.missing,
      invalid: status.invalid,
      bucketIsPlaceholder: status.bucketIsPlaceholder,
    })
  );
  if (!status.configured) {
    console.log('REAL_R2_CONNECTION=blocked_by_configuration');
    process.exitCode = 2;
    return;
  }

  const key = `verification/decidix-r2-${randomUUID()}.txt`;
  const content = Buffer.from(`Decidix R2 verification ${new Date().toISOString()}`, 'utf8');
  let uploaded = false;
  try {
    await R2Service.verifyConnection();
    console.log('BUCKET_ACCESS=success');
    const uploadResult = await R2Service.uploadObject(key, content, { contentType: 'text/plain' });
    uploaded = true;
    const downloaded = await R2Service.downloadObject(key);
    const downloadedChecksum = sha256Hex(downloaded);
    const checksumMatches =
      downloadedChecksum === uploadResult.checksumSha256 && R2Service.verifyChecksum(downloaded, uploadResult.checksumSha256);
    console.log(JSON.stringify({ upload: 'success', download: 'success', checksum: checksumMatches ? 'success' : 'failed' }));
    if (!checksumMatches) process.exitCode = 1;
  } finally {
    if (uploaded) {
      await R2Service.deleteObject(key);
      console.log('TEST_OBJECT_CLEANUP=success');
    }
  }
}

main().catch((error: unknown) => {
  console.error(`REAL_R2_CONNECTION=failed:${error instanceof Error ? error.name : 'UnknownError'}`);
  process.exitCode = 1;
});
