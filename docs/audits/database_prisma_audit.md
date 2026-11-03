# Decidix — Database & Prisma Implementation Audit

**Document Version:** 1.0.0  
**Phase:** Phase B — Backend Production Hardening & Database Audit  
**Author:** Lead Software Architect & Backend Engineering Team  
**Date:** November 2026  
**Status:** Audit & Architecture Review Complete (Pre-Implementation)  

---

## 1. Executive Summary & Audit Mission

This audit assesses the existing database architecture, schema migrations, and data access layers in the Decidix backend (`backend/`). The objective is to determine the cleanest, non-destructive path to integrate **Prisma ORM** as the primary data-access layer while preserving existing working functionality, maintaining strict API contract compatibility (`docs/api_contract.md`), and ensuring flawless operation on **Heroku Postgres (`essential-0`)**.

### Non-Negotiable Directives:
- **Zero Destruction:** Never drop existing tables, alter established column semantics, or wipe migrations.
- **Build, Don't Rebuild:** Preserve the existing 13 relational tables and their constraints.
- **Single Canonical Migration Authority:** Consolidate migrations into Prisma Migrate with baseline awareness.
- **Resilient Fallback:** Retain in-memory mock fallback so local development and testing function cleanly even when local PostgreSQL is offline.

---

## 2. Current Database Implementation Overview

| Dimension | Current Implementation | Status / Observation |
|---|---|---|
| **Database Engine** | PostgreSQL 15+ | Targeted for Heroku Postgres (`essential-0`, EU region). |
| **Node.js Driver** | `pg` (`^8.13.3`) + `@types/pg` (`^8.11.11`) | Installed in `backend/package.json`. |
| **Connection Pool** | `pg.Pool` in `backend/src/database/pool.ts` | Configured with `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`. |
| **Connectivity Resilience** | `testDbConnection()` in `pool.ts` | Gracefully catches `ECONNREFUSED` on `localhost:5432` without crashing process. |
| **Existing Migrations** | 2 SQL migration files in `backend/src/database/migrations/` | Managed via custom script `backend/src/database/migrate.ts` tracking `schema_migrations`. |
| **Existing Seeder** | `backend/src/database/seed.ts` | Uses raw parameterized SQL to seed 12 regions, indicators, projects, and users from `seed_data.ts`. |
| **Router Data Access** | In-Memory Collections & Static Data (`seed_data.ts`) | **Zero raw SQL in Express routers.** Routers are decoupled from `dbPool`. |
| **Prisma Status** | Not Installed | No `prisma` or `@prisma/client` in `package.json`; no `prisma/` folder exists. |

---

## 3. Complete Existing Database Schema Inventory

The existing SQL migrations (`001_initial_schema.sql` and `002_pgvector_rag.sql`) define 13 tables plus the migration tracker:

```mermaid
erDiagram
    users ||--o{ citizen_reports : authors
    users ||--o{ citizen_report_likes : likes
    users ||--o{ audit_logs : generates
    
    regions ||--o{ regional_metrics : has
    regions ||--o{ development_projects : hosts
    regions ||--o{ citizen_reports : contains
    regions ||--o{ ai_recommendations : targets
    regions ||--o{ rag_documents : associates

    indicators ||--o{ regional_metrics : measures
    citizen_reports ||--o{ citizen_report_likes : receives

    users {
        varchar_64 id PK
        varchar_255 email UK
        varchar_255 password_hash
        varchar_255 name
        varchar_255 arabic_name
        varchar_32 role
        varchar_100 department
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    regions {
        varchar_64 id PK "Slug e.g. central_capital"
        varchar_100 name
        varchar_100 arabic_name
        integer rank
        numeric_5_1 score
        numeric_5_1 change
        varchar_32 priority
        integer population
        numeric_9_6 latitude
        numeric_9_6 longitude
        jsonb boundary_geojson
        timestamptz created_at
        timestamptz updated_at
    }

    indicators {
        varchar_64 key PK
        varchar_100 label
        varchar_100 arabic_label
        varchar_32 domain
        varchar_32 unit
        boolean higher_is_better
        text description
        text arabic_description
        timestamptz created_at
    }

    national_index_history {
        serial id PK
        varchar_32 period
        integer year
        numeric_5_1 score
        numeric_5_1 max_score
        numeric_5_1 change
        varchar_64 compared_with
        varchar_32 band
        integer population
        integer regions_count
        integer at_risk_count
        text ai_insight_text
        text ai_insight_arabic_text
        timestamptz created_at
    }

    regional_metrics {
        serial id PK
        varchar_64 region_id FK
        varchar_64 indicator_key FK
        integer year
        numeric_10_2 value
        numeric_5_2 change
        jsonb sparkline
        timestamptz created_at
    }

    sector_breakdowns {
        serial id PK
        varchar_32 sector
        varchar_64 key
        varchar_100 label
        varchar_100 arabic_label
        numeric_10_2 value
        varchar_32 unit
        integer sort_order
    }

    development_projects {
        varchar_64 id PK
        varchar_255 title
        varchar_255 arabic_title
        varchar_64 region_id FK
        varchar_32 status
        integer progress
        numeric_15_2 budget_amount
        varchar_8 budget_currency
        date due_date
        date completed_at
        timestamptz created_at
        timestamptz updated_at
    }

    citizen_reports {
        varchar_64 id PK
        varchar_255 title
        varchar_255 arabic_title
        text description
        text arabic_description
        varchar_32 category
        varchar_32 status
        varchar_64 region_id FK
        integer likes_count
        varchar_64 author_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    citizen_report_likes {
        varchar_64 report_id PK,FK
        varchar_64 user_id PK
        timestamptz created_at
    }

    ai_recommendations {
        varchar_64 id PK
        varchar_32 priority
        varchar_64 region_id FK
        varchar_32 domain
        varchar_255 title
        varchar_255 arabic_title
        text summary
        text arabic_summary
        numeric_4_1 index_impact
        numeric_15_2 estimated_cost_amount
        varchar_8 estimated_cost_currency
        integer confidence
        varchar_32 status
        timestamptz created_at
        timestamptz updated_at
    }

    dataset_metadata {
        varchar_64 id PK
        varchar_255 name
        varchar_255 arabic_name
        varchar_255 original_source
        text source_url
        varchar_100 license
        varchar_100 geographic_coverage
        varchar_100 time_coverage
        varchar_50 update_frequency
        integer record_count
        numeric_5_1 completeness_pct
        numeric_5_1 timeliness_pct
        numeric_5_1 accuracy_pct
        integer age_days
        varchar_32 status
        timestamptz last_synced_at
    }

    audit_logs {
        bigserial id PK
        varchar_64 user_id
        varchar_64 action
        varchar_64 entity_type
        varchar_64 entity_id
        jsonb details
        varchar_45 ip_address
        timestamptz created_at
    }

    rag_documents {
        varchar_64 id PK
        varchar_255 title
        varchar_255 arabic_title
        text content
        text arabic_content
        varchar_255 source
        text source_url
        varchar_64 category
        varchar_64 region_id FK
        varchar_32 access_scope
        jsonb metadata
        jsonb embedding
        timestamptz created_at
        timestamptz updated_at
    }
```

