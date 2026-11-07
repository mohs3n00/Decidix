-- Decidix Migration 005: Email Verification and Password Reset Tokens
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMPTZ;

UPDATE "users"
  SET "email_verified" = true,
      "email_verified_at" = NOW()
  WHERE "email_verified" = false;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_email_verification_user_id" ON "email_verification_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_verification_token_hash" ON "email_verification_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_email_verification_expires_at" ON "email_verification_tokens"("expires_at");

ALTER TABLE "email_verification_tokens"
  DROP CONSTRAINT IF EXISTS "email_verification_tokens_user_id_fkey",
  ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_password_reset_user_id" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_password_reset_token_hash" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_password_reset_expires_at" ON "password_reset_tokens"("expires_at");

ALTER TABLE "password_reset_tokens"
  DROP CONSTRAINT IF EXISTS "password_reset_tokens_user_id_fkey",
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
