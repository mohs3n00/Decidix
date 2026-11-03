# Decidix Flutter Data Dependencies Specification

This document maps every Flutter screen to its upstream data origins, computation location, lifecycle, and caching policies.

---

## 1. Data Dependency Matrix

| Screen | Primary Endpoint | Primary Storage | ML / AI Engine | External Services | Computation Location |
|---|---|---|---|---|---|
| **01 Dashboard** | `GET /v1/overview` | PostgreSQL: `national_index_history`, `regions`, `regional_metrics` | None | None | **Server:** Index band, 3/5/7Y trend slicing, at-risk filtering. **Client:** Number formatting. |
| **02 Interactive Map** | `GET /v1/regions/map-points` | PostgreSQL: `regions`, `regional_metrics` | None | OpenStreetMap (OSM) / MapTiler tile server | **Server:** Sector score & priority determination. **Client:** Map rendering & pin selection. |
| **03 Regions** | `GET /v1/regions` | PostgreSQL: `regions` | None | None | **Server:** Sorting by rank, text search (`q`), priority filter, pagination. **Client:** 300ms search debounce. |
| **04 Region Profile** | `GET /v1/regions/:id` | PostgreSQL: `regions`, `regional_metrics`, `national_index_history`, `dataset_metadata` | None | None | **Server:** History alignment, domain scores, data quality calculation. **Client:** Chart rendering. |
| **05 Education** | `GET /v1/insights/education` | PostgreSQL: `indicators`, `regional_metrics`, `sector_breakdowns`, `regions` | None | None | **Server:** Rankings (top/bottom 5), breakdown calculation. **Client:** Percentage scaling. |
| **06 Healthcare** | `GET /v1/insights/healthcare` | PostgreSQL: `indicators`, `regional_metrics`, `sector_breakdowns`, `regions` | None | None | **Server:** Top/bottom rankings, indicator calculation. **Client:** Bar scaling. |
| **07 Economy** | `GET /v1/insights/economy` | PostgreSQL: `indicators`, `regional_metrics`, `sector_breakdowns`, `regions` | None | None | **Server:** Top/bottom rankings, employment share. **Client:** Currency & percent formatting. |
| **08 Infrastructure** | `GET /v1/insights/infrastructure` | PostgreSQL: `indicators`, `regional_metrics`, `sector_breakdowns`, `regions` | None | None | **Server:** Top/bottom rankings, investment distribution. **Client:** Hatched bar fills. |
| **09 Region Comparison** | `GET /v1/insights/comparison` | PostgreSQL: `regions`, `regional_metrics` | None | None | **Server:** Gap analysis text generation, score comparisons. **Client:** Color-coded comparison bars. |
| **10 Historical Analysis** | `GET /v1/insights/historical` | PostgreSQL: `national_index_history` | None | None | **Server:** Multi-year trend points, milestones. **Client:** Annual delta bar highlight. |
| **11 Development Priority** | `GET /v1/insights/priority` | PostgreSQL: `regions`, `regional_metrics` | Analytical Rule Engine | None | **Server:** Need score calculation ($100 - \text{score}$), priority queue ordering, weakest domain identification. **Client:** Summary count tiles. |
| **12 Data Quality** | `GET /v1/insights/data-quality` | PostgreSQL: `dataset_metadata` | None | External Government Data Portals | **Server:** Completeness, timeliness, accuracy scoring, sync age calculation. **Client:** Quality band formatting. |
| **13 ML Predictions** | `GET /v1/intelligence/predictions` | PostgreSQL: `regional_metrics` | Python ML (`predict.py`: GradientBoosting, RandomForest, TemporalEnsemble) | None | **Server/ML:** Multi-year forecasting (2026-2030), confidence band calculation ($1.96\sigma$), $R^2$ metrics, top improvers delta. **Client:** Shaded forecast rendering. |
| **14 AI Assistant** | `POST /v1/intelligence/assistant/chat` | PostgreSQL: `rag_documents`, `regions` | OpenRouter API + RAG Retrieval Engine | OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`) | **Server/RAG:** Document retrieval, prompt assembly, citation verification, policy table generation. **Client:** Chat history & typing animations. |
| **15 Recommendations** | `GET/POST /v1/intelligence/recommendations` | PostgreSQL: `ai_recommendations`, `regions` | Prescriptive Rule Engine + ML | None | **Server:** Filtering to `suggested` status, cost/impact ranking, state mutation (`in_plan` / `dismissed`). **Client:** Optimistic list removal. |
| **16 What-If Simulator** | `POST /v1/decisions/simulate` | PostgreSQL: `regions`, `regional_metrics` | Policy Simulation Engine | None | **Server:** Yield multiplier computation, projected score ($today + gain$), best lever identification. **Client:** 300ms slider debounce, cancellation of obsolete requests. |
| **17 Development Projects** | `GET /v1/decisions/projects` | PostgreSQL: `development_projects`, `regions` | None | None | **Server:** Portfolio totals (count, total budget, delayed count), status filter, pagination. **Client:** Infinite scroll. |
| **18 Citizen Reports** | `GET/POST /v1/decisions/citizen-reports` | PostgreSQL: `citizen_reports`, `citizen_report_likes`, `regions` | None | Appwrite Storage (`citizen-reports-media`) | **Server:** Open reports count, resolved rate, category filter, like count increment/decrement. **Client:** Optimistic like toggle. |

---

## 2. Data Flow Architecture

```
[ Flutter Mobile App ]
         │
         │ HTTPS / JSON (snake_case, localized pairs)
         ▼
[ Node.js + Express API ]
   ├── Input Validation (Zod)
   ├── Auth & Role Verification (JWT)
   ├── Business Logic & Response Wrapping
   │
   ├──► [ PostgreSQL Database ] (System of Record)
   │        ├── Core Relational Data
   │        └── pgvector / RAG Knowledge Documents
   │
   ├──► [ Python ML Engine ] (Inference)
   │        └── Joblib Model Artifacts (GradientBoosting, RandomForest, TemporalEnsemble)
   │
   ├──► [ OpenRouter API ] (LLM Gateway)
   │        └── Free Tier LLM (:free) / Grounded System Prompts
   │
   └──► [ Appwrite Services ] (Supporting Only)
            └── Citizen Report Photo Storage
```

---

## 3. Caching, Pagination & Lifecycle Rules

1. **Caching Policy:**
   - Flutter operates on real-time requests with Riverpod providers.
   - Re-fetching occurs upon filter change or pull-to-refresh (`onRefresh`).
   - Mock transport provides zero-latency deterministic responses for unit/widget tests.

2. **Pagination Standards:**
   - Supported on `regions`, `projects`, and `citizen-reports`.
   - Default page size: 20 items (max 100).
   - Stale page protection: generation tokens prevent race conditions when filters change during in-flight page loading.

3. **Debounce Policies:**
   - Search input: 300ms debounce.
   - What-If Simulator sliders: 300ms debounce with `CancelToken` to abort superseded server calculations.