### Detailed Table Specifications

1. **`users`**:
   - Columns: `id` (VARCHAR(64), PK), `email` (VARCHAR(255), UNIQUE), `password_hash` (VARCHAR(255)), `name` (VARCHAR(255)), `arabic_name` (VARCHAR(255)), `role` (VARCHAR(32), CHECK: admin, analyst, planner, viewer), `department` (VARCHAR(100)), `is_active` (BOOLEAN), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
2. **`regions`**:
   - Columns: `id` (VARCHAR(64), PK), `name` (VARCHAR(100)), `arabic_name` (VARCHAR(100)), `rank` (INT), `score` (NUMERIC(5,1)), `change` (NUMERIC(5,1)), `priority` (VARCHAR(32)), `population` (INT), `latitude` (NUMERIC(9,6)), `longitude` (NUMERIC(9,6)), `boundary_geojson` (JSONB), `created_at`, `updated_at`.
   - Indexes: `idx_regions_rank`, `idx_regions_priority`, `idx_regions_score`.
3. **`indicators`**:
   - Columns: `key` (VARCHAR(64), PK), `label` (VARCHAR(100)), `arabic_label` (VARCHAR(100)), `domain` (VARCHAR(32)), `unit` (VARCHAR(32)), `higher_is_better` (BOOLEAN), `description` (TEXT), `arabic_description` (TEXT), `created_at`.
4. **`national_index_history`**:
   - Columns: `id` (SERIAL, PK), `period` (VARCHAR(32)), `year` (INT), `score` (NUMERIC(5,1)), `max_score` (NUMERIC(5,1)), `change` (NUMERIC(5,1)), `compared_with` (VARCHAR(64)), `band` (VARCHAR(32)), `population` (INT), `regions_count` (INT), `at_risk_count` (INT), `ai_insight_text` (TEXT), `ai_insight_arabic_text` (TEXT), `created_at`.
5. **`regional_metrics`**:
   - Columns: `id` (SERIAL, PK), `region_id` (FK -> regions), `indicator_key` (FK -> indicators), `year` (INT), `value` (NUMERIC(10,2)), `change` (NUMERIC(5,2)), `sparkline` (JSONB), `created_at`.
   - Constraints: `UNIQUE(region_id, indicator_key, year)`.
6. **`sector_breakdowns`**:
   - Columns: `id` (SERIAL, PK), `sector` (VARCHAR(32)), `key` (VARCHAR(64)), `label` (VARCHAR(100)), `arabic_label` (VARCHAR(100)), `value` (NUMERIC(10,2)), `unit` (VARCHAR(32)), `sort_order` (INT).
7. **`development_projects`**:
   - Columns: `id` (VARCHAR(64), PK), `title` (VARCHAR(255)), `arabic_title` (VARCHAR(255)), `region_id` (FK -> regions), `status` (VARCHAR(32)), `progress` (INT), `budget_amount` (NUMERIC(15,2)), `budget_currency` (VARCHAR(8)), `due_date` (DATE), `completed_at` (DATE), `created_at`, `updated_at`.
8. **`citizen_reports`**:
   - Columns: `id` (VARCHAR(64), PK), `title` (VARCHAR(255)), `arabic_title` (VARCHAR(255)), `description` (TEXT), `arabic_description` (TEXT), `category` (VARCHAR(32)), `status` (VARCHAR(32)), `region_id` (FK -> regions), `likes_count` (INT), `author_id` (FK -> users), `created_at`, `updated_at`.
