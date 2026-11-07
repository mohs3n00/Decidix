# Decidix Recovery & Stabilization Master Plan

**Status:** Canonical recovery roadmap; historical claims remain unverified unless the evidence
column points to current repository evidence.  
**Created:** 2026-11-04  
**Scope:** Flutter Android/iOS client, Node.js/TypeScript backend, PostgreSQL/Prisma, Python ML,
RAG, dataset governance, staging, and release verification.  
**Out of scope:** Web frontend, admin dashboard, replacement of the Flutter client/API contract,
production changes without owner approval.

> The previous Opus report referenced by the recovery request is not present in this checkout.
> This plan preserves every requested problem and task identifier, incorporates the evidence that
> is present in the repository, and marks missing historical detail as `UNAVAILABLE_EVIDENCE`
> instead of inventing facts. Restore the original report when available and enrich the marked
> cards without changing their IDs.

## 1. Project overview

Decidix is a bilingual Arabic/English, RTL-aware national-development decision-support mobile
application. The Flutter client presents overview, map, regions, sector insights, comparisons,
history, data quality, priority, predictions, recommendations, simulator, projects, citizen
reports, and a grounded assistant. The backend owns authorization, orchestration, repositories,
dataset guards, RAG, notifications, and the versioned `/v1` API. PostgreSQL is the system of
record; Prisma is the typed access layer; Python owns ingestion, training, evaluation, and
inference; Heroku is the intended backend host; Cloudflare R2 is the intended dataset object
store; Firebase supplies Google identity and FCM integration.

The permanent AI policy is zero API spending: only verified OpenRouter `:free` models (or
`openrouter/free`) and local deterministic 1536-dimensional embeddings may be used. External
requests require a 10-second timeout, 429/402 handling, and safe offline degradation.

Repository boundaries:

| Area | Responsibility |
|---|---|
| `lib/`, `test/` | Flutter client, repositories, routing, localization, widget/unit tests |
| `backend/src/`, `backend/tests/` | Node.js API, auth, repositories, RAG, datasets, notifications |
| `backend/prisma/` | PostgreSQL schema and migrations; never run against live DB without approval |
| `ml/`, `scripts/` | ingestion, preprocessing, training, evaluation, inference, numerical checks |
| `datasets/` | governed metadata, raw/processed assets; no unapproved data |
| `docs/` | contracts, architecture, plans, evidence, and operational status |

## 2. Current project reality

**Verified from this checkout on 2026-11-04:**

- The working tree is on `recovery/stabilization` and contains extensive uncommitted remediation
  work. Those changes are preserved; this documentation task must not reset or clean them.
- `docs/PROJECT_MASTER_STATUS.md` records current dataset guards, provenance, R2 work, auth
  hardening, and automated verification. It also contains stale references to historical reports
  that are absent from this checkout.
- The current status says live PostgreSQL persistence, real-device Google authentication, and
  non-production R2 verification are not complete.
- Existing code and tests support synthetic/test fixtures, but normal non-test analytics are
  guarded by an active validated `DatasetVersion`; lack of one should produce an explicit
  unavailable state rather than silently presenting synthetic data.
- The latest QA report claims an Android emulator pass but also records historical/data-quality
  contract mismatches and FCM/device limitations. Claims in that report require reconciliation
  against current code before release decisions.

**Release readiness:** `BLOCKED` pending owner-approved official dataset/geography, live
PostgreSQL and R2 verification, real-device Google auth, contract reconciliation, and final
staging/release evidence.

## 3. Master problem register

The requested register is retained as PR-01 through PR-35. Rows marked
`UNAVAILABLE_EVIDENCE` require the missing prior Opus report or a fresh focused investigation.

