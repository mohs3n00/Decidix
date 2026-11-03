# Decidix Integration Gap Analysis

This document provides a prioritized gap analysis comparing Flutter mobile expectations with the Node.js backend, PostgreSQL schema, Python ML models, RAG assistant, and Appwrite supporting services.

---

## 1. Executive Gap Matrix

| Area | Component | Severity | Description | Current Status | Resolution Action |
|---|---|---|---|---|---|
| **API** | Citizen Reports | **P1 (High)** | Field naming in Flutter model is `likes` (not `likes_count`), and likes toggle response expects `id`, `likes`, `liked_by_me`. | Aligned in Backend | Verify database column alias `likes_count AS likes` when querying PostgreSQL. |
| **API** | Predictions Series | **P1 (High)** | Series mixes `actual` and `forecast` points where `lower` and `upper` are `null` for actual points. | Aligned in Backend & ML | Ensure ML inference output strictly emits `null` for years $\le 2025$. |
| **API** | Simulator Levers | **P2 (Medium)** | Flutter's "Jobs & Enterprise" slider maps to `economy` key; allocations in whole USD. | Aligned in Backend | Enforce domain enum mapping in Zod validator. |
| **Auth** | Sign-In / Clerk | **P2 (Medium)** | Flutter `authTokenReaderProvider` currently returns `null`. Backend supports native JWT and Bearer tokens. | Supported on Server | Provide Clerk JWKS verification hook or mobile login screen. |
| **Database** | Dynamic SQL vs. Memory Fallback | **P1 (High)** | Backend currently operates in fallback mode when `DATABASE_URL` is unreachable. | Implemented | Wire live PostgreSQL pool connection in staging environment. |
| **Storage** | Appwrite Attachments | **P3 (Low)** | Citizen report photo upload is planned for civic reporting but not yet exposed in mobile UI. | Scoped to Appwrite | Retain Appwrite storage bucket for report media uploads without duplicating entities. |
| **ML** | Target Year Horizon | **P2 (Medium)** | Mobile selector requests 2027, 2028, 2030; ML model must dynamically extrapolate up to 2030. | Implemented in `predict.py` | Connect Node.js backend to invoke `predict.py` or use cached forecast tables. |
| **RAG** | Grounded Citations | **P1 (High)** | Assistant replies must include explicit source attribution with period (`2025-Q4`). | Implemented | Ensure OpenRouter prompt extracts verified period from retrieved documents. |

---

## 2. Detailed Gap Assessments

### 2.1 Mobile ↔ Backend Data Shape Alignment

1. **Envelope Structure:**
   - **Flutter Expectation:** All successful responses must be wrapped in `{ "data": ... }`, with optional `"meta": { "page", "per_page", "total" }` on paginated lists.
   - **Backend Status:** Fully compliant. `sendSuccess()` utility standardizes this structure across all 19 endpoints.
   - **Contract Match:** 100%.

2. **Validation Errors (HTTP 422):**
   - **Flutter Expectation:** Error responses must provide `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "fieldName": "reason" } } }`.
   - **Backend Status:** Handled via Zod schema validation in `validator.ts` and `errorHandler`. Missing/invalid fields populate `error.fields`.
   - **Contract Match:** 100%.

3. **Citizen Report Likes:**
   - **Flutter Expectation:** `POST /v1/decisions/citizen-reports/:id/like` toggles like state and returns `{ "id": string, "likes": number, "liked_by_me": boolean }`.
   - **Backend Status:** In-memory user like set tracks toggles per user/IP. In PostgreSQL, `citizen_report_likes` junction table enforces unique user likes with `COUNT(*)` rollups.
   - **Contract Match:** 100%.

4. **Simulator Yield Calculations:**
   - **Flutter Expectation:** 300ms debounced re-simulation with `CancelToken`. Yields must reflect:
     - Healthcare: $0.069$ points / \$1M
     - Infrastructure: $0.058$ points / \$1M
     - Education: $0.050$ points / \$1M
     - Economy: $0.049$ points / \$1M
   - **Backend Status:** Exact multipliers implemented in `decisions.router.ts`.
   - **Contract Match:** 100%.

---

### 2.2 PostgreSQL Schema & System of Record

1. **Entity Ownership:**
   - PostgreSQL is the authoritative system of record for all structured development intelligence:
     - `regions` (12 baseline administrative entities with WGS84 coordinates)
     - `indicators` (cross-domain indicator catalog with higher_is_better flags)
     - `regional_metrics` (historic and current measurements with sparklines)
     - `national_index_history` (multi-year national scores and periods)
     - `development_projects` (portfolio investments and progress metrics)
     - `citizen_reports` and `citizen_report_likes` (civic feedback)
     - `ai_recommendations` (prescriptive policy recommendations)
     - `dataset_metadata` (data provenance and sync timestamps)
     - `rag_documents` (grounded RAG context with embeddings)
   - **Status:** Complete migrations in `backend/src/database/migrations/`.

2. **Appwrite Boundary:**
   - Appwrite is strictly bounded to supporting services:
     - File/photo storage for citizen report media via storage bucket `citizen-reports-media`.
     - No competing database tables for core application entities.
   - **Status:** Architecture verified and documented.

---

### 2.3 Machine Learning Pipeline Compatibility

1. **Model Accuracy & Integrity:**
   - Models trained on verified curated datasets (`datasets/processed/curated_regional_development.csv`).
   - Out-of-sample temporal cross-validation on 2024-2025:
     - `gradient_boosting`: $R^2 = 0.979$, $\text{MAE} = 0.031$
     - `random_forest`: $R^2 = 0.966$, $\text{MAE} = 0.041$
     - `temporal_ensemble`: $R^2 = 0.975$, $\text{MAE} = 0.035$
   - **Audit Limitation:** The Phase C1 validation audit proved that $R^2=0.975$ reflects contemporaneous composite index reconstruction from the same 12 pillar indicators (target-feature leakage) and test ceiling saturation (83.3% at 95.0, $\sigma = 0.611$), rather than genuine future forecasting accuracy. ML outputs are classified as experimental.
   - No fabricated scores. All models saved as verifiable `.joblib` artifacts in `ml/models/artifacts/`.

2. **Prediction Intervals:**
   - Confidence bounds (`lower`, `upper`) calculated using $1.96 \times \sigma_{\text{step}}$, expanding with forecast horizon.
   - Output series aligns with Flutter `Predictions` model.

---

### 2.4 Grounded AI Assistant & RAG

1. **Retrieval Verification:**
   - Retrieval only queries approved datasets and policy briefs stored in `rag_documents`.
   - Authorization/tenant filters applied prior to context construction.
2. **Attribution:**
   - Every factual statement requires citation metadata (`name`, `period`).
   - Grounded deterministic fallback protects availability if OpenRouter API is unreachable or unconfigured.

---

## 3. Prioritized Action Plan

1. **Immediate (P1):** Ensure all database queries to PostgreSQL map `likes_count` to wire property `likes`.
2. **Short-Term (P2):** Deploy live PostgreSQL instance on Heroku and run release migration.
3. **Medium-Term (P3):** Configure Appwrite bucket credentials for user-submitted civic images.