9. **`citizen_report_likes`**:
   - Columns: `report_id` (FK -> citizen_reports), `user_id` (VARCHAR(64)), `created_at` (TIMESTAMPTZ).
   - Primary Key: `(report_id, user_id)`.
10. **`ai_recommendations`**:
    - Columns: `id` (VARCHAR(64), PK), `priority` (VARCHAR(32)), `region_id` (FK -> regions), `domain` (VARCHAR(32)), `title`, `arabic_title`, `summary`, `arabic_summary`, `index_impact` (NUMERIC(4,1)), `estimated_cost_amount` (NUMERIC(15,2)), `estimated_cost_currency` (VARCHAR(8)), `confidence` (INT), `status` (VARCHAR(32)), `created_at`, `updated_at`.
11. **`dataset_metadata`**:
    - Columns: `id` (VARCHAR(64), PK), `name`, `arabic_name`, `original_source`, `source_url`, `license`, `geographic_coverage`, `time_coverage`, `update_frequency`, `record_count`, `completeness_pct`, `timeliness_pct`, `accuracy_pct`, `age_days`, `status`, `last_synced_at`.
12. **`audit_logs`**:
    - Columns: `id` (BIGSERIAL, PK), `user_id`, `action`, `entity_type`, `entity_id`, `details` (JSONB), `ip_address`, `created_at`.
13. **`rag_documents`**:
    - Columns: `id` (VARCHAR(64), PK), `title`, `arabic_title`, `content`, `arabic_content`, `source`, `source_url`, `category`, `region_id` (FK -> regions), `access_scope`, `metadata` (JSONB), `embedding` (JSONB / VECTOR), `created_at`, `updated_at`.

---

## 4. Existing SQL Migrations Inventory

| Migration File | Lines | Summary of Actions | Dependencies |
|---|:---:|---|---|
| `backend/src/database/migrations/001_initial_schema.sql` | 207 | Creates `uuid-ossp`, `pgcrypto` extensions; creates tables `users`, `regions`, `indicators`, `national_index_history`, `regional_metrics`, `sector_breakdowns`, `development_projects`, `citizen_reports`, `citizen_report_likes`, `ai_recommendations`, `dataset_metadata`, `audit_logs` with all indexes and constraints. | None |
| `backend/src/database/migrations/002_pgvector_rag.sql` | 32 | Attempts `CREATE EXTENSION IF NOT EXISTS vector;` in a `DO $$ ... EXCEPTION` block; creates `rag_documents` with `embedding JSONB` fallback and indexes on category, region_id, and access_scope. | `001_initial_schema.sql` (references `regions`) |
| `backend/src/database/migrate.ts` | 60 | Creates `schema_migrations (version, applied_at)`; runs unapplied `.sql` scripts inside a single transaction (`BEGIN` / `COMMIT`). | `pool.ts` |

---

## 5. Current Database Access Patterns

1. **Routers & Controllers:**
   - None of the Express routers (`overview.router.ts`, `insights.router.ts`, `intelligence.router.ts`, `decisions.router.ts`, `auth.router.ts`) currently execute database queries.
   - They read from in-memory arrays and objects defined in `backend/src/database/seed_data.ts` and in-memory Maps (`localUsers`, `recommendationStates`, `citizenReports`, `userLikes`).
   - **Architectural Implication:** This is extremely advantageous. There is zero raw SQL query mess to untangle inside controllers. Introducing Prisma repositories can be done cleanly behind service boundaries.
2. **Database Scripts:**
   - Raw SQL exists exclusively in `backend/src/database/migrate.ts` and `backend/src/database/seed.ts`.
   - Both use `pg.Pool` connection acquisition with transaction wrappers (`BEGIN` / `COMMIT` / `ROLLBACK`).

---

## 6. Prisma Readiness Assessment

| Requirement | Current Status | Assessment |
|---|---|---|
| **Node.js Compatibility** | `>=20.0.0` | Compatible with Prisma 5.x and 6.x. |
| **TypeScript Compatibility**| `^5.8.2` | Compatible with Prisma code generation. |
| **ESM Module Resolution** | `"type": "module"` in `package.json` | Fully supported by `@prisma/client`. |
| **Existing Schema Mapping** | Standard PostgreSQL types | 100% of the existing SQL schema maps cleanly to Prisma model declarations. |
| **String Primary Keys** | Existing tables use `VARCHAR(64)` | Preserved seamlessly as `String @id @db.VarChar(64)` in Prisma. |
| **Missing Tables for Production** | Sessions, Device Tokens, ML Cache | Can be added as new non-destructive tables in Prisma. |

---

## 7. Recommended Migration Strategy: Single Authoritative Migration System

### Evaluation of Options

- **Option A (Rejected): Dual Migration Authority.**
  - Maintain both raw SQL scripts in `src/database/migrations/` and Prisma migrations in `prisma/migrations/`.
  - *Risk:* High probability of schema drift, double maintenance, and conflicting migration tables (`schema_migrations` vs `_prisma_migrations`).
- **Option B (Rejected): Raw SQL Migrations Only with Prisma as Read-Only.**
  - Use Prisma Client only after running manual SQL scripts.
  - *Risk:* Loses Prisma's core strengths (declarative schema evolution, type generation sync, automated deploy release phase).