| ID | Priority | Problem / required outcome | Evidence and root cause | Dependency / risk |
|---|---|---|---|---|
| PR-01 | P0 | No approved official dataset is connected | Current status and Phase D roadmap say ingestion is blocked | Owner dataset/licence; all analytics depend on it |
| PR-02 | P0 | Geographic identity is unresolved | 12 regions remain fictional/no official codes or geometry | Owner must select country and administrative level |
| PR-03 | P0 | Synthetic data can be mistaken for official data | Seed/mock assets and prior forecast provenance findings | Dataset guard and labels must remain enforced |
| PR-04 | P0 | Live PostgreSQL verification is incomplete | Current status explicitly says live persistence is unverified | Staging DB access; migration risk |
| PR-05 | P0 | R2 connectivity and object intake are unverified | RESOLVED_LOCAL 2026-11-06: real private bucket `decidcix` (account `806347af…`) connected, public `r2.dev` URL disabled, Wrangler object round-trip passed, `npm run r2:verify` passed with real S3 keys, and a full upload→R2→validate→ingest→activate→overview run passed with rollback | `backend/.env` still needs `R2_ACCOUNT_ID` + `R2_BUCKET_NAME=decidcix`; staging has no `R2_*`; Flutter UI unverified on device |
| PR-06 | P0 | Real Google sign-in/device flow is unverified | E8 state: device disconnected; SHA-1 registration pending | Firebase owner action; auth release blocker |
| PR-07 | P0 | Historical auth bypass and environment gates require proof | E8 audit identified `test_google_` bypass as a critical review item | Must be test-only and regression-tested |
| PR-08 | P1 | Session restoration/refresh/logout need live proof | Code/tests exist; real exchange and persistence are unverified | PR-06 and staging DB |
| PR-09 | P1 | Backend/Flutter response-shape drift | QA report recorded historical and data-quality mismatches | Contract fixtures and client parsers |
| PR-10 | P1 | Dashboard KPI origin must be reconciled | Historical seed path used fictional values; current guard changed behavior | Official dataset and lineage review |
| PR-11 | P1 | Map pins require verified geometry | Current status says pins are suppressed without boundaries | PR-02 and approved geometry |
| PR-12 | P1 | Historical series classification must remain explicit | Derived/non-observed history is documented in current status | Dataset vintage and API contract |
| PR-13 | P1 | Forecasts may be overclaimed | Leakage audit classifies forecasts as experimental/simulated | ML evidence and UI disclaimers |
| PR-14 | P1 | Unsupported ML metrics/claims must stay removed | Existing status and API contract describe experimental output | Regression review |
| PR-15 | P1 | RAG must retrieve only approved active versions | Current lineage says `DatasetVersion` filters retrieval | DB migration and ingestion tests |
| PR-16 | P1 | RAG citations and insufficient-evidence refusal need live proof | Code/test claims exist; live corpus is unavailable | Approved corpus and evaluation set |
| PR-17 | P1 | Arabic retrieval quality needs evaluation | Arabic stem normalization exists; gold set is not evidenced | Bilingual corpus and gold tests |
| PR-18 | P1 | Zero-cost model/embedding enforcement must remain absolute | Env validation and deterministic embedding code exist | Config audit; no paid fallback |
| PR-19 | P1 | Dataset provenance/lineage must be complete | Provenance helpers and catalog exist; official data absent | Source licences and approvals |
| PR-20 | P1 | Dataset validation/approval/activation/rollback needs staging proof | Dataset upload (canonical JSON and the strict Decidix CSV template), validation, atomic activation and safe rollback implemented and verified locally (269 backend unit tests, 10 PG integration tests, 228 Flutter tests) | Staging deployment and owner dataset |
| PR-21 | P1 | R2 upload/download checksums and retention need proof | RESOLVED_LOCAL 2026-11-06: uploaded object SHA-256 matched the stored `checksumSha256` both via the backend (`complete`) and via an independent Wrangler read; cleanup verified with an explicit object GET | Retention policy and browser CORS remain undecided |
| PR-22 | P1 | Shared-schema migration sequencing needs controlled execution | Multiple uncommitted Prisma migrations exist | Owner-approved staging migration plan |
| PR-23 | P1 | Notification delivery is not fully validated | QA says FCM/device/dyno delivery is blocked | Firebase credentials/device/dyno |
| PR-24 | P1 | API authorization/tenant filtering must be rechecked | Repositories and auth tests exist; live RBAC is unverified | Staging users and DB |
| PR-25 | P1 | Error and empty-state behavior must be bilingual and safe | Current shared state views and dataset guard exist | Flutter contract tests/device |
| PR-26 | P1 | Startup/splash/API URL behavior needs device verification | Current status records fixed white launch and URL guard | Connected Android device |
| PR-27 | P1 | Numerical formulas and simulator are illustrative, not empirical | Existing numerical validation and disclaimers | Approved methodology/owner signoff |
| PR-28 | P2 | Documentation contains stale/missing historical references | Status references absent `DECIDIX_PHASE_*` reports | Documentation reconciliation |
| PR-29 | P2 | Test counts differ across historical reports | Multiple dated reports claim different totals | Re-run targeted native suites |
| PR-30 | P2 | Release signing and platform readiness require owner inputs | E8 says release key/device setup incomplete | Owner keystore/SHA-1/iOS resources |
| PR-31 | P2 | Operational observability and rollback evidence incomplete | Deployment docs exist; live runbook execution unverified | Heroku owner access |
| PR-32 | P2 | Source licensing and geographic mapping are incomplete | Phase D roadmap records hard preconditions | Owner decision and legal/source evidence |
| PR-33 | P2 | Accessibility/RTL and layout claims need current device evidence | Flutter plans/tests exist; complete current device sweep absent | Device matrix |
| PR-34 | P2 | Staging code/config may differ from local working tree | Current QA and status are not a deploy diff | Reconcile commit/build/deployed SHA |
| PR-35 | P2 | Recovery knowledge is not yet session-persistent | This skill/status/plan did not previously exist | This documentation task |

