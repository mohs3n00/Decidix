# Decidix Agent Guide

## Scope and current state

Decidix is a bilingual (Arabic/English, RTL-aware) Flutter mobile application for national-development intelligence. The repository contains a Flutter client, a Node.js backend with Prisma and typed repositories, a Python ML pipeline, and a RAG retrieval system. Phase B4 was a code-level audit and in-memory fallback verification; live PostgreSQL verification and Heroku provisioning remain pending Phase D.

Do not claim a capability is implemented or verified in production without inspecting its code/configuration and validating it proportionally. Preserve user changes, including the currently modified `docs/flutter_closeout_plan.md`, unless the task explicitly includes them.

Out of scope until explicitly authorized:

- Web frontend.
- Admin dashboard.
- Replacing the Flutter client or its existing API contract without an approved migration.

## Technology decisions

| Area | Decision | Boundary |
| --- | --- | --- |
| Mobile | Flutter for Android and iOS | Keep API access behind repositories and preserve Arabic/RTL support. |
| Backend | Node.js + TypeScript | Owns business APIs, authorization, orchestration, and integrations. |
| System of record | PostgreSQL | Authoritative transactional and analytical application data. Live instance pending Phase D staging deployment. |
| Supporting services | Appwrite | Use only for explicitly assigned supporting responsibilities; do not duplicate PostgreSQL source-of-truth data. |
| Data/ML | Python | Owns dataset pipelines, training, evaluation, and inference artifacts. ML $R^2=0.975$ reflects contemporaneous composite reconstruction and does not establish future forecasting accuracy; ML forecasts are experimental. |
| Assistant | OpenRouter API (:free Tier) + Grounded RAG | University graduation project with strictly ZERO API spending. Exclusively verified `:free` chat models and local deterministic 1536-dim embeddings. Strictly no paid models, paid embedding APIs, or paid fallbacks without explicit owner approval. |
| Hosting | Heroku | Backend deployment target; provisioning and live database integration remain pending Phase D; configurations must be environment-specific and secret-free. |

## Repository rules

1. Inspect the repository, existing contracts, and git status before changing anything.
2. **Master Status Maintenance Rule:**
   - Every development task or milestone MUST maintain `docs/PROJECT_MASTER_STATUS.md`.
   - Read `docs/PROJECT_MASTER_STATUS.md` before starting any new task to verify current state.
   - Update `docs/PROJECT_MASTER_STATUS.md` after completing any meaningful implementation task.
   - Record completed components, modified files, dependencies, database changes, test results, and remaining gaps.
   - Strictly distinguish implemented features from planned features, mocks, placeholders, and unverified claims.
   - Always state the exact next implementation task.
   - Never mark a feature as completed without implementation and verification.
   - Preserve historical decisions and avoid contradicting approved architecture documentation.
3. Use the project skills in `.codex/skills/` when their domain applies.
4. Keep product decisions, architecture records, and implementation plans in `docs/`; keep executable code in its owning package or service.
5. Do not put secrets in the repository, mock data, documentation, logs, or client builds. Use environment variables and committed example files only.
6. Treat `docs/api_contract.md` as the mobile/backend integration baseline. Version and review breaking API or schema changes before implementing them.
7. PostgreSQL owns canonical entities and records. Appwrite is eliminated; do not introduce competing stores.
8. Dataset ingestion must record source, license/approval, version, validation outcome, and lineage. Never feed unapproved data to RAG or ML training.
9. RAG responses must include retrieved-source metadata, enforce tenant/authorization filtering before retrieval, and degrade safely when evidence is insufficient.
10. Validate each changed layer with its native checks. Do not run broad destructive commands, reset unrelated work, or alter production resources without explicit authorization.
11. **Permanent Zero-Cost AI Policy:**
    - Decidix is a university graduation project, not a commercial SaaS product. All AI functionality must operate with strictly ZERO API spending.
    - Use exclusively OpenRouter models with verified zero-cost access (explicit `:free` model variants, e.g. `meta-llama/llama-3.3-70b-instruct:free`, or the `openrouter/free` meta-router).
    - Strictly no paid models (such as Claude 3.5 Sonnet, Claude 3 Haiku, GPT-4), paid embedding APIs (such as OpenAI text-embedding-3-small), or paid automatic fallbacks without explicit project owner approval.
    - Never purchase, top up, or consume paid OpenRouter credits.
    - Embedding generation must use offline deterministic/local methods (`deterministic-fnv1a-v1`, 1536-dim) or explicitly verified free solutions; never call paid embedding endpoints.
    - All external AI requests must enforce request timeouts (10s), rate-limit guards (HTTP 429: free-tier limit 20 req/min), payment-required protection (HTTP 402), and graceful degradation to offline domain-grounded deterministic reasoning.

## Planning and delivery

For work beyond a small fix, state assumptions, decisions requiring confirmation, dependencies, risks, and acceptance criteria. Implement in vertical, reviewable increments. A phase is complete only when its acceptance criteria and relevant tests pass.

Before deployment work, require a confirmed Heroku app/environment strategy, database migration/rollback plan, secret-management process, observability owner, and recovery procedure.

## Source-of-truth hierarchy

1. Explicit user instruction.
2. This file and applicable local `AGENTS.md` files.
3. Approved architecture decisions and contracts under `docs/`.
4. Existing code and tests, after inspection.

When these conflict, stop and document the conflict rather than silently choosing a breaking direction.