- **Option C (Approved): Prisma Migrate as Canonical Migration Authority with Baseline Consolidation.**
  - Consolidate existing `001_initial_schema.sql` and `002_pgvector_rag.sql` into Prisma's baseline migration: `backend/prisma/migrations/0_init/migration.sql`.
  - Configure `backend/prisma/schema.prisma` as the single authoritative schema definition.
  - In production (`Procfile`), the release phase runs `npx prisma migrate deploy`.
  - If applied to an existing database, `prisma migrate resolve --applied 0_init` marks the baseline as applied without re-running.
  - Subsequent changes are created cleanly via `npx prisma migrate dev`.

---

## 8. Recommended Prisma Schema Structure (`backend/prisma/schema.prisma`)

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

enum UserRole {
  ADMIN    @map("admin")
  ANALYST  @map("analyst")
  PLANNER  @map("planner")
  VIEWER   @map("viewer")
}

enum PriorityLevel {
  CRITICAL @map("critical")
  HIGH     @map("high")
  MEDIUM   @map("medium")
  LOW      @map("low")
}

enum ProjectStatus {
  PLANNED     @map("planned")
  IN_PROGRESS @map("in_progress")
  DELAYED     @map("delayed")
  COMPLETED   @map("completed")
}

enum ReportCategory {
  ROADS   @map("roads")
  HEALTH  @map("health")
  SCHOOLS @map("schools")
  WATER   @map("water")
}

enum ReportStatus {
  UNDER_REVIEW @map("under_review")
  ESCALATED    @map("escalated")
  RESOLVED     @map("resolved")
}

enum RecommendationStatus {
  SUGGESTED @map("suggested")
  IN_PLAN   @map("in_plan")
  DISMISSED @map("dismissed")
}

model User {
  id           String        @id @db.VarChar(64)
  email        String        @unique @db.VarChar(255)
  passwordHash String        @map("password_hash") @db.VarChar(255)
  name         String        @db.VarChar(255)
  arabicName   String?       @map("arabic_name") @db.VarChar(255)
  role         UserRole      @default(VIEWER)
  department   String?       @db.VarChar(100)
  isActive     Boolean       @default(true) @map("is_active")
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  
  // Phase B Relations
  sessions     Session[]
  deviceTokens DeviceToken[]
  reports      CitizenReport[]

  @@map("users")
}

model Session {
  id               String   @id @default(uuid()) @db.VarChar(64)
  userId           String   @map("user_id") @db.VarChar(64)
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash String   @unique @map("refresh_token_hash") @db.VarChar(255)
  expiresAt        DateTime @map("expires_at") @db.Timestamptz
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("sessions")
}

model DeviceToken {
  id        String   @id @default(uuid()) @db.VarChar(64)
  userId    String   @map("user_id") @db.VarChar(64)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fcmToken  String   @unique @map("fcm_token") @db.VarChar(255)
  platform  String   @default("android") @db.VarChar(32)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("device_tokens")
}

model Region {
  id              String               @id @db.VarChar(64) // slug e.g. "central_capital"
  name            String               @db.VarChar(100)
  arabicName      String               @map("arabic_name") @db.VarChar(100)
  rank            Int
  score           Decimal              @db.Decimal(5, 1)
  change          Decimal              @default(0.0) @db.Decimal(5, 1)
  priority        PriorityLevel
  population      Int
  latitude        Decimal              @db.Decimal(9, 6)
  longitude       Decimal              @db.Decimal(9, 6)
  boundaryGeojson Json?                @map("boundary_geojson")
  createdAt       DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime             @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  metrics         RegionalMetric[]
  projects        DevelopmentProject[]
  reports         CitizenReport[]
  recommendations AiRecommendation[]
  ragDocuments    RagDocument[]
  mlForecasts     MlForecast[]

  @@index([rank], map: "idx_regions_rank")
  @@index([priority], map: "idx_regions_priority")
  @@index([score], map: "idx_regions_score")
  @@map("regions")
}

model Indicator {
  key               String           @id @db.VarChar(64)
  label             String           @db.VarChar(100)
  arabicLabel       String           @map("arabic_label") @db.VarChar(100)
  domain            String           @db.VarChar(32)
  unit              String           @db.VarChar(32)
  higherIsBetter    Boolean          @default(true) @map("higher_is_better")
  description       String?          @db.Text
  arabicDescription String?          @map("arabic_description") @db.Text
  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamptz

  metrics           RegionalMetric[]

  @@index([domain], map: "idx_indicators_domain")
  @@map("indicators")
}

model NationalIndexHistory {
  id                  Int      @id @default(autoincrement())
  period              String   @db.VarChar(32)
  year                Int
  score               Decimal  @db.Decimal(5, 1)
  maxScore            Decimal  @default(100.0) @map("max_score") @db.Decimal(5, 1)
  change              Decimal  @default(0.0) @db.Decimal(5, 1)
  comparedWith        String   @default("previous period") @map("compared_with") @db.VarChar(64)
  band                String   @db.VarChar(32)
  population          Int
  regionsCount        Int      @default(12) @map("regions_count")
  atRiskCount         Int      @default(0) @map("at_risk_count")
  aiInsightText       String   @map("ai_insight_text") @db.Text
  aiInsightArabicText String   @map("ai_insight_arabic_text") @db.Text
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([year(sort: Desc)], map: "idx_national_index_year")
  @@map("national_index_history")
}

