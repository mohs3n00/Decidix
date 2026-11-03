-- Decidix SQL Migration: 003_sessions.sql
-- Add sessions table for JWT refresh token rotation and session revocation

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" VARCHAR(64) PRIMARY KEY,
    "user_id" VARCHAR(64) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "user_agent" VARCHAR(500),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_refresh_token_hash" ON "sessions"("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions"("expires_at");

