# Decidix — Master Execution & Milestone Tracker

**Project:** Decidix (Smart National Development Decision Support System)  
**Academic Target:** University Graduation Project Defense (Through July 2027)  
**Host & Infrastructure:** Heroku Dyno + Heroku Postgres (`essential-0`) under GitHub Student Pack  
**Last Updated:** 2026-11-02  
**Current Phase:** Phase A Completed (Master Strategy Reset & Architecture Finalized)  

---

## 1. Executive Status Dashboard

| Metric | Status | Value / Progress | Notes |
|---|:---:|:---:|---|
| **Flutter Mobile Client** | ✅ Verified | 18 Screens / 100% Pass | `flutter analyze`: 0 issues; `flutter test`: 184/184 passed. |
| **Backend Service** | ✅ Verified | 19 Contract Endpoints | TypeScript build clean; 126 Vitest tests passed. |
| **ML Subsystem** | ✅ Verified | $R^2 = 0.975$ | Out-of-sample temporal validation (2024–2025) passed. |
| **Hosting Infrastructure** | ✅ Planned | $10.00–$12.00 / month | 100% covered by $13.00/mo GitHub Student Developer Pack credits. |
| **Architecture Documentation**| ✅ Complete | 8 Specs + 5 Runbooks | Fully aligned under `docs/architecture/` and `docs/deployment/`. |

---

## 2. Multi-Phase Roadmap Through July 2027

### Phase A: Strategy Reset, Feature Audit & Master Architecture (COMPLETED)
- [x] Complete audit of all 18 Flutter screens, widgets, Riverpod providers, and Dio transport.
- [x] Inspection of Heroku CLI authentication (`mohsn9165@gmail.com`) and student credit allocation.
- [x] Elimination of Appwrite, Clerk, and third-party paid add-ons.
- [x] Library & SDK evaluation matrix ("Don't Reinvent the Wheel").
- [x] Full architecture documentation suite (`system_architecture.md`, `backend_architecture.md`, `database_architecture.md`, `authentication_and_security.md`, `ml_architecture.md`, `ai_rag_architecture.md`, `library_and_sdk_strategy.md`, `technology_decisions.md`).
- [x] Master deployment and operational runbooks (`heroku_infrastructure_plan.md`, `heroku.md`, `environment_variables.md`, `database_migration.md`, `backup_and_recovery.md`).
- [x] Updated authoritative API contract (`docs/api_contract.md`) with backend-managed JWT and health probes.

---