model RegionalMetric {
  id           Int       @id @default(autoincrement())
  regionId     String    @map("region_id") @db.VarChar(64)
  indicatorKey String    @map("indicator_key") @db.VarChar(64)
  year         Int
  value        Decimal   @db.Decimal(10, 2)
  change       Decimal   @default(0.0) @db.Decimal(5, 2)
  sparkline    Json?
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  region       Region    @relation(fields: [regionId], references: [id], onDelete: Cascade)
  indicator    Indicator @relation(fields: [indicatorKey], references: [key], onDelete: Cascade)

  @@unique([regionId, indicatorKey, year], map: "uq_region_indicator_year")
  @@index([regionId, indicatorKey], map: "idx_regional_metrics_reg_ind")
  @@map("regional_metrics")
}

model SectorBreakdown {
  id          Int     @id @default(autoincrement())
  sector      String  @db.VarChar(32)
  key         String  @db.VarChar(64)
  label       String  @db.VarChar(100)
  arabicLabel String  @map("arabic_label") @db.VarChar(100)
  value       Decimal @db.Decimal(10, 2)
  unit        String  @db.VarChar(32)
  sortOrder   Int     @default(0) @map("sort_order")

  @@map("sector_breakdowns")
}

model DevelopmentProject {
  id             String        @id @db.VarChar(64)
  title          String        @db.VarChar(255)
  arabicTitle    String        @map("arabic_title") @db.VarChar(255)
  regionId       String        @map("region_id") @db.VarChar(64)
  status         ProjectStatus
  progress       Int
  budgetAmount   Decimal       @map("budget_amount") @db.Decimal(15, 2)
  budgetCurrency String        @default("USD") @map("budget_currency") @db.VarChar(8)
  dueDate        DateTime?     @map("due_date") @db.Date
  completedAt    DateTime?     @map("completed_at") @db.Date
  createdAt      DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  region         Region        @relation(fields: [regionId], references: [id], onDelete: Restrict)

  @@index([status], map: "idx_projects_status")
  @@index([regionId], map: "idx_projects_region")
  @@map("development_projects")
}

model CitizenReport {
  id                String              @id @db.VarChar(64)
  title             String              @db.VarChar(255)
  arabicTitle       String              @map("arabic_title") @db.VarChar(255)
  description       String?             @db.Text
  arabicDescription String?             @map("arabic_description") @db.Text
  category          ReportCategory
  status            ReportStatus
  regionId          String              @map("region_id") @db.VarChar(64)
  likesCount        Int                 @default(0) @map("likes_count")
  authorId          String?             @map("author_id") @db.VarChar(64)
  createdAt         DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime            @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  region            Region              @relation(fields: [regionId], references: [id], onDelete: Restrict)
  author            User?               @relation(fields: [authorId], references: [id], onDelete: SetNull)
  likes             CitizenReportLike[]

  @@index([category], map: "idx_reports_category")
  @@index([status], map: "idx_reports_status")
  @@index([regionId], map: "idx_reports_region")
  @@map("citizen_reports")
}

model CitizenReportLike {
  reportId  String        @map("report_id") @db.VarChar(64)
  userId    String        @map("user_id") @db.VarChar(64)
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz

  report    CitizenReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@id([reportId, userId])
  @@map("citizen_report_likes")
}

model AiRecommendation {
  id                    String               @id @db.VarChar(64)
  priority              PriorityLevel
  regionId              String               @map("region_id") @db.VarChar(64)
  domain                String               @db.VarChar(32)
  title                 String               @db.VarChar(255)
  arabicTitle           String               @map("arabic_title") @db.VarChar(255)
  summary               String               @db.Text
  arabicSummary         String               @map("arabic_summary") @db.Text
  indexImpact           Decimal              @map("index_impact") @db.Decimal(4, 1)
  estimatedCostAmount   Decimal              @map("estimated_cost_amount") @db.Decimal(15, 2)
  estimatedCostCurrency String               @default("USD") @map("estimated_cost_currency") @db.VarChar(8)
  confidence            Int
  status                RecommendationStatus @default(SUGGESTED)
  createdAt             DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime             @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  region                Region               @relation(fields: [regionId], references: [id], onDelete: Cascade)

  @@index([status], map: "idx_recommendations_status")
  @@index([regionId], map: "idx_recommendations_region")
  @@map("ai_recommendations")
}

model DatasetMetadata {
  id                 String   @id @db.VarChar(64)
  name               String   @db.VarChar(255)
  arabicName         String   @map("arabic_name") @db.VarChar(255)
  originalSource     String   @map("original_source") @db.VarChar(255)
  sourceUrl          String?  @map("source_url") @db.Text
  license            String   @db.VarChar(100)
  geographicCoverage String   @default("National (12 Regions)") @map("geographic_coverage") @db.VarChar(100)
  timeCoverage       String   @map("time_coverage") @db.VarChar(100)
  updateFrequency    String   @map("update_frequency") @db.VarChar(50)
  recordCount        Int      @default(0) @map("record_count")
  completenessPct    Decimal  @default(100.0) @map("completeness_pct") @db.Decimal(5, 1)
  timelinessPct      Decimal  @default(100.0) @map("timeliness_pct") @db.Decimal(5, 1)
  accuracyPct        Decimal  @default(100.0) @map("accuracy_pct") @db.Decimal(5, 1)
  ageDays            Int      @default(0) @map("age_days")
  status             String   @default("synced") @db.VarChar(32)
  lastSyncedAt       DateTime @default(now()) @map("last_synced_at") @db.Timestamptz

  @@map("dataset_metadata")
}