## 4. Existing fixes to preserve

The following are present in code, tests, or current status and must not be regressed. They are
not automatically production-verified:

- Forecast responses classify simulated/experimental output and carry disclaimers.
- Unsupported or misleading ML metrics were removed from the current contract surface.
- Synthetic catalog/provenance is not to be presented as official.
- Map pins are suppressed without verified geometry.
- Dataset guards return an explicit unavailable/503-style state outside test mode.
- Google identity audience validation, Google subject support, backend-managed sessions, refresh
  rotation, hashed session storage, reuse detection, logout, and protected routes exist in code.
- R2 integration, `DatasetVersion`/dataset APIs, provenance helpers, and ingestion services exist
  in the working tree but need non-production verification.
- Flutter routing, shared loading/error/empty states, Arabic/English localization, RTL behavior,
  and the current API endpoint guard are preserved.

## 5. Data lineage matrix

| Surface | Flutter | Endpoint | Backend | Canonical source / classification | Live status / remediation |
|---|---|---|---|---|---|
| Dashboard | `DashboardController` | `GET /v1/overview` | overview router/repository | `national_index_history`, `regions`, `regional_metrics`; official only after validated dataset | DB/live dataset unverified |
| Map | `MapController` | `GET /v1/regions/map-points` | regions repository | `regions.boundaryGeojson`, regional metrics; no geometry means no pin | Need official geography |
| Regions | `RegionsController` | `GET /v1/regions` | regions repository | PostgreSQL `regions` | Need canonical region codes |
| Region profile | region screen/controller | `GET /v1/regions/{id}` | regions repository | regions, metrics, history | Need dataset/geography |
| Comparisons | insights controller | `GET /v1/insights/comparison` | insights repository | regional metrics and indicators | Contract/live DB unverified |
| Sectors | sector screens | `GET /v1/insights/{sector}` | insights repository | indicators, breakdowns, metrics | Need validated dataset |
| Historical | historical screen | `GET /v1/insights/historical` | insights repository | national history; derived values labelled non-observed | Reconcile response shape |
| Data quality | data quality screen | `GET /v1/insights/data-quality` | insights repository | dataset metadata/provenance | Reconcile response shape |
| Priority | priority screen | `GET /v1/insights/priority` | insights repository | regional metrics/need score | Need official inputs |
| Predictions | predictions screen | `GET /v1/intelligence/predictions` | forecast repository/ML | forecast records and ML artifacts; experimental | No production claim |
| Recommendations | recommendations screen | `GET /v1/intelligence/recommendations` | intelligence repository/service | derived from approved metrics; illustrative unless validated | Method/inputs need signoff |
| Simulator | simulator screen | `POST /v1/decisions/simulate` | decisions repository/service | illustrative elasticity model, not empirical | Keep disclaimer |
| Projects | projects screen | `GET /v1/decisions/projects` | decisions repository | PostgreSQL projects | Live data unverified |
| Citizen reports | reports screen | `GET/POST /v1/decisions/reports` | decisions repository | PostgreSQL reports, auth-scoped | Live RBAC unverified |
| Chatbot | assistant screen | `POST /v1/intelligence/assistant/chat` | assistant -> RAG -> OpenRouter | active validated dataset version, approved `rag_documents`, local embeddings | Live corpus unavailable |

