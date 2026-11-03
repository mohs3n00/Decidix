# Decidix Backend Implementation & Integration Checklist

This checklist defines the prioritized engineering work required to transition the Decidix Node.js backend from initial foundation to full staging and production deployment.

---

## 1. Work Breakdown by Priority

### Phase A: Database Persistence & Repository Layer (High Priority)
- [x] **A.1 Schema Definition & Migrations:** Created SQL migrations (`001_initial_schema.sql`, `002_pgvector_rag.sql`) defining all tables, constraints, foreign keys, and indexes.
- [x] **A.2 Baseline Seeding:** Created idempotent seed script (`seed.ts`) populating all 12 baseline regions, 4 pillar indicators, national index history, sample projects, citizen reports, recommendations, and dataset metadata.
- [ ] **A.3 Dynamic PostgreSQL Repository Integration:**
  - Connect runtime routes directly to PostgreSQL queries via `dbPool.query` when `DATABASE_URL` is available.
  - Implement SQL parameterized filtering, pagination, and sorting for:
    - `regions`: `SELECT * FROM regions WHERE priority = $1 AND (name ILIKE $2 OR arabic_name ILIKE $2) ORDER BY rank LIMIT $3 OFFSET $4`
    - `projects`: `SELECT * FROM development_projects WHERE status = $1 ORDER BY due_date ASC LIMIT $2 OFFSET $3`
    - `citizen_reports`: `SELECT r.*, COUNT(l.user_id) AS likes, EXISTS(SELECT 1 FROM citizen_report_likes WHERE report_id = r.id AND user_id = $1) AS liked_by_me FROM citizen_reports r ...`
  - Ensure transactions (`BEGIN` ... `COMMIT`) on state-mutating actions (like toggle, recommendation accept/dismiss).

---

### Phase B: Machine Learning Inference Bridge (Medium Priority)
- [x] **B.1 Feature Engineering Pipeline:** Implemented `ml/preprocessing/features.py` constructing lag features and dummy encodings.
- [x] **B.2 Multi-Model Training & Evaluation:** Trained Gradient Boosting ($R^2=0.979$), Random Forest ($R^2=0.966$), and Temporal Ensemble ($R^2=0.975$) with temporal holdout evaluation on 2024-2025.
- [x] **B.3 Serialized Model Artifacts:** Exported `.joblib` model weights and feature column templates under `ml/models/artifacts/`.
- [x] **B.4 Standalone CLI & Script Inference:** Implemented `ml/inference/predict.py` generating multi-year forecasts with expanding $1.96\sigma$ uncertainty bounds.
- [ ] **B.5 Backend Inference Bridge:**
  - Implement Node.js execution wrapper (`child_process.spawn` or dedicated lightweight FastAPI microservice at `ML_SERVICE_URL`) to dynamically call `predict.py` when `/v1/intelligence/predictions` receives requests with non-cached target years.
  - Store generated predictions in PostgreSQL `ml_forecasts` table with TTL caching to avoid re-computing identical forecasts.

---

### Phase C: Grounded AI Assistant & OpenRouter RAG (High Priority)
- [x] **C.1 RAG Document Ingestion & Catalog:** Created curated dataset catalog (`datasets/metadata/dataset_catalog.json`) and seed knowledge documents (`SEED_RAG_DOCUMENTS`).
- [x] **C.2 Semantic & Keyword Knowledge Retrieval:** Implemented `RagService.search()` in `backend/src/integrations/rag.ts` with domain scoring and region weighting.
- [x] **C.3 OpenRouter LLM Service:** Implemented `OpenRouterService.generateAnswer()` in `backend/src/integrations/openrouter.ts` using verified zero-cost (:free) system prompts, request timeout, and fallback engine.
- [x] **C.4 Vector Embedding Generation (pgvector):**
  - Integrated deterministic local 1536-dimensional L2-normalized embedding generator (`deterministic-fnv1a-v1`) under Permanent Zero-Cost Policy.
  - Executed cosine distance queries (`ORDER BY embedding <=> $1 LIMIT 5`) via pgvector in `RagRepository`.
- [ ] **C.5 Multi-turn Conversation Context Management:**
  - Store conversation threads and message history in PostgreSQL `assistant_conversations` and `assistant_messages` tables.

---

### Phase D: Appwrite Supporting Services (Medium Priority)
- [x] **D.1 Architectural Boundary Definition:** Confirmed Appwrite owns only file/media storage without replicating core PostgreSQL entities.
- [ ] **D.2 Appwrite SDK Integration:**
  - Create `backend/src/integrations/appwrite.ts` using the official `node-appwrite` SDK.
  - Implement signed upload URL generation for citizen report photo attachments.
  - Store uploaded file IDs in `citizen_reports.attachment_file_id` referencing Appwrite storage bucket `citizen-reports-media`.

---

### Phase E: Production Security & Quality Gates (High Priority)
- [x] **E.1 Automated Integration Test Suite:** 16 Vitest & Supertest end-to-end tests validating contract compliance.
- [x] **E.2 Input Validation & Error Envelopes:** Zod schema validation on all query params and request bodies.
- [ ] **E.3 Rate Limiting:** Add `express-rate-limit` to protect API endpoints (e.g., 100 requests / 15 minutes per IP; 20 requests / minute on `/intelligence/assistant/chat` and `/decisions/simulate`).
- [ ] **E.4 Security Headers:** Add `helmet` middleware for HTTP headers protection (HSTS, X-Content-Type-Options, etc.).
- [ ] **E.5 CORS Whitelisting:** Restrict `CORS_ORIGIN` in staging/production to registered mobile schemes and authorized reverse proxies.

---

### Phase F: Heroku Deployment & Release Automation (Completed Baseline)
- [x] **F.1 Heroku Procfile:** Added `web: node dist/server.js` and `release: node dist/database/migrate.js`.
- [x] **F.2 Deployment Guide:** Published step-by-step instructions in `docs/deployment/heroku.md`.
- [ ] **F.3 GitHub Actions CI/CD Pipeline:** Automate `npm test` and `flutter test` execution on every push, with automated deployment to Heroku staging upon passing tests.

