CREATE TABLE IF NOT EXISTS "dataset_versions" (
  "id" VARCHAR(64) NOT NULL,
  "version" VARCHAR(64) NOT NULL,
  "filename" VARCHAR(255) NOT NULL,
  "object_key" TEXT NOT NULL,
  "checksum_sha256" VARCHAR(64) NOT NULL,
  "format" VARCHAR(16) NOT NULL,
  "source" VARCHAR(255) NOT NULL,
  "license" VARCHAR(255) NOT NULL,
  "coverage" TEXT NOT NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validated_at" TIMESTAMPTZ,
  "validation_status" VARCHAR(32) NOT NULL DEFAULT 'uploaded',
  "validation_error" TEXT,
  "record_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by" VARCHAR(64) NOT NULL,
  CONSTRAINT "dataset_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dataset_versions_version_key" UNIQUE ("version")
);

CREATE TABLE IF NOT EXISTS "dataset_records" (
  "id" VARCHAR(64) NOT NULL,
  "dataset_version_id" VARCHAR(64) NOT NULL,
  "record_index" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "is_retrievable" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dataset_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dataset_records_version_index_key" UNIQUE ("dataset_version_id", "record_index"),
  CONSTRAINT "dataset_records_dataset_version_id_fkey"
    FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_dataset_versions_active" ON "dataset_versions"("is_active");
CREATE INDEX IF NOT EXISTS "idx_dataset_versions_status" ON "dataset_versions"("validation_status");
CREATE INDEX IF NOT EXISTS "idx_dataset_records_retrievable"
  ON "dataset_records"("dataset_version_id", "is_retrievable");

ALTER TABLE "rag_documents"
  ADD COLUMN IF NOT EXISTS "dataset_version_id" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "idx_rag_documents_dataset_version"
  ON "rag_documents"("dataset_version_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rag_documents_dataset_version_id_fkey'
  ) THEN
    ALTER TABLE "rag_documents"
      ADD CONSTRAINT "rag_documents_dataset_version_id_fkey"
      FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
