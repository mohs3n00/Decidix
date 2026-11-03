# Decidix — Architecture Decision Records (ADRs)

**Document Version:** 2.0.0  
**Status:** Approved Master Architecture  
**Context:** University Graduation Project through July 2027  

---

## Index of Decisions

- [ADR-001: Heroku-First Cloud Hosting Strategy](#adr-001-heroku-first-cloud-hosting-strategy)
- [ADR-002: Prisma ORM for Data Layer and Migrations](#adr-002-prisma-orm-for-data-layer-and-migrations)
- [ADR-003: Backend-Managed JWT Authentication](#adr-003-backend-managed-jwt-authentication)
- [ADR-004: Complete Elimination of Appwrite](#adr-004-complete-elimination-of-appwrite)
- [ADR-005: Heroku Postgres + pgvector for Grounded RAG](#adr-005-heroku-postgres--pgvector-for-grounded-rag)
- [ADR-006: Firebase Cloud Messaging via Official Firebase Admin SDK](#adr-006-firebase-cloud-messaging-via-official-firebase-admin-sdk)
- [ADR-007: 100% Preservation of Existing Flutter Client](#adr-007-100-preservation-of-existing-flutter-client)
- [ADR-008: In-Dyno Python ML Execution & PostgreSQL Forecast Caching](#adr-008-in-dyno-python-ml-execution--postgresql-forecast-caching)
- [ADR-009: Zero Third-Party Paid Heroku Marketplace Add-ons](#adr-009-zero-third-party-paid-heroku-marketplace-add-ons)

---

### ADR-001: Heroku-First Cloud Hosting Strategy
- **Status:** Accepted
- **Context:** Decidix is an academic graduation project requiring a stable, managed cloud platform for testing, demonstrations, and final defense through July 2027. The developer has an active Heroku account funded by the GitHub Student Developer Pack ($13.00 USD/month in platform credits).
- **Decision:** Deploy the Node.js backend to a Heroku Dyno (`basic` or `eco`) paired with Heroku Postgres (`essential-0`) in the `eu` region.
- **Consequences:** The entire hosting infrastructure is 100% covered by student credits ($10.00–$12.00/mo spend vs. $13.00/mo credit). Eliminates AWS/GCP DevOps complexity while guaranteeing high availability during live graduation defenses.

---

### ADR-002: Prisma ORM for Data Layer and Migrations
- **Status:** Accepted
- **Context:** The backend requires a type-safe database layer capable of declarative schema definitions, automated reversible migrations, and connection pooling.
- **Decision:** Adopt Prisma ORM (`@prisma/client`, `prisma`) as the sole data access layer in `backend/`.
- **Consequences:** Provides automated TypeScript types matching database models, automated SQL migrations (`npx prisma migrate deploy`) during the Heroku Release phase, and built-in connection pool throttling to prevent exceeding the 20-connection limit on `essential-0` Postgres.

---

### ADR-003: Backend-Managed JWT Authentication
- **Status:** Accepted
- **Context:** Earlier design notes proposed external authentication via Clerk or Appwrite. However, third-party auth introduces SaaS dependencies, credential renewal overhead, and subscription costs. The Flutter app already includes an `AuthInterceptor` that sends `Authorization: Bearer <token>`.
- **Decision:** Implement self-contained, backend-managed JWT authentication using `jose` / `jsonwebtoken` and `bcryptjs`. Issue 15-minute access JWTs and store rotating refresh tokens in the PostgreSQL `sessions` table.
- **Consequences:** Zero external auth costs. Perfect alignment with the Flutter client. Complete autonomy over user profiles and roles (`ADMIN`, `ANALYST`, `PLANNER`, `VIEWER`).

---

### ADR-004: Complete Elimination of Appwrite
- **Status:** Accepted
- **Context:** Appwrite was previously contemplated for authentication, database, and storage. However, Appwrite Education is deprecated, introduces multi-database synchronization overhead, and fragments the data architecture.
- **Decision:** Fully eliminate Appwrite from the project architecture. All data, users, and state live exclusively in PostgreSQL.
- **Consequences:** Clean single-database architecture. Zero dual-write inconsistencies. Simplified local development and testing.

---

### ADR-005: Heroku Postgres + pgvector for Grounded RAG
- **Status:** Accepted
- **Context:** The AI Assistant requires vector similarity retrieval to ground LLM responses in national development datasets. External vector databases (Pinecone, Qdrant) incur extra monthly fees and network hops.
- **Decision:** Utilize the native `pgvector` extension directly within Heroku Postgres (`essential-0`).
- **Consequences:** 1536-dimensional embeddings reside inside the `knowledge_chunks` table. SQL queries join vector similarity searches with relational metadata in a single sub-millisecond query. Zero extra cost.

---

### ADR-006: Firebase Cloud Messaging via Official Firebase Admin SDK
- **Status:** Accepted
- **Context:** The mobile application requires push notifications for critical indicator alerts and project updates.
- **Decision:** Use Google Firebase Cloud Messaging (FCM) through the official `firebase-admin` Node.js SDK on the backend and `firebase_messaging` on the Flutter client.
- **Consequences:** Free, unlimited push notifications on the Firebase Spark tier. Clean separation between device token registration in PostgreSQL and push broadcast dispatching.

---

### ADR-007: 100% Preservation of Existing Flutter Client
- **Status:** Accepted
- **Context:** The Flutter mobile application is already fully developed with 18 polished screens, bilingual RTL support, Riverpod state management, and 184 passing automated tests.
- **Decision:** The Flutter client must not be redesigned or rewritten. All backend endpoints must strictly conform to `docs/api_contract.md`.
- **Consequences:** Focus engineering effort strictly on backend completion, data pipelines, and infrastructure reliability.

---

### ADR-008: In-Dyno Python ML Execution & PostgreSQL Forecast Caching
- **Status:** Accepted
- **Context:** Running a dedicated Python microservice dyno (e.g. FastAPI) would consume an additional $7.00/mo, exceeding the $13.00/mo student credit limit.
- **Decision:** Train ML models offline/in-pipeline, serialize artifacts to `ml/models/`, precompute multi-year regional forecasts via `predict.py`, and populate the PostgreSQL `ml_forecasts` table.
- **Consequences:** Node.js backend serves forecast requests directly from PostgreSQL in $<15\text{ms}$. Zero second dyno required. Infrastructure remains 100% within student credit budget.

---

### ADR-009: Zero Third-Party Paid Heroku Marketplace Add-ons
- **Status:** Accepted
- **Context:** Heroku Marketplace add-ons (such as Redis Cloud, Papertrail paid, SendGrid) are billed directly to the user's credit card and are **not** covered by the GitHub Student Developer Pack credits.
- **Decision:** Strictly ban third-party paid add-ons. Use Heroku-native Dynos, Heroku Postgres, in-memory rate limiting, stdout logging (Heroku Logplex), and free-tier external APIs (Firebase, OpenRouter).
- **Consequences:** Guarantees zero unexpected credit card charges throughout the entire graduation project lifecycle.