model AuditLog {
  id         BigInt   @id @default(autoincrement())
  userId     String?  @map("user_id") @db.VarChar(64)
  action     String   @db.VarChar(64)
  entityType String   @map("entity_type") @db.VarChar(64)
  entityId   String?  @map("entity_id") @db.VarChar(64)
  details    Json?
  ipAddress  String?  @map("ip_address") @db.VarChar(45)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([action], map: "idx_audit_logs_action")
  @@index([createdAt(sort: Desc)], map: "idx_audit_logs_created_at")
  @@map("audit_logs")
}

model RagDocument {
  id            String                       @id @db.VarChar(64)
  title         String                       @db.VarChar(255)
  arabicTitle   String                       @map("arabic_title") @db.VarChar(255)
  content       String                       @db.Text
  arabicContent String                       @map("arabic_content") @db.Text
  source        String                       @db.VarChar(255)
  sourceUrl     String?                      @map("source_url") @db.Text
  category      String                       @db.VarChar(64)
  regionId      String?                      @map("region_id") @db.VarChar(64)
  accessScope   String                       @default("public") @map("access_scope") @db.VarChar(32)
  metadata      Json?
  embedding     Unsupported("vector(1536)")? // Native pgvector on Heroku Postgres
  createdAt     DateTime                     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime                     @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  region        Region?                      @relation(fields: [regionId], references: [id], onDelete: SetNull)

  @@index([category], map: "idx_rag_documents_category")
  @@index([regionId], map: "idx_rag_documents_region")
  @@index([accessScope], map: "idx_rag_documents_access")
  @@map("rag_documents")
}