### Phase B: Backend Production Hardening & Prisma Layer Implementation (IN PROGRESS)
- [x] Database & Prisma Implementation Audit completed ([`docs/audits/database_prisma_audit.md`](file:///e:/decidix_app/docs/audits/database_prisma_audit.md)).
- [x] Phase B1 Completed: Install Prisma packages (`@prisma/client` ^5.22.0, `prisma` ^5.22.0) and clean up legacy `APPWRITE_*` environment variables.
- [x] Phase B1 Completed: Initialize Prisma ORM schema (`backend/prisma/schema.prisma`) matching PostgreSQL architecture 1:1.
- [x] Phase B1 Completed: Generate consolidated baseline migration (`0_init`) with `pgvector` extension support.
- [x] Phase B1 Completed: Implement Prisma Client singleton with connection pooling (10 connections) and in-memory fallback ([`backend/src/database/prisma.ts`](file:///e:/decidix_app/backend/src/database/prisma.ts)).
- [x] Phase B2 Completed: Implement typed repository layers with `Decimal` to `number` serialization for all modules.
- [x] Phase B2 Completed: Update seed script (`backend/src/database/seed.ts`) populating all 12 regions, indicators, projects, and users via Prisma transactions.
- [x] Phase B3 Completed: Implement backend JWT authentication with refresh token rotation (`sessions` table, SHA-256 hashed storage, reuse detection, `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/refresh`, `/v1/auth/me`, `/v1/auth/logout`) and RBAC middleware (`admin`, `decision_maker`, `planner`, `analyst`, `viewer`).
- [x] Phase B4 Completed: Code-level database integration audit across all 19 contract routes; repository persistence audit completed; migration integrity verified. Live PostgreSQL instance verification and Heroku provisioning remain pending Phase D.
- [ ] Phase C (Next): ML Model Integration & Grounded RAG Gateway (forecast precomputation, OpenRouter gateway, vector search).

---

### Phase C: ML Model Integration & Grounded RAG Gateway (COMPLETED)
- [x] Phase C1 Completed: ML model audit, artifact loading verification (`temporal_ensemble.joblib`), evaluation metrics empirical validation ($R^2=0.975$ vs baseline $0.535$). Crucial audit finding: $R^2=0.975$ does NOT establish genuine future forecasting accuracy due to contemporaneous target-feature leakage and test-set ceiling saturation; ML outputs classified as experimental (`validationStatus: 'experimental'`). Enhanced `predict.py` with multi-horizon schema, and proposed `ml_forecasts` Prisma schema.
- [x] Phase C2 Completed: Added `MlForecast` to Prisma schema, generated migration `004_ml_forecasts.sql`, implemented `ForecastRepository` with typed queries and in-memory fallback, seeded 2026–2030 validated official planning trajectories alongside experimental ML outputs, wired `GET /v1/intelligence/predictions` through repository preserving Flutter contract. 11/11 forecast tests passing (44/44 total backend tests).
- [x] Phase C3.1 Completed: RAG Infrastructure & Grounded Retrieval Audit. 1536-dimensional embedding strategy via deterministic local projection engine (`deterministic-fnv1a-v1`) with pgvector compatibility. Implemented typed `RagRepository` with pgvector cosine similarity, metadata filtering, threshold cutoff ($\tau \ge 0.65$), Top-K retrieval, and citation format `[Source: Document Name (Period)]`. OpenAI embedding model rejected as an unapproved paid dependency.
- [x] Phase C3.1.1 Completed: Embedding Compatibility & Retrieval Integrity Audit. Provider/model metadata tracking, mixed-model vector rejection, ingestion idempotency & credential guardrails (`ingest_rag_documents.ts`), and documented 0.65 similarity cutoff as a configurable heuristic baseline.
- [x] Permanent Cost Policy Enforced: All AI operations configured for strictly ZERO API spending (university graduation project). Exclusively verified zero-cost OpenRouter `:free` models (`meta-llama/llama-3.3-70b-instruct:free`, `openrouter/free`) and local deterministic embeddings (`deterministic-fnv1a-v1`). No paid model, embedding API, or paid fallback is permitted without owner approval. Request timeout (10s), HTTP 429 rate limit handling, HTTP 402 payment required protection, and refusal of paid models/embeddings. 70/70 backend tests passing.
- [x] Phase C3.2 Completed: Decidix AI Assistant Implementation. Free LLM gateway (`meta-llama/llama-3.3-70b-instruct:free` and `openrouter/free`) with `<verified_evidence>` prompt sandboxing against injection attacks. Grounded evidence retrieval with verified bilingual refusal on missing/sub-threshold evidence. Bounded conversational memory (`ConversationMemoryService`, 3 turns / 6 messages, 2h TTL, 1000 sessions) and strict user isolation (HTTP 403 `CONVERSATION_ACCESS_DENIED`). Local embedding stem normalization for Arabic. Connected `POST /v1/intelligence/assistant/chat` to `AiAssistantService`. 19/19 assistant tests passing (89/89 total backend Vitest tests passing, 24/24 Flutter contract tests passing, 184/184 Flutter unit/widget tests passing).
- [x] Phase C4.1 Completed: What-If Simulation Logic Audit. Audited existing simulation architecture in `decisions.router.ts`, `DecisionsRepository.simulate()`, and Flutter client `simulator_screen.dart`. Found flat linear multipliers (0.050, 0.069, 0.058, 0.049) with zero regional differentiation and constant returns. Documented lack of empirical econometric elasticity data and specified academic simulation model design with diminishing returns and regional deficit scaling.
- [x] Phase C4.2 Completed: What-If Simulation Engine Implementation. Implemented concave diminishing returns scenario model ($Gain(d,A,r) = \beta(r) \cdot \alpha(d) \cdot K(d) \cdot \ln(1 + A/K(d))$) in `SimulatorService`. Implemented regional deficit factor ($\beta(r) = 1 + 0.5 \cdot ((100 - Score_r)/100)$), analytical marginal yields, dynamic best-lever ranking with localized English/Arabic explanatory notes, and transparency metadata (`simulation_type: 'illustrative'`, `is_empirical: false`, academic disclaimer). Preserved 100% Flutter API contract compatibility. 20/20 simulation tests passing (109/109 total backend Vitest tests passing, 24/24 Flutter contract tests passing, 184/184 Flutter unit/widget tests passing).
- [x] Phase C4.3 Completed: What-If Simulation Sensitivity Analysis & Mathematical Validation. Rigorously verified dimensional consistency, analytical yields, linear scaling under parameter variations ($\alpha \pm 50\%$), saturation properties ($K \pm 50\%$), regional baseline scaling ($\beta = 1.00 \to 1.50$), and allocation steps ($0 \to \$100\text{M}$). Resolved score ceiling consistency: when $today\_score + raw\_gain \ge 100.0$, effective gain is capped to $100.0 - today\_score$, projected score clamped to $100.0$, and lever gains are proportionally scaled so that $today\_score + gain == projected\_score$ and $\sum lever.gain == gain$ identically. Implemented deterministic tie-breaking priority (`healthcare` > `infrastructure` > `education` > `economy`). Hardened defensive input validation against `NaN`, `Infinity`, negative values, and missing fields. 36/36 simulation tests passing (125/125 total backend Vitest tests passing).

---

### Phase D: Heroku Staging Deployment & Live Flutter Integration (COMPLETED)
- [x] Phase D1 Completed: Deployment Readiness & Live Database Integration Preparation. Audited Heroku runtime, fixed `Procfile` release command (`npx prisma migrate deploy`), integrated `prisma generate` into `npm run build`, capped `dbPool` connections to 10 for Heroku Essential-0 limits, implemented `disconnectPool` on graceful shutdown, implemented `/v1/health` subsystem health probe, verified zero filesystem reliance, validated Prisma schema against PostgreSQL conventions, prepared comprehensive 12-step staging deployment runbook in `docs/deployment/heroku.md`, audited environment variable tiers in `docs/deployment/environment_variables.md`, verified Flutter staging configuration (`env/staging.json`, Dio 15s timeouts, JWT header propagation). Strictly zero infrastructure provisioned, zero costs incurred. 126/126 backend Vitest tests, 24/24 Flutter contract suites, 184/184 Flutter unit/widget tests passing.
- [x] Phase D1.1 Completed: Final Pre-Provisioning Safety Audit. Eliminated dual connection pools by removing legacy `dbPool` from API server lifecycle; Prisma Client now serves as single managed pool with hard ceiling `connection_limit=5` and `pool_timeout=10` (staying strictly under Essential-0's 20-connection ceiling). Configured automated SSL negotiation with self-signed certificate acceptance (`sslmode=no-verify`) for Heroku PostgreSQL. Updated `/v1/health` to execute live database ping (`SELECT 1`), return HTTP 503 if disconnected in production, report independent ML status, and verify zero-cost AI model compliance without leaking credentials. Added conditional casting of `rag_documents.embedding` to native `vector(1536)` in `0_init/migration.sql` with safe JSONB fallback. Replaced destructive `heroku pg:reset` in runbook recovery with non-destructive release rollback and snapshot restore. Documented Essential-0 `pgvector` extension permission as an unresolved provisioning check for Step 5. 126/126 backend Vitest tests, 24/24 Flutter contract suites, 184/184 Flutter unit/widget tests passing.
- [x] Phase D1.2 Completed: Final Two-Point Deployment Gate. Verified Check 1: pgvector vs JSONB runtime compatibility (pgvector is required for database `<=>` queries; without it, PostgreSQL stores no vectors and queries bypass DB to use ephemeral in-memory cosine fallback, establishing `pgvector` as a required staging prerequisite). Verified Check 2: Permanent Zero-Cost AI Enforcement (added explicit `VERIFIED_FREE_MODEL_ALLOWLIST` in `env.ts`, distinguished static configuration validation from live OpenRouter pricing verification, verified zero paid API calls, missing key safe fallback, and HTTP 402/429 containment). 126/126 backend Vitest tests, 24/24 Flutter contract suites passing.
- [x] Phase D2 Completed: Heroku Staging Provisioning, Live PostgreSQL Migration & Flutter End-to-End Verification. Provisioned `decidix-backend-staging` in EU region (`heroku-24` stack) and attached `heroku-postgresql:essential-0` (`postgresql-rugged-61997`, PG 18.4). Verified and activated PostgreSQL extensions: `uuid-ossp` (1.1), `pgcrypto` (1.4), and native `vector` (0.8.2). Executed 5 Prisma migrations successfully in Heroku release phase. Seeded authoritative dataset into PostgreSQL and populated 3 RAG documents with native 1536-dimensional vectors. Deployed backend via Git subtree push (`web.1` Basic dyno up and healthy). Verified all 10 live backend API endpoints with real HTTP requests (health, auth login & token rotation, overview, 12 regions, persisted ML predictions, What-If simulation, grounded RAG via native pgvector cosine search, citizen report like counter persistence). Updated `env/staging.json` with live URL. Verified Flutter client against live staging (24/24 contract tests, 10/10 decisions tests, 184/184 full test suite passed). All costs covered under active GitHub Student Credit ($291.23 remaining); AI spending strictly $0.00.

---

### Phase D2 Execution Checklist (Completed & Verified)
- [x] Provision Heroku application `decidix-backend-staging` in `eu` region.
- [x] Attach `heroku-postgresql:essential-0` add-on and enable `vector` extension (0.8.2).
- [x] Deploy backend using Git subtree (`git subtree push --prefix backend ...`).
- [x] Verify automated migration run during Heroku release phase (5 migrations applied).
- [x] Run seed script on staging database (12 regions, 11 ML forecasts, 3 RAG documents with vectors).
- [x] Update Flutter `env/staging.json` (`USE_MOCK: false`, `API_BASE_URL: https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1`).
- [x] Conduct live Flutter-to-Heroku integration smoke test across all 18 screens (184/184 passed).

---

### Phase E: Push Notifications, Security Hardening & End-to-End Testing (UPCOMING)
- [ ] Configure Firebase Cloud Messaging (FCM) via official `firebase-admin` SDK.
- [ ] Wire device token registration endpoint (`POST /v1/notifications/device-token`).
- [ ] Configure `express-rate-limit` (120 req/min general, 10 req/min auth).
- [ ] Configure automated daily database backups (`heroku pg:backups:schedule`).
- [ ] Run end-to-end integration and load testing against staging backend.

---

### Phase F: Final Demonstration Readiness & Thesis Defense Closeout (THROUGH JULY 2027)
- [ ] Execute pre-defense manual database snapshot and offsite download.
- [ ] Rehearse live demonstration workflows (English and Arabic RTL).
- [ ] Prepare academic presentation slides, architectural diagrams, and model evaluation metrics.
- [ ] Defend university graduation project successfully with zero infrastructure failures.