## 6. Authentication assessment

The lifecycle is Google ID token acquisition in Flutter, server-side audience/identity
verification, user upsert/linking by Google subject, short-lived backend JWT plus rotated refresh
session, secure client storage, restoration through `/v1/auth/refresh`/`me`, authorization middleware,
and logout/revocation. The token must never be treated as trusted merely because it is present.

Required checks: configured Web Client ID in each environment; Firebase Android SHA-1 and package
registration; no test token path outside test; wrong-audience rejection; subject collision safety;
refresh rotation and reuse detection; logout invalidation; protected-route 401/403 behavior; secure
storage; account switching; real Android evidence. Current status: code/test implementation exists,
real device and live staging persistence are `BLOCKED`/`UNVERIFIED`.

## 7. Chatbot and RAG assessment

Pipeline: validate authenticated request and language -> authorize tenant scope -> search active
validated dataset-version documents using deterministic local 1536-dim embeddings and similarity
threshold -> assemble bounded evidence with source metadata -> call only a verified free OpenRouter
model with timeout/rate/payment guards -> return grounded answer and citations, or bilingual
refusal when evidence is missing/insufficient. Conversation memory is bounded and user-isolated.

Known risks to verify: mixed embedding models, Arabic retrieval, hardcoded/static answers, fake
citations, prompt injection, stale versions, and model spending. Required deliverable: a bilingual
gold evaluation set with exact evidence/citation expectations and a no-evidence refusal suite.

## 8. Architecture and dataset readiness

PostgreSQL owns canonical regions, indicators, metrics, projects, reports, users, sessions,
forecasts, dataset metadata/versions, and RAG records. Prisma migrations must be reviewed and
applied only in approved staging. R2 stores approved source/processed objects with checksums and
retention metadata; it is not the system of record. A dataset lifecycle is:

`candidate -> validated -> approved -> active -> superseded/rolled_back`

Every source must record publisher, URL, licence/permission, retrieval date, checksum, version,
coverage, validation result, lineage, owner, and geographic mapping. Unlicensed, paid, ambiguous,
or geographically incompatible sources are blocked. The Phase D roadmap currently records World
Bank, UNDP, UNSD (licence unresolved), IMF (automation/licensing constraints), and geoBoundaries
as candidates—not ingested production data.

## 9. Complete execution roadmap

Each card retains the requested task ID and the required evidence gates.

### Phase 0 — Baseline and Safety

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T0.1 | Capture SHA, tree, env names, deployed SHA; current tree is dirty | Record non-secret baseline; `git status`, diff checks | Reproducible checkpoint; rollback is documentation-only; owner confirms baseline |
| T0.2 | Protect current remediation and secrets | No reset/clean; audit ignored/tracked secrets | No unrelated loss or secret exposure; owner approves scope |

### Phase 1 — Backend Data Integrity

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T1.1 | Define canonical geography and codes | Owner-approved region catalogue and geometry | Joinable region keys; revert catalogue before ingestion |
| T1.2 | Enforce dataset version guard | Validate active/validated version on analytics routes | Empty/503 response without dataset; feature flag rollback |
| T1.3 | Reconcile KPI/history origins | Repository queries only canonical tables | Lineage table and contract tests |
| T1.4 | Validate numeric semantics | Raw numbers, units, periods, provenance | Numerical tests and API examples pass |
| T1.5 | Verify PostgreSQL persistence | Staging migration and repository tests | Safe apply/rollback evidence; owner runs DB |
| T1.6 | Reconcile response contracts | Align flat/nested fields with API contract | Flutter/backend contract tests pass |
| T1.7 | Verify authorization and tenant filtering | RBAC and ownership queries | 401/403 matrix passes; no cross-tenant read |