model MlForecast {
  id              String   @id @default(uuid()) @db.VarChar(64)
  regionId        String   @map("region_id") @db.VarChar(64)
  indicatorKey    String   @map("indicator_key") @db.VarChar(64)
  horizonYear     Int      @map("horizon_year")
  predictedValue  Decimal  @map("predicted_value") @db.Decimal(6, 2)
  confidenceLower Decimal  @map("confidence_lower") @db.Decimal(6, 2)
  confidenceUpper Decimal  @map("confidence_upper") @db.Decimal(6, 2)
  confidencePct   Decimal  @map("confidence_pct") @db.Decimal(5, 1)
  generatedAt     DateTime @default(now()) @map("generated_at") @db.Timestamptz

  region          Region   @relation(fields: [regionId], references: [id], onDelete: Cascade)

  @@unique([regionId, indicatorKey, horizonYear], map: "uq_forecast_region_ind_year")
  @@map("ml_forecasts")
}
```

---

## 9. `pgvector` Integration Strategy

1. **Extension Activation in Migrations:**
   `002_pgvector_rag.sql` already provides the safe idempotent activation:
   ```sql
   DO $$
   BEGIN
       CREATE EXTENSION IF NOT EXISTS vector;
   EXCEPTION
       WHEN OTHERS THEN
           RAISE NOTICE 'pgvector extension not available, continuing with fallback.';
   END $$;
   ```
2. **Prisma Type Integration:**
   In Prisma, `embedding Unsupported("vector(1536)")?` maps to PostgreSQL's native vector type without forcing Prisma into incompatible scalar validations.
3. **Similarity Search Execution:**
   Vector similarity queries are executed via parameterized raw SQL using Prisma's `$queryRaw`:
   ```typescript
   const results = await prisma.$queryRaw<RetrievedChunk[]>`
     SELECT id, title, arabic_title, content, arabic_content, source,
            1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
     FROM rag_documents
     WHERE 1 - (embedding <=> ${queryEmbedding}::vector) >= 0.65
     ORDER BY similarity DESC
     LIMIT 4;
   `;
   ```
4. **Resilient Local Fallback:**
   If the `vector` extension is not active (e.g. local offline dev), `RagService.search` in `backend/src/integrations/rag.ts` falls back transparently to its existing token-based keyword search over `SEED_RAG_DOCUMENTS`.

---

## 10. Existing API Endpoint-to-Database Dependency Mapping

| # | Endpoint | HTTP Method | Target PostgreSQL Table(s) | Prisma Query Operation | Current Status |
|---|---|:---:|---|---|---|
| **01** | `/v1/overview` | GET | `national_index_history`, `regions`, `regional_metrics` | `findFirst()`, `findMany()` | In-Memory (`SEED_OVERVIEW`) |
| **02** | `/v1/regions/map-points` | GET | `regions` | `findMany({ select: { ... } })` | In-Memory (`SEED_REGIONS`) |
| **03** | `/v1/regions` | GET | `regions` | `findMany({ where, skip, take, orderBy })` | In-Memory (`SEED_REGIONS`) |
| **04** | `/v1/regions/:id` | GET | `regions`, `regional_metrics`, `national_index_history` | `findUnique({ where: { id } })` | In-Memory (`SEED_REGIONS`) |
| **05** | `/v1/insights/education` | GET | `regional_metrics`, `sector_breakdowns`, `regions` | `findMany({ where: { sector: 'education' } })` | In-Memory (`SEED_OVERVIEW`) |
| **06** | `/v1/insights/healthcare` | GET | `regional_metrics`, `sector_breakdowns`, `regions` | `findMany({ where: { sector: 'healthcare' } })` | In-Memory (`SEED_OVERVIEW`) |
| **07** | `/v1/insights/economy` | GET | `regional_metrics`, `sector_breakdowns`, `regions` | `findMany({ where: { sector: 'economy' } })` | In-Memory (`SEED_OVERVIEW`) |
| **08** | `/v1/insights/infrastructure` | GET | `regional_metrics`, `sector_breakdowns`, `regions` | `findMany({ where: { sector: 'infrastructure' } })` | In-Memory (`SEED_OVERVIEW`) |
| **09** | `/v1/insights/comparison` | GET | `regions`, `regional_metrics` | `findMany({ where: { id: { in: [a, b] } } })` | In-Memory (`SEED_REGIONS`) |
| **10** | `/v1/insights/history` | GET | `national_index_history`, `regional_metrics` | `findMany({ orderBy: { year: 'asc' } })` | In-Memory (`SEED_OVERVIEW`) |
| **11** | `/v1/insights/priority` | GET | `regions` | `findMany({ orderBy: { score: 'asc' } })` | In-Memory (`SEED_REGIONS`) |
| **12** | `/v1/insights/data-quality` | GET | `dataset_metadata` | `findMany()` | In-Memory (`SEED_DATA_SOURCES`) |
| **13** | `/v1/intelligence/predictions` | GET | `ml_forecasts`, `national_index_history` | `findMany({ where: { horizonYear: targetYear } })` | In-Memory (Formulaic map) |
| **14** | `/v1/intelligence/assistant/chat` | POST | `rag_documents` | `prisma.$queryRaw` (vector similarity) | In-Memory (`RagService`) |
| **15** | `/v1/intelligence/recommendations` | GET | `ai_recommendations` | `findMany({ where: { status: 'suggested' } })` | In-Memory (`SEED_RECOMMENDATIONS`) |
| **16** | `/v1/intelligence/recommendations/:id/accept` | POST | `ai_recommendations` | `update({ where: { id }, data: { status: 'in_plan' } })` | In-Memory Map |
| **17** | `/v1/intelligence/recommendations/:id/dismiss` | POST | `ai_recommendations` | `update({ where: { id }, data: { status: 'dismissed' } })` | In-Memory Map |
| **18** | `/v1/decisions/simulate` | POST | `regions`, `regional_metrics` | `findUnique()` + Sensitivity Calculation | In-Memory (`SEED_REGIONS`) |
| **19** | `/v1/decisions/projects` | GET | `development_projects` | `findMany({ orderBy: { createdAt: 'desc' } })` | In-Memory (`projectsList`) |
| **20** | `/v1/decisions/citizen-reports` | GET | `citizen_reports`, `citizen_report_likes` | `findMany({ include: { likes: true } })` | In-Memory (`citizenReports`) |
| **21** | `/v1/decisions/citizen-reports/:id/like` | POST | `citizen_reports`, `citizen_report_likes` | Transaction: `$transaction([create/delete like, update likesCount])` | In-Memory (`userLikes` Set) |
| **22** | `/v1/auth/register` | POST | `users` | `create({ data: { ... } })` | In-Memory (`localUsers` Map) |
| **23** | `/v1/auth/login` | POST | `users`, `sessions` | `findUnique()` + `session.create()` | In-Memory (`localUsers` Map) |
| **24** | `/v1/auth/refresh` | POST | `sessions`, `users` | `findUnique()` + Token Rotation | Planned |
| **25** | `/v1/auth/me` | GET | `users` | `findUnique({ where: { id: req.user.id } })` | In-Memory JWT payload |
| **26** | `/health` & `/v1/health` | GET | None / DB Ping | `prisma.$queryRaw('SELECT 1')` | In-Memory / Uptime |

---

## 11. Identified Implementation Gaps

1. **Prisma Packages Missing:** `@prisma/client` and `prisma` are not yet added to `backend/package.json`.
2. **Missing Production Tables in Existing SQL:**
   - `sessions`: Needed for refresh token rotation.
   - `device_tokens`: Needed for FCM push registration.
   - `ml_forecasts`: Needed to cache Python ML ensemble projections for instant API serving.
3. **Decimal Serialization:** PostgreSQL `NUMERIC` types return as `Prisma.Decimal` instances. These must be transformed to native JavaScript numbers (`Number(val)`) in repositories/services to avoid breaking the Flutter client JSON contract.
4. **Legacy Appwrite Configuration:** `backend/src/config/env.ts` and `backend/.env` still contain unused `APPWRITE_*` environment variables that must be removed.
5. **Database Connection String for Development:** Local `.env` has `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/decidix_dev`. Since PostgreSQL is not currently running locally, a graceful repository fallback pattern is essential.

---

## 12. Risks and Compatibility Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|:---:|---|
| **Heroku Essential-0 Connection Exhaustion** | Backend crash under concurrent demo load | Medium | Configure `DATABASE_URL` with `?connection_limit=10&pool_timeout=20`. Reserve 10 connections for migrations and maintenance. |
| **Decimal Type Mismatch in API Responses** | Flutter JSON parsing throws `ParseException` | High | Implement a repository-level DTO mapper converting all `Decimal` values to native JavaScript `number` before sending JSON responses. |
| **Local Dev without Running PostgreSQL** | Unit/integration tests fail when developer runs tests offline | High | Implement the Repository Pattern with transparent Fallback: Repositories check database availability; if unreachable, they serve verified in-memory fixtures. All 16 Vitest tests will continue passing seamlessly. |
| **`pgvector` Extension Incompatibility** | Migration fails if extension unavailable | Low | Use idempotent `CREATE EXTENSION IF NOT EXISTS vector;` wrapped in exception handling; use `Unsupported("vector(1536)")?` in Prisma. |

---

## 13. Prioritized Phase B Implementation Plan

```mermaid
flowchart TD
    Step1["Step B1: Package Installation<br>(@prisma/client, prisma)"] --> Step2["Step B2: Schema & Baseline Migration<br>(prisma/schema.prisma + 0_init)"]
    Step2 --> Step3["Step B3: Legacy Cleanup<br>(Remove Appwrite from env.ts & .env)"]
    Step3 --> Step4["Step B4: Prisma Client Singleton<br>(with connection limits & graceful fallback)"]
    Step4 --> Step5["Step B5: Repository Implementation<br>(Overview, Insights, Intelligence, Decisions, Auth)"]
    Step5 --> Step6["Step B6: Prisma Seed Script<br>(Seed all 12 regions, indicators, projects, users)"]
    Step6 --> Step7["Step B7: Verification & Test Suite Run<br>(Vitest 16 tests + Flutter contract tests)"]
