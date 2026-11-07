import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Batch 1 regression: the active Prisma schema must describe only what the
 * standard migration history creates.
 *
 * The audit proved that M1 declarations in `schema.prisma` (while their SQL
 * lived only in `prisma/m1/`) made the client fail with
 * `P2022 dataset_versions.dataset_family does not exist` against a database
 * built from `prisma/migrations`. M1 stays a documented research artifact; it
 * must not leak back into the active schema unless its DDL is also promoted
 * into the migration history.
 */
const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

const M1_ONLY_DECLARATIONS = [
  'dataset_family',
  'bundle_key',
  'region_observations',
  'dataset_runtime_state',
  'dataset_activation_events',
  'observation_source_records',
  'migration_quarantine_records',
  'DatasetRuntimeState',
  'ObservationSourceRecord',
  'ModelRun',
];

describe('Prisma schema / migration alignment', () => {
  it('declares no M1-only tables or columns', () => {
    for (const marker of M1_ONLY_DECLARATIONS) {
      expect(schema.includes(marker), `M1-only declaration "${marker}" is not migration-backed`).toBe(false);
    }
  });

  it('keeps the migration-backed dataset version and record models', () => {
    expect(schema).toContain('model DatasetVersion {');
    expect(schema).toContain('model DatasetRecord {');
    expect(schema).toContain('datasetVersionId');
    expect(schema).toContain('@@map("dataset_versions")');
    expect(schema).toContain('@@map("dataset_records")');
    expect(schema).toContain('@@map("dataset_metadata")');
  });

  it('matches the legacy ON DELETE CASCADE declared by migration 20261104190000', () => {
    expect(schema).toMatch(
      /datasetVersion\s+DatasetVersion @relation\(fields: \[datasetVersionId\], references: \[id\], onDelete: Cascade\)/
    );
  });
});