### Phase 2 — Backend Authentication Security

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T2.1 | Configure Google audiences safely | Environment schema and startup diagnostics | No secret logs; missing config fails safely |
| T2.2 | Gate test identity paths | Test-only bypass and tests | Production/staging reject test tokens |
| T2.3 | Verify Google subject linking | Stable subject, email/link rules | Collision and wrong-audience tests |
| T2.4 | Verify JWT/session rotation | Hashing, rotation, reuse detection | Replay rejected; migration rollback documented |
| T2.5 | Verify refresh restoration | Client/server lifecycle | Restart/session restore evidence |
| T2.6 | Verify logout/account switching | Revoke and ownership isolation | Previous user cannot use session/token |
| T2.7 | Verify protected endpoints | Middleware and role matrix | 401/403 contract evidence |
| T2.8 | Complete real-device sign-in | Firebase SHA-1 and Android flow | Owner/device evidence; no claim before it |

### Phase 3 — Flutter Startup, Authentication, and Splash

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T3.1 | Startup/API environment guard | Fail fast when real API URL missing | Analyze/test and launch evidence |
| T3.2 | Native splash and startup state | Preserve white splash and first-frame flow | Debug APK and device evidence |
| T3.3 | Secure token storage/restoration | Keep tokens outside UI | Unit/integration tests |
| T3.4 | Auth error/loading/empty states | Bilingual shared state views | Arabic/English widget tests |
| T3.5 | Router protected-route behavior | Redirect based on session state | Deep-link and logout tests |
| T3.6 | RTL/accessibility regression sweep | Text scale, semantics, layout | Device matrix; revert only UI change |

### Phase 4 — No-Dataset Experience

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T4.1 | Prevent synthetic production display | Dataset gate and classifications | No-data response is explicit |
| T4.2 | Bilingual unavailable states | Shared error views and retry | Arabic/English screenshots/tests |
| T4.3 | Suppress unverified map pins | Geometry guard | No placeholder coordinates |
| T4.4 | Label demos/simulations | Persistent demo and academic disclaimers | No official wording |
| T4.5 | Verify offline behavior | Cache only safe, classified data | No stale official claim; test offline |

### Phase 5 — Chatbot Retrieval and Grounding

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T5.1 | Versioned approved corpus | DatasetVersion/RAG filters | Only active validated docs |
| T5.2 | Embedding compatibility | Provider/model metadata and mixed-model rejection | Deterministic 1536-dim tests |
| T5.3 | Arabic retrieval | Normalization and bilingual corpus | Gold Arabic queries pass |
| T5.4 | Evidence prompt sandbox | Delimit evidence, resist injection | Injection tests pass |
| T5.5 | Citation correctness | Source/period/version metadata | No fabricated citation |
| T5.6 | Insufficient evidence refusal | Threshold and empty result behavior | Bilingual refusal tests |
| T5.7 | Free-model enforcement | `:free`, timeout, 429, 402 guards | Config and HTTP tests |
| T5.8 | Evaluation and observability | Gold set, latency/error/cost logs | $0 spend and repeatable report |

### Phase 6 — R2 and Official Dataset Intake

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T6.0 | Owner chooses source/geography | Decision register and licence evidence | No ingestion before approval |
| T6.1 | Verify R2 connection | Non-production bucket probe | Upload/download/checksum pass |
| T6.2 | Ingest candidate object | Record metadata, checksum, lineage | Reproducible validation report |
| T6.3 | Validate schema/quality | Quarantine drift/missingness | Failed inputs never activate |
| T6.4 | Approve and activate version | Two-step approval and audit trail | Active version visible in API |
| T6.5 | Roll back/supersede | Revert active pointer, retain audit | Previous version restores safely |

### Phase 7 — ML and Forecast Integrity

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T7.1 | Reproduce training inputs | Dataset version and split manifest | No leakage |
| T7.2 | Evaluate temporal generalization | Out-of-sample metrics | Report distinguishes reconstruction/forecast |
| T7.3 | Classify forecast outputs | Simulated/experimental/official fields | UI/API disclaimers present |
| T7.4 | Validate recommendations | Explain heuristic/empirical status | No unsupported policy claim |
| T7.5 | Regression numerical correctness | Existing verification script and tests | Exact thresholds pass |

