ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "google_subject" VARCHAR(255);
-- Plain unique index (not partial): matches Prisma's @unique exactly and
-- avoids `prisma migrate diff` drift. PostgreSQL unique indexes already
-- permit multiple NULLs, so this has the same effect as a WHERE-filtered
-- index for this column.
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_subject_key"
  ON "users"("google_subject");
