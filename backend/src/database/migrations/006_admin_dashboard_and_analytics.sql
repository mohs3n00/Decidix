-- Decidix Migration 006: Admin Dashboard, User Management, Activity Analytics & Notification Campaigns

-- 1. Extend users table with status, must_change_password, and last_active_at
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMPTZ;

-- Synchronize status with is_active for legacy accounts
UPDATE "users"
  SET "status" = CASE WHEN "is_active" = false THEN 'suspended' ELSE 'active' END
  WHERE "status" IS NULL OR "status" = '';

-- Create index on user status
CREATE INDEX IF NOT EXISTS "idx_users_status" ON "users"("status");
CREATE INDEX IF NOT EXISTS "idx_users_last_active_at" ON "users"("last_active_at");

-- 2. Extend dataset_versions with size_bytes
ALTER TABLE "dataset_versions"
  ADD COLUMN IF NOT EXISTS "size_bytes" BIGINT DEFAULT 0;

-- 3. Create activity_logs table for privacy-preserving platform analytics
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" VARCHAR(64),
    "module" VARCHAR(64) NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_module" ON "activity_logs"("module");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_event_type" ON "activity_logs"("event_type");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs"("created_at" DESC);

-- 4. Create notification_campaigns table for push notification history
CREATE TABLE IF NOT EXISTS "notification_campaigns" (
    "id" VARCHAR(64) PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "arabic_title" VARCHAR(255),
    "arabic_body" TEXT,
    "target_audience" VARCHAR(32) NOT NULL DEFAULT 'all',
    "target_user_id" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'sent',
    "targeted_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "sent_by" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_campaigns_sent_by_fkey"
      FOREIGN KEY ("sent_by") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_notification_campaigns_sent_by" ON "notification_campaigns"("sent_by");
CREATE INDEX IF NOT EXISTS "idx_notification_campaigns_created_at" ON "notification_campaigns"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notification_campaigns_target" ON "notification_campaigns"("target_audience");