### Phase 8 — Map and Geographic Integrity

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T8.1 | Map official codes/geometry | Approved boundary source | Geometry validates and renders |
| T8.2 | Reconcile regional metrics | Join by stable codes | No fictional/incorrect pin |
| T8.3 | Device/map UX regression | Arabic/English map and no-data states | Emulator/device evidence |

### Phase 9 — Staging Reconciliation and Deployment

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T9.1 | Reconcile local vs deployed SHA | Build manifest and API health | Exact artifact identified |
| T9.2 | Apply staging migrations | Owner-approved migration plan | Backup, apply, verify, rollback evidence |
| T9.3 | Configure staging secrets | Heroku env only | No secrets in repo/logs |
| T9.4 | Run backend contract/RBAC suite | Staging endpoint and DB | All required cases pass |
| T9.5 | Run Flutter staging build | `flutter build apk ... staging` | Installable artifact and URL guard |
| T9.6 | Verify observability/recovery | Logs, health, rollback runbook | Owner accepts recovery procedure |

### Phase 10 — End-to-End and Release Verification

| Task | Problem / evidence | Implementation and tests | Acceptance / rollback / owner |
|---|---|---|---|
| T10.1 | Full screen/data lineage sweep | 18 routes, EN/AR, 20 areas | Evidence per surface |
| T10.2 | Auth/device/notification acceptance | Real device and FCM where supported | Known limitations documented |
| T10.3 | Security/cost/release gate | Secret scan, paid-model scan, builds | Zero-cost and security gates pass |
| T10.4 | Defense/release signoff | Package evidence and unresolved risks | Owner signs final DoD; rollback artifact retained |

## 10. Parallelization strategy

**Stream A (data):** T0.1-T0.2, T1.1-T1.6, T6.0-T6.5, T8.1-T8.2.  
**Stream B (security):** T2.1-T2.8, T1.7, T5.4, T5.7.  
**Stream C (Flutter):** T3.1-T3.6, T4.1-T4.5, T8.3.  
**Stream D (AI/ML):** T5.1-T5.8, T7.1-T7.5.  
**Stream E (operations):** T9.1-T9.6, then T10.1-T10.4.

Shared Prisma schema/migration edits are serialized: one owner prepares, another reviews, and
staging applies only after backup/rollback approval. Flutter contract changes require synchronized
API examples and tests. The critical path is T0 -> T1.1/T6.0 -> T6.1-T6.5 -> T1.3/T1.6 ->
T2.8 -> T9 -> T10.

## 11. Acceptance test matrix

The 20 required verification areas are:

1. repository baseline and secret safety; 2. build reproducibility; 3. API health/readiness;
4. PostgreSQL migration/persistence; 5. dataset metadata and provenance; 6. dataset validation;
7. activation/rollback; 8. endpoint response contracts; 9. RBAC/tenant isolation;
10. Google token audience/subject validation; 11. session refresh/reuse/logout;
12. real Android auth; 13. startup/splash/API URL; 14. bilingual/RTL/accessibility;
15. no-dataset/empty/error states; 16. map geometry and regional joins; 17. ML leakage and
forecast classification; 18. RAG retrieval/Arabic/citations/refusal; 19. zero-cost/timeout/429/402
guards; 20. full staging E2E, observability, rollback, and release signoff.

## 12. Owner decisions and external blockers

- Select the real country, region names, administrative level, codes, and boundary source.
- Supply an approved, reusable dataset and licence/permission evidence.
- Provide non-production R2 bucket and safe credentials through the deployment secret manager.
- Provide staging PostgreSQL access and approve migration/backup/rollback execution.
- Register Android SHA-1/package in Firebase and provide device access for real Google sign-in.
- Confirm Heroku app/environment strategy, observability owner, and recovery owner.
- Approve any source whose licence, redistribution, or automated-access terms are ambiguous.
- Approve release signing keys, iOS/APNs materials, and final graduation evidence scope.

## 13. Final definition of done

