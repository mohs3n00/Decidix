# Decidix — Smart National Development Decision Support System

**Academic Horizon:** University Graduation Project (2026 – July 2027)  
**Lead Architecture:** Heroku-First Monorepo Architecture  
**Primary Languages:** Dart (Flutter), TypeScript (Node.js), Python 3.11  

---

## 1. System Mission & Scope

Decidix is a bilingual (Arabic & English, RTL-native) Smart Development Decision Support System designed for regional governors, national planners, and public policy analysts. It analyzes cross-sectoral performance indicators across 12 administrative regions covering four core domains:

- **Education:** Literacy rates, teacher-to-pupil ratios, STEM readiness, graduation rates.
- **Healthcare:** Hospital bed density, infant mortality, physician ratios, healthcare centers.
- **Economy & Employment:** Unemployment rates, GDP per capita, labor participation, SME growth.
- **Infrastructure & Utilities:** Clean water coverage, electrical grid reliability, road network density, broadband access.

The platform provides descriptive dashboards, interactive GIS maps, comparative regional analytics, historical trends, priority matrices, machine learning forecasting, what-if scenario simulations, citizen feedback monitoring, and an interactive RAG-grounded AI intelligence assistant.

---

## 2. Master Technology Stack

| Domain | Selected Technology | Architecture & Strategy |
|---|---|---|
| **Mobile Client** | Flutter 3.x / Dart 3.13+ | 18 screens, Riverpod state, GoRouter, Dio HTTP, `flutter_map`, bundled fonts, EN/AR RTL support. |
| **Backend API** | Node.js 20+ / TypeScript 5.x | Express server, Prisma ORM, Zod validation, Pino logging, Helmet security, in-memory rate limiting. |
| **System of Record** | Heroku Postgres (`essential-0`) | PostgreSQL 15+, relational tables, time-series metrics, device tokens, connection pooling. |
| **Vector Search (RAG)**| `pgvector` Extension | Natively hosted inside Heroku Postgres; cosine distance (`<=>`) knowledge retrieval. |
| **Cloud Hosting** | Heroku Dyno (`basic` or `eco`) | Single Linux dyno in `eu` region. 100% funded by GitHub Student Developer Pack credits ($13/mo). |
| **AI LLM Gateway** | OpenRouter API | Verified zero-cost models (`meta-llama/llama-3.3-70b-instruct:free`, `openrouter/free`); server-side only with strict evidence grounding and $0.00 spending policy. |
| **Data & ML Pipeline** | Python 3.11 / scikit-learn | Multi-model forecasting ensemble ($R^2 \ge 0.97$), zero temporal leakage, calibrated confidence bounds. |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Google `firebase-admin` SDK server-side; free unlimited push messaging on Spark plan. |

---

## 3. Repository Structure

```text
decidix_app/
├── lib/                        # Flutter mobile application
│   ├── api/                    # Typed API models, repositories, and network transports (Dio / Mock)
│   ├── core/                   # Theme tokens, typography, colors, routing, network, and i18n
│   ├── features/               # Vertical application features (Overview, Insights, Intelligence, Decisions)
│   └── shared/                 # Reusable UI widgets, cards, charts, and pagination controls
├── backend/                    # Node.js + TypeScript backend service
│   ├── src/                    # Controllers, business services, middleware, and config
│   ├── prisma/                 # Prisma schema, migrations, and PostgreSQL seed scripts
│   ├── test/                   # Vitest and Supertest contract and integration tests
│   └── Procfile                # Heroku deployment process configuration
├── ml/                         # Machine learning forecasting subsystem
│   ├── training/               # Model training pipelines with strict temporal splits
│   ├── inference/              # Calibrated confidence interval forecasting engine
│   ├── evaluation/             # Out-of-sample metrics ($R^2$, MAE, RMSE) and model cards
│   └── models/                 # Serialized joblib model artifacts
├── datasets/                   # Project statistical datasets
│   ├── raw/                    # Raw government indicators and geographic data
│   ├── curated/                # Normalized panel datasets for training and DB seeding
│   └── metadata/               # dataset_catalog.json capturing provenance and schemas
├── docs/                       # Project specifications and architecture documentation
│   ├── architecture/           # Master system, backend, database, security, and ML specifications
│   ├── deployment/             # Heroku deployment guides, env vars, migration, and backup runbooks
│   ├── audits/                 # Complete Flutter audit, API mapping, and gap analysis
│   └── api_contract.md         # Authoritative REST API baseline contract
├── env/                        # Flutter environment configuration files (dev.json, staging.json, prod.json)
└── assets/                     # Bundled fonts, icons, images, and mock JSON fixtures
```

---

## 4. Documentation Index

The platform architecture and operational runbooks are comprehensively documented:

### Architecture Specifications (`docs/architecture/`)
- [`system_architecture.md`](file:///e:/decidix_app/docs/architecture/system_architecture.md): Master end-to-end architecture, boundary definitions, and component interactions.
- [`backend_architecture.md`](file:///e:/decidix_app/docs/architecture/backend_architecture.md): Node.js service design, middleware pipeline, and controller structure.
- [`database_architecture.md`](file:///e:/decidix_app/docs/architecture/database_architecture.md): PostgreSQL schema, Prisma models, indexes, and `pgvector` configuration.
- [`authentication_and_security.md`](file:///e:/decidix_app/docs/architecture/authentication_and_security.md): JWT token rotation, RBAC matrix, and OWASP security hardening.
- [`ml_architecture.md`](file:///e:/decidix_app/docs/architecture/ml_architecture.md): Ensemble training, out-of-sample validation ($R^2 = 0.975$), and inference caching.
- [`ai_rag_architecture.md`](file:///e:/decidix_app/docs/architecture/ai_rag_architecture.md): Grounded RAG with OpenRouter zero-cost free models, local 1536-dim embeddings, and similarity fallbacks.
- [`library_and_sdk_strategy.md`](file:///e:/decidix_app/docs/architecture/library_and_sdk_strategy.md): "Don't Reinvent the Wheel" evaluation and selection matrix.
- [`technology_decisions.md`](file:///e:/decidix_app/docs/architecture/technology_decisions.md): Architecture Decision Records (ADR-001 through ADR-009).

### Deployment Runbooks (`docs/deployment/`)
- [`heroku_infrastructure_plan.md`](file:///e:/decidix_app/docs/deployment/heroku_infrastructure_plan.md): Student credit budget analysis and dyno allocation plan.
- [`heroku.md`](file:///e:/decidix_app/docs/deployment/heroku.md): Step-by-step Heroku deployment runbook with CLI commands.
- [`environment_variables.md`](file:///e:/decidix_app/docs/deployment/environment_variables.md): Master environment variables inventory and secrets hygiene.
- [`database_migration.md`](file:///e:/decidix_app/docs/deployment/database_migration.md): Prisma migration lifecycle and release phase automation.
- [`backup_and_recovery.md`](file:///e:/decidix_app/docs/deployment/backup_and_recovery.md): Heroku Postgres automated daily snapshots and disaster recovery runbook.

### Audit & Alignment Specifications (`docs/audits/`)
- [`flutter_feature_audit.md`](file:///e:/decidix_app/docs/audits/flutter_feature_audit.md): Complete inventory of all 18 screens and widgets.
- [`flutter_backend_api_mapping.md`](file:///e:/decidix_app/docs/audits/flutter_backend_api_mapping.md): Mapping of 19 contract endpoints to Flutter presentation layers.
- [`integration_gap_analysis.md`](file:///e:/decidix_app/docs/audits/integration_gap_analysis.md): Cross-system verification across Flutter, Backend, DB, and ML.
- [`flutter_data_dependencies.md`](file:///e:/decidix_app/docs/audits/flutter_data_dependencies.md): Lifecycle, debouncing, and origin of data per screen.
- [`backend_remaining_work.md`](file:///e:/decidix_app/docs/audits/backend_remaining_work.md): Prioritized implementation roadmap.

---

## 5. Getting Started & Development Commands

### 5.1 Flutter Mobile Client
Requires Flutter 3.x and Dart 3.13+.

```bash
# 1. Fetch dependencies
flutter pub get

# 2. Run static analyzer (must be 0 issues)
flutter analyze

# 3. Execute all 184 unit and contract tests
flutter test

# 4. Run application with local mock data (default)
flutter run --dart-define-from-file=env/dev.json

# 5. Run application against live Heroku backend
flutter run --dart-define-from-file=env/staging.json
```

### 5.2 Node.js Backend Service
Requires Node.js 20+ and npm.

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Compile TypeScript
npm run build

# 3. Run integration tests (Vitest + Supertest)
npm test

# 4. Start local development server with hot reload
npm run dev
```

### 5.3 Data & Machine Learning Pipeline
Requires Python 3.11 with pandas, scikit-learn, and joblib.

```bash
# 1. Ingest raw datasets and build catalog
python scripts/pipeline_ingest.py

# 2. Train multi-model forecasting ensemble
python ml/training/train_forecaster.py

# 3. Generate calibrated forecast predictions
python ml/inference/predict.py
```

---

## 6. University Graduation Project Constraints

- **Single Student Budget:** Total hosting costs are strictly capped under the **$13.00 / month GitHub Student Developer Pack credit allowance** on Heroku through July 2027.
- **Zero Third-Party Paid Add-ons:** All vector search, persistence, and caching are consolidated into Heroku Dynos and Heroku Postgres.
- **Demonstration Reliability:** Precomputed forecast tables, in-memory rate limiters, and automated database backups guarantee rock-solid stability during thesis defenses and committee evaluations.