```

1. **Step B1: Package Installation:** Add `@prisma/client` and `prisma` (`^5.22.0`) to `backend/package.json`.
2. **Step B2: Prisma Schema & Baseline Migration:** Create `backend/prisma/schema.prisma` and baseline migration `prisma/migrations/0_init/migration.sql` incorporating existing schema and new tables (`sessions`, `device_tokens`, `ml_forecasts`).
3. **Step B3: Configuration Cleanup:** Strip obsolete `APPWRITE_*` variables from `backend/src/config/env.ts` and `backend/.env`.
4. **Step B4: Prisma Singleton & Connection Pool:** Create `backend/src/database/prisma.ts` with connection limit throttling (10 connections) and connectivity status checks.
5. **Step B5: Repository Layer Implementation:** Implement clean repositories for each vertical module (`OverviewRepository`, `InsightsRepository`, `DecisionsRepository`, `AuthRepository`, `IntelligenceRepository`) with Decimal-to-number transformation and fallback support.
6. **Step B6: Prisma Seed Script:** Update `backend/src/database/seed.ts` to use Prisma Client transactions for idempotent seeding.
7. **Step B7: Verification:** Execute `npm --prefix backend test` and `flutter test test/api_contract_test.dart` to verify zero regression.



---

## 14. Phase B1 Implementation & Verification Record

**Execution Date:** 2026-11-02  
**Status:** Completed & Verified  

### 14.1 Test Discrepancy Resolution
- **Root Cause Identified:** The command `npm test` was executed in the workspace root `E:\decidix_app`, which returned exit code 1 (`ENOENT: no such file or directory, open 'E:\decidix_app\package.json'`) because the backend service resides in `backend/`.
- **Resolution:** Running `npm --prefix backend test` (or `cd backend && npm test`) executes Vitest and passes with exit code 0 (`16 passed (16)`).

### 14.2 Installed Prisma Packages
- `@prisma/client`: `^5.22.0` (Production dependency)
- `prisma`: `^5.22.0` (Development dependency)
- *Note:* Prisma 7.x was initially evaluated and rejected because Prisma 7 removes datasource URL declarations in `schema.prisma`, requiring Accelerate cloud configurations. Prisma 5.22.0 provides mature, standard PostgreSQL connectivity with zero external cloud dependencies.

### 14.3 Schema Mapping & Baseline Migration
- **Prisma Schema:** `backend/prisma/schema.prisma` created with 13 models matching PostgreSQL authoritative tables 1:1 using `@map` and `@@map`. Validated via `prisma validate` (exit code 0).
- **Prisma Client:** Generated via `prisma generate` (exit code 0).
- **Consolidated Baseline Migration:** `backend/prisma/migrations/0_init/migration.sql` created, consolidating `001_initial_schema.sql` and `002_pgvector_rag.sql` with safe idempotent extension activation.
- **Historical Reference Preservation:** Original SQL files in `backend/src/database/migrations/` remain intact.

### 14.4 Prisma Client Singleton
- Implemented in `backend/src/database/prisma.ts`.
- Singleton instance with dev global cache, graceful `disconnectPrisma()`, and offline resilience (`testPrismaConnection()`).
- Wired into `backend/src/server.ts` lifecycle.

### 14.5 Appwrite Configuration Cleanup
- Confirmed zero functional dependencies on Appwrite across all modules in `backend/src/`.
- Removed `APPWRITE_*` environment declarations from `backend/src/config/env.ts`, `backend/.env`, and `backend/.env.example`.

### 14.6 Test Verification Summary
- `npm --prefix backend run build` (tsc): Exit code 0 (clean build).
- `npm --prefix backend test` (Vitest): Exit code 0 (16/16 passed).
- `flutter test test/api_contract_test.dart`: Exit code 0 (24/24 passed).