- All P0 blockers have owner decisions and reproducible evidence.
- No production surface presents synthetic, simulated, or experimental data as official.
- Every displayed number has a traceable source, version, period, classification, and formula.
- PostgreSQL is canonical; R2 is governed object storage; no competing source of truth exists.
- Dataset lifecycle, licensing, validation, activation, and rollback are tested in staging.
- Auth is audience-validated, session-secure, device-verified, and protected-route tested.
- Flutter startup, auth, RTL, accessibility, error, empty, offline, and map states are verified.
- RAG is authorization-filtered, version-filtered, bilingual-evaluated, citation-grounded, and
  refuses unsupported questions.
- All AI operation remains $0.00 under the permanent zero-cost policy.
- Backend, Flutter, ML, contract, security, and end-to-end acceptance evidence is current.
- Staging artifact SHA matches the reviewed source; secrets are external; rollback is executable.
- The Status tracker names the exact next task after every meaningful session.

## Documentation cleanup record

**Retained:** `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `.github/` templates, `docs/api_contract.md`,
`docs/design_system.md`, `docs/team/github_collaboration.md`, `backend/README.md`, `env/README.md`,
architecture docs, audit docs, `docs/phase_d_official_data_roadmap.md`, `docs/flutter_closeout_plan.md`,
`docs/PROJECT_MASTER_STATUS.md`, `docs/DECIDIX_END_TO_END_QA_REPORT.md`, and operational docs.

**Consolidated:** facts from `docs/PROJECT_MASTER_STATUS.md`, `decidix_execution_tracker.md`,
`.agents/E8_STATE.md`, `docs/api_contract.md`, the Phase D roadmap, QA report, and audit/architecture
documents are cross-linked here and in the live Status tracker. No source document was deleted.

**Removed:** none. The referenced older `DECIDIX_PHASE_*` files are absent, not deleted by this task.

**Ambiguous and intentionally retained:** all existing phase, audit, architecture, deployment,
contributor, and platform README files. Their unique evidence and links require owner review before
any future deletion.

## Execution update — 2026-11-04 (core recovery Phase 0–4)

Audit result: the dataset pipeline and analytical reads are wired end to end in code, but version
coexistence is blocked by global region/indicator keys and a version-agnostic regional-metric unique
constraint. Four defects were fixed in this pass: overview read across versions, seed backfill in a
verified response, checksum-only dataset validation, and activation before ingestion.

Exact local evidence: backend build exit 0; backend 208/208 tests across 15 files; Flutter analyze 0
issues; Flutter 222 passed / 2 skipped; `git diff --check` exit 0.

Phase status is unchanged for 6, 9 and 10: no approved official dataset, no live PostgreSQL or R2
evidence, and no deployment. Phase 1/2 remain BLOCKED on the schema decision recorded in
`docs/DECIDIX_VERSIONED_DATA_ARCHITECTURE_PROPOSAL.md`.

### Versioned-model proof pass (2026-11-04)

The model is now finalized (proposal §15, v2 corrections) and a runnable proof harness exists at
`backend/prisma/proof/` with 24 assertions covering A→B→A, invalid activation, duplicate observations,
cross-version isolation, concurrent activation, transaction rollback, and provenance retention.

**The proof has not been executed.** No PostgreSQL server, client, or container runtime exists on
the development host, so no database result is claimed and the migration plan
(`docs/DECIDIX_VERSIONED_MIGRATION_PLAN.md`) remains design-only. Execution order from here:

1. Owner provisions a disposable `decidix_proof_*` database and runs `run_proof.mjs`; record the
   exact output and server version in `docs/DECIDIX_RECOVERY_STATUS.md`.
2. On green, draft the M1 additive migration for review (tables, FKs, `NOT VALID` constraints,
   concurrent indexes).
3. Then M2 dual write in `DatasetService`, M3 backfill with quarantine, M4 read switch per
   repository, M5 contract only after a staging A→B→A rehearsal.

### Batch 1 execution update (2026-11-05)

This supersedes the "proof has not been executed" wording above: the M1 proof ran on
2026-11-05 (24/24) and the M1 rehearsal currently passes 304/304 on PostgreSQL 18.6.

Batch 1 (local database foundation) is complete: `decidix_dev` was provisioned with a
least-privilege `decidix_app` role, all 10 standard migrations applied, the M1-only schema
declarations removed (fixing `P2022`), the seed executed, and real Backend database
connectivity plus the login/refresh/logout session workflow verified. Build 0, Prisma
validate/generate 0, 230/230 backend tests, `git diff --check` 0. M2–M5 remain deliberately
unstarted; the graduation MVP does not require them. Exact evidence:
`docs/DECIDIX_RECOVERY_STATUS.md` §Batch 1.

### Batch 2 execution update (2026-11-05)

Batch 2 (dataset bootstrap) is complete locally: `datasets/processed/curated_regional_development.csv`
(84 rows, 12 regions, 2019–2025, classified `synthetic_demo`) was normalised by
`backend/src/scripts/bootstrap-dataset.ts` and ingested through the existing
`DatasetService.validate → ingest → activate` pipeline. Version `ds_demo_curated_2025_v1` is
validated/ingested/active with 12 regions, 18 indicators, 7 history rows and 1,512 metrics.
`/v1/datasets/active`, `/v1/overview`, `/v1/regions`, `/v1/insights/historical`,
`/v1/insights/priority` and `/v1/insights/data-quality` all return dataset-backed 200 responses.
A new real-PostgreSQL integration suite passes 3/3; the unit suite remains 230/230. R2 is still
unconfigured and the Flutter upload screen does not exist. Batch 3 (analytical correctness:
empty overview KPIs, mixed-unit sector index, map geometry decision, forecast/M-L provenance,
legacy NULL-version rows) is next. Exact evidence: `docs/DECIDIX_RECOVERY_STATUS.md` §Batch 2.

### Batch 3 execution update (2026-11-05)

Analytics correctness and ML provenance are complete locally. Overview now computes five KPIs from
active-version rows; sector scores use direction-aware min-max normalisation instead of averaging
mixed units (education 40.4 vs a raw mean of ~60.3); score definitions and provenance semantics
(`data_classification` for results, `source_classification` for sources, derived `is_official`) are
documented. Legacy unversioned rows are excluded by every verified query and proven harmless by a
PostgreSQL test.

The ML path no longer uses hardcoded actuals: actuals come from `national_index_history`, and an
explainable OLS trend model (trained 2019–2023, holdout 2024–2025: MAE 0.210 / RMSE 0.216) writes
version-linked experimental forecasts for 2026–2030. Migration
`20261105140000_add_forecast_dataset_version` was tested on a disposable database and applied
locally; the API publishes no R² and marks evaluation unavailable. Gates: build 0, unit 235/235,
real-PostgreSQL integration 8/8, Flutter 222 passed / 2 skipped, Python 4/4,
`git diff --check` 0. Batch 4 (chatbot grounding) is next; map geometry and upload UI remain open.
Exact evidence: `docs/DECIDIX_RECOVERY_STATUS.md` §Batch 3.

### Final integration and deployment update (2026-11-05)

Staging deployment is complete and verified: `decidix-backend-staging` now runs **`81e8ab4`**
(release v10), with all **11 migrations** applied after a fresh backup (`b005`). Endpoints verified
live: health connected, overview fail-closed with `DATASET_NOT_CONNECTED`, anonymous dataset route
401, invalid login 401, Google 503 `GOOGLE_CONFIG_MISSING`. Staging has no active dataset, so the
demonstrable end-to-end data flow is local.

Chatbot grounding is implemented (structured active-version evidence + RAG) and verified with seven
controlled questions, including a refusal and a prompt-injection attempt. A real free-model call
succeeded once; remaining calls hit free-tier 429 and used the grounded deterministic fallback.
Flutter email/password login was added; analyze is clean and 222 tests pass. A release APK was built
(61.6 MB, SHA-256 `068DAFA1…`, `com.decidixteam.app`, `1.0.0+1`), but no device was attached.

Remaining external blockers: R2 credentials/bucket and the Flutter upload UI, Google OAuth staging
configuration, a staging demo dataset with a known password, and a physical Android device. No
production deployment, no force-push, no database reset, and no paid service was used.
