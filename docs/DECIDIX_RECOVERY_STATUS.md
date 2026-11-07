# Decidix Recovery Status

**Last updated:** 2026-11-06  
**Branch:** `recovery/stabilization`  
**Canonical roadmap:** [DECIDIX_RECOVERY_MASTER_PLAN.md](./DECIDIX_RECOVERY_MASTER_PLAN.md)  
**Current phase:** Phase 6 — Cloudflare R2 Storage & Dataset Governance (Storage & Upload Pipeline Completed)  
**Current task:** T6.4 — Android Release APK Staging Build & On-Device Deployment Verified  
**Last verified checkpoint:** 2026-11-06 Android Release APK built with AGP 9 built-in Kotlin (`0FB20A6665FE409A25701215A503FCA11973DD62A93B3A27ABED30EDFF51D7E0`); installed and running on physical device CPH2579 (Android 15, API 35); Flutter analyze 0 issues, Flutter test suite 228/228 passed; Deployed Staging APIs verified 10/10 checks passing.

## Google Sign-In failure — root cause and fix — 2026-11-06

Task: the app reported `Backend token verification failed: DioException [unknown]: null — Invalid
argument(s): No host specified in URI /auth/google`.

Two independent faults, both fixed:

1. **Client (the reported error).** `env/dev.json` is `USE_MOCK: true` with no `API_BASE_URL`, and
   `apiClientProvider` only validated the address when mock was off. `ApiClient` therefore had
   `baseUrl: ''`; screens worked from `MockTransport`, but Google sign-in is the one path that always
   calls the backend, so `post('/auth/google')` produced a host-less URI.
2. **Staging config (the next failure).** The app had no Google audience: `heroku config -s` on
   `decidix-backend-staging` had no `GOOGLE_WEB_CLIENT_ID`/`GOOGLE_CLIENT_ID`, and `POST /v1/auth/google`
   returned `503 GOOGLE_CONFIG_MISSING` (also in Heroku logs).

Changes: `ApiClient.requireAbsoluteBaseUrl` (absolute http(s) with host, enforced whenever the client
builds its own transport and unconditionally in `apiClientProvider`); auth pre-flight checks in
`signInWithGoogle`/`signInWithPassword` so configuration problems are reported before the account picker;
`GOOGLE_CONFIG_MISSING` mapped to an explicit message; `GOOGLE_WEB_CLIENT_ID` set on Heroku (release v14)
using the public Web client ID already in `env/staging.json`.

Evidence: `flutter analyze` 0 issues; `flutter test test/auth_test.dart test/auth_refresh_test.dart
test/api/transport_choice_test.dart test/api/dio_transport_test.dart` → **43 passed** (5 new regression
tests). Deployed probe with an invalid token moved `503 GOOGLE_CONFIG_MISSING` → `401 INVALID_GOOGLE_TOKEN`.

Not verified: a real Google ID-token exchange on the emulator (needs a Play Services account plus the
app SHA-1 registered in the Google Cloud project). Emulator evidence of the new error message pending.
Related open P0: the router still has no auth guard, so the app opens on the dashboard signed out and the
login screen is only reachable through the Account sheet.

## Android Release APK Build & Physical Device Deployment — 2026-11-06

- **Root Cause & Compatibility:** Flutter 3.47.6, AGP 9.1.0, Gradle 9.3.1, Kotlin 2.4.0, `file_picker` 11.0.3. In AGP 9+, `file_picker` conditionally skips legacy `org.jetbrains.kotlin.android` plugin application. The project previously retained `android.builtInKotlin=false`, leaving Kotlin compilation disabled. Enabled AGP 9 built-in Kotlin (`android.builtInKotlin=true` in `android/gradle.properties`) while preserving `android.newDsl=false`.
- **Release APK:** Built against `env/staging.json` (`API_BASE_URL=https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1`, mock disabled). Checksum: `0FB20A6665FE409A25701215A503FCA11973DD62A93B3A27ABED30EDFF51D7E0`.
- **Physical Device Installation & Execution:** Successfully installed on connected physical device `CPH2579` (Serial: `RGDMWWIJFQ4HPV8P`, Android 15 / API 35) via `adb install -r`. App launched with `com.decidixteam.app/.MainActivity` (PID 2589), verified running cleanly without startup exceptions.
- **Quality Gates:** `flutter analyze` 0 issues; `flutter test` 228 passed / 2 skipped; Staging APIs 10/10 verified.

## CSV dataset upload compatibility — 2026-11-06

The upload screen accepted `.csv` while `DatasetService.validate` required the canonical JSON envelope, so
every raw CSV failed with `CANONICAL_DATASET_REQUIRED`. Both formats now converge on the same envelope and
therefore on the same validation/ingestion/activation implementation; no second ingestion path was added.

- **New normalizer** (`backend/src/services/dataset_csv.ts`): converts the documented Decidix CSV template
  (metadata preamble + `region_id … value` observations) into the canonical payload. It performs no database
  or storage access.
- **One pipeline** (`backend/src/services/dataset.service.ts`): `parseDataset` routes `csv` through the
  normalizer; the JSON branch is unchanged. A parse failure now marks the version `invalid` instead of leaving
  it in `uploaded` — this also closes the same gap for malformed JSON.
- **Strict, explicit rules** (no guessed columns, regions, units or periods): template marker and required
  metadata keys; exact header (missing columns rejected, unknown columns rejected); one row per
  region × indicator × year carrying its own region and indicator definition; allowed units (`percent`,
  `per_mille`, `per_thousand`, `score_100`, `years`, `usd`, `pupils_per_teacher`, `count`) and domains;
  per-unit range checks; duplicate-observation rejection; conflicting region or indicator definitions
  rejected; every region must have a `development_index` observation for every year present in the file.
- **Documented derivations only:** region `score` is the latest-year `development_index`, `change` is versus
  the previous year, `rank` orders by score, `priority` follows terciles, and the national index is the
  unweighted mean per year with the fixed band thresholds and the existing "mean − 3 points" at-risk rule.
  No observation, publisher, licence or official claim is invented; classification stays a form/API field.
- **Flutter** (`lib/features/datasets/presentation/screens/dataset_upload_screen.dart`): the file card states
  that CSV must follow the template, a "View CSV template" dialog shows the exact preamble and header with a
  copy action (Arabic equivalent included), and CSV error codes are mapped to actionable messages. Progress
  and error states are unchanged.

Validation evidence: backend unit **20 files / 269 tests** (21 new CSV cases: valid conversion,
missing/unknown columns, missing metadata, invalid unit/domain, unknown region/indicator, duplicate
observations, conflicting definitions and regions, out-of-range and non-numeric values, empty cells, required
and incomplete `development_index`, CSV↔canonical-JSON equivalence, unchanged JSON behaviour); real-PostgreSQL
integration **3 files / 10 tests** (CSV normalizes → validates → ingests → activates with 2 regions,
2 indicators, 2 history rows and 8 metrics, and an invalid CSV is marked `invalid` while the active version is
preserved, then the fixture is removed and the previous version re-activated); backend build exit 0; Flutter
`analyze` 0 issues; full Flutter suite **228 passed / 2 skipped** including **6 upload widget tests**;
`git diff --check` 0.

Not verified: the Flutter upload flow has still not been driven on a device or browser in this session.

## Cloudflare R2 real connection & upload verification — 2026-11-06

Objective: finish the real Cloudflare integration for the already-implemented upload feature and prove the
actual path. No upload feature, R2 service, migration, deployment, or staging secret was changed.

### Evidence by capability (exact distinctions)

1. **Wrangler authenticated:** YES. `wrangler` 4.158.0 (pre-installed, not upgraded); `wrangler whoami` shows
a single OAuth account `806347af0627a1cbb814172a14ce952c`.
2. **Existing bucket discovered:** YES. `wrangler r2 bucket list` returns exactly one bucket, `decidcix`
(spelling confirmed from the CLI, not from the screenshot). No bucket was created, renamed, or deleted.
3. **Bucket settings verified:** YES, and hardened. `bucket info`: location `WEUR`, `Standard`, created
2026-11-04, empty. The public `r2.dev` development URL was **enabled** and was disabled on 2026-11-06
(`dev-url disable`), then re-read to confirm. The bucket is private; no custom domain exists.
4. **CORS verified or updated:** VERIFIED, not updated. The bucket has no CORS configuration (API code
`10059`). Native Android/iOS does not enforce CORS and the documented verification path is native, so no
policy was added. A minimal single-origin PUT policy is documented for Chrome-based uploads
(`docs/deployment/cloudflare_r2_setup.md` §3.1); `AllowedOrigins: ["*"]` was explicitly rejected.
5. **Wrangler object upload/download verified:** YES. A unique key `__decidix_verification__/<run-id>/r2-probe.txt`
was written with `--remote`, downloaded, and byte-compared: SHA-256 `79cb76d0…cda5c7` matched on both
sides. The exact key was then deleted and a follow-up `object get` returned "The specified key does not
exist". Temporary local files were removed. No pre-existing object was touched (the bucket was empty).
6. **Backend S3 credentials available:** YES, and valid. Presence-only inspection of git-ignored
`backend/.env` shows `R2_ACCESS_KEY_ID` (32 chars), `R2_SECRET_ACCESS_KEY` (64 chars) and a correct
`R2_ENDPOINT` for the same account. Wrangler OAuth was **not** treated as S3 credentials.
7. **Backend `r2:verify` passed:** YES, with run-time overrides. The file still contains the placeholder
`R2_BUCKET_NAME=your_bucket_name` and has no `R2_ACCOUNT_ID`, so the command was run as
`R2_ACCOUNT_ID=… R2_BUCKET_NAME=decidcix npm run r2:verify` → `configured=true`, `BUCKET_ACCESS=success`,
`upload/download/checksum=success`, `TEST_OBJECT_CLEANUP=success`, exit 0. `backend/.env` was **not**
modified; until the owner adds those two lines the API returns 503 `STORAGE_CONFIG_MISSING` on upload
initiation.
8. **Full Flutter → R2 → DatasetService → PostgreSQL workflow:** PARTIALLY verified. The complete backend
chain was executed over real HTTP against the real bucket and `decidix_dev` (initiate 200, presigned PUT
200, R2 object present, complete 200, validate 200, ingest 200, activate 200, `/v1/overview` served the new
version with `index 77`/2 regions, rollback 200 restoring `index 94.9`/12 regions). The Flutter UI itself
was **not** driven on a device or browser in this session, so the client half of that path remains
`IMPLEMENTED_UNVERIFIED` on device.

### Findings

- **Configuration gap (owner action, no secret involved):** add `R2_ACCOUNT_ID=806347af0627a1cbb814172a14ce952c`
and set `R2_BUCKET_NAME=decidcix` in `backend/.env`; `R2_PUBLIC_URL` points at the now-disabled `r2.dev` URL
and is never read by code, so it can be cleared.
- **CSV contract gap — resolved later the same day:** `POST /v1/datasets/:id/validate` used to require the
canonical envelope and reject every raw `.csv` with `CANONICAL_DATASET_REQUIRED`. The strict Decidix CSV
template now normalizes into that same envelope (see the CSV compatibility section above).
- **Staging:** `decidix-backend-staging` has **no** `R2_*` variables (presence-only check, 14 vars total).
Required names for a later authorized step: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET_NAME`. Nothing was set, rotated, deployed, or released.
- **Operational note:** `wrangler r2 bucket info` reports a lagging `object_count`; always confirm deletion of a
test key with an explicit `object get`.

### Test-object hygiene performed

Only the exact probe artifacts of this run were removed: the unique `__decidix_verification__/<run-id>` probe
object, the `datasets/<probe-version>/decidix_e2e_probe_<run-id>.json` upload object (deleted and confirmed
absent), and the probe dataset version plus its version-scoped rows (`regionalMetric=2`,
`nationalIndexHistory=1`, `indicator=1`, `region=2`, `datasetMetadata=1`, `datasetRecord=1`,
`datasetVersion=1`). Afterwards `decidix_dev` held exactly one dataset version again
(`ds_demo_curated_2025_v1`, active, `validated`) with 12 regions, 1,512 regional metrics and 5 users intact;
no user, session, or pre-existing dataset record was modified.

### Documentation

`docs/deployment/cloudflare_r2_setup.md` was rewritten (v2.0.0) to record the verified bucket and account,
the private-access hardening, the Wrangler/S3 separation, the exact verification commands and results, the
run-time-override evidence, the Heroku variable names, the CSV gap, and the owner upload/rollback steps.

## Object storage & dataset upload completion — 2026-11-05

Completed and verified the end-to-end dataset upload lifecycle and Cloudflare R2 integration:

1. **Backend Cloudflare R2 Integration Hardening (`backend/src/integrations/r2.service.ts`):**
   - Implemented strict configuration status inspection with placeholder detection (`isPlaceholder`).
   - Gracefully reports unconfigured state with HTTP 503 `STORAGE_CONFIG_MISSING` and clear diagnostic logging without leaking secrets or credentials.
   - Automatically derives the S3 endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` when `R2_ENDPOINT` is omitted.
   - S3 operations (`createPresignedUploadUrl`, `headObject`, `downloadObject`, `deleteObject`, `verifyChecksum`) are hardened with 15-minute presigned PUT URL generation and private bucket access enforcement.
   - Never logs presigned URLs, credentials, or complete credential-bearing URLs.

2. **Backend Dataset Upload Lifecycle & Safety (`backend/src/services/dataset.service.ts`, `backend/src/modules/datasets/datasets.router.ts`):**
   - **Upload Initiation (`/v1/datasets/uploads/initiate`):** Validates format (`.csv`, `.json`), file size limit (25 MB max), sanitizes filenames, and generates unique versioned object keys (`datasets/<version>/<filename>`).
   - **Upload Completion (`/v1/datasets/:id/complete`):** Enforces existence verification (`headObject`), content type validation, file size matching, and downloads the object to compute and verify the SHA-256 checksum. Supports idempotent completion retries.
   - **Canonical Validation (`/v1/datasets/:id/validate`):** Enforces canonical schema (`regions`, `indicators`, `national_index_history`, `regional_metrics`, `metadata`), range checks, and referential integrity. Marks dataset `invalid` if corrupted, preserving the active dataset untouched.
   - **Canonical Ingestion (`/v1/datasets/:id/ingest`):** Atomic PostgreSQL transaction writing raw records, version-mapped metadata, regions, indicators, national history, regional metrics, sector breakdowns, recommendations, and RAG documents. Pre-flight checks prevent cross-version collisions.
   - **Atomic Activation Safety (`/v1/datasets/:id/activate`):** Verifies that the dataset version is validated and fully ingested before activation. Atomically switches `isActive: true` in one transaction. If validation, ingestion, or activation fails, the previously active dataset version remains completely untouched.
   - **Authorization Hardening:** All dataset modification endpoints require authenticated `admin` or `analyst` role (`requireRole('admin', 'analyst')`). Anonymous calls return 401; viewers return 403 `ROLE_NOT_AUTHORIZED`.

3. **Flutter Dataset Upload Interface (`lib/features/datasets/presentation/screens/dataset_upload_screen.dart`):**
   - Complete upload screen integrated into the application design system (`AppColors`, `AppTypography`, `AppRadius`).
   - File picker supporting custom `.csv` and `.json` files, displaying selected filename, formatted file size, and replace/remove controls.
   - Comprehensive metadata form: Dataset name, Source/publisher, Source URL/reference, License, Geographic/temporal coverage, Methodology notes, and Classification.
   - **Honest Provenance & Synthetic Disclaimer:** Clear visual distinctions and warning badges for `Synthetic Demo Data` vs `Official Data` and `Third-Party Licensed Data`.
   - **Metadata Review Card:** Summarizes all metadata before submission.
   - **9 Real Progress States:** File Selected, Preparing, Authorizing, Uploading to R2 with live progress % and progress bar, Verifying stored file, Validating dataset, Ingesting records, Activating dataset, and Completed.
   - **Safe Error & Retry Handling:** Informative error descriptions with technical codes; dynamic "Retry upload" action.
   - **Navigation & RBAC:** Accessible via Data Quality screen ("إدارة مجموعات البيانات") and the AppShell Account bottom sheet for admin/analyst users. UI disables upload button and presents notice for unauthorized roles.
   - Full bilingual support (Arabic RTL and English LTR).

4. **Testing Evidence:**
   - Backend unit suite: 19 test files, 247 tests passed (Vitest hermetic suite).
   - Backend real PostgreSQL integration suite: 2 test files, 8 tests passed against `decidix_dev`.
   - Backend build: `prisma generate && tsc` exited with code 0.
   - Flutter analysis: `flutter analyze` passed with 0 issues.
   - Flutter test suite: 226 tests passed (2 skipped).
   - Dataset upload widget tests: 4 tests passed covering RBAC, synthetic classification, admin form fields, and Arabic RTL.
   - `git diff --check` clean (0 errors).

5. **Operational Runbook & Credentials Readiness:**
   - Created `docs/deployment/cloudflare_r2_setup.md` detailing exact environment variable names, formats, Cloudflare dashboard navigation, private bucket requirements, required CORS rules, and the `npm run r2:verify` execution procedure.
   - Updated `docs/deployment/environment_variables.md` with R2 configuration inventory.

## Versioned data architecture proposal — 2026-11-04

Created a proposal-only architecture for stable geography/indicator references and immutable
DatasetVersion-owned observations, derived outputs, forecasts, and RAG lineage. The proposal
covers ERD, Prisma model direction, additive migration sequencing, legacy-row quarantine,
active-version activation/rollback, exact repository predicates, constraints, risks, and
PostgreSQL integration tests. No application code, migration, database, deployment, or live
environment was changed. PostgreSQL integration remains untested and Phases 9 and 10 remain
blocked pending owner approval.

## Dataset lineage architecture review — 2026-11-04

`DatasetService.ingest` now requires a structured canonical payload and transactionally writes
the raw `DatasetRecord`, `DatasetMetadata`, version-mapped regions, indicators, national history,
regional metrics, sector breakdowns, recommendations, and version-matched RAG documents. The
ingestion validator requires source, licence, geography, time coverage, quality, and referential
metadata; malformed or incomplete payloads fail before writes. Canonical region/indicator keys
already assigned to another dataset version are rejected rather than overwritten.

This is locally implemented but not complete dataset integration evidence. `Region.id` and
`Indicator.key` remain global primary keys, and `RegionalMetric` retains a global
`(region_id, indicator_key, year)` uniqueness constraint. Therefore two dataset versions cannot
coexist for the same canonical geography/indicator key, and an actual PostgreSQL A/B switching
proof is still blocked until the owner approves a stable-reference/versioned-observation schema
and additive migration. No live database was changed.

## P0 authentication integration hardening — 2026-11-04

Implemented locally:

- Flutter real-mode requests now send the actual `Authorization: Bearer <access-token>` header.
- A single in-flight refresh operation handles concurrent 401 responses at the HTTP client; each
  eligible request is retried at most once, while authentication endpoints are excluded from retry.
  `AuthNotifier.refreshSession()` shares one in-flight rotation as well, because refresh tokens are
  single-use and presenting the same one twice is treated by the backend as reuse (it then revokes
  every session for the user).
- A failed refresh clears the persisted user and both tokens best-effort, so one failing store cannot
  leave a session restorable, and an unusable session never stays surfaced as authenticated.
- Persisted sessions require both access and refresh tokens at startup and immediately rotate them
  through `/auth/refresh`; failed restoration clears persisted credentials.
- Backend Google verification now preserves explicit `GOOGLE_CONFIG_MISSING` errors and reads the
  validated environment configuration.
- Backend in-memory users and sessions are now restricted to `NODE_ENV=test`; non-test database
  outages return `AUTH_DATABASE_UNAVAILABLE` instead of authenticating against memory.
- Google verification failures are classified instead of collapsed into one answer: a missing
  verification library or unset audience reports `GOOGLE_CONFIG_MISSING` (500), an unreachable
  verifier reports `GOOGLE_VERIFICATION_UNAVAILABLE` (503), and only a genuinely rejected token
  reports `INVALID_GOOGLE_TOKEN` (401).

Coordination trace: the startup path (`build()` → `_loadPersistedSession()` → `refreshSession()`) and the
401 path (`ApiClient.onError` → injected `refreshAccessToken` → `AuthNotifier.refreshSession()`) both
converge on the same `_refreshInFlight` future, because the client coordinator only awaits the
notifier's rotation and never posts `/auth/refresh` itself. The regression test starts both paths
concurrently against a real `ApiClient` and observes one refresh request, one retry carrying the
rotated token, and rotated access and refresh tokens already persisted before the retry.

Validation evidence: `flutter test test/api/dio_transport_test.dart` passed (18 tests);
`flutter analyze` passed with 0 issues; `backend` `npm run build` exited 0; `backend` `npm test`
exited 0 with 11 files and 185 tests passed; `flutter test` exited 0 with 216 passed and 2
skipped. `flutter test test/auth_refresh_test.dart` passed 4 tests (failed refresh clears the session;
concurrent callers share one rotation; restoration and a 401 retry share exactly one request; no stored token makes no request). `git diff --check` exited 0.

Boundary of that evidence: the above is code-level and local. Real Google OAuth token exchange,
physical-device sign-in, live session persistence across app restarts, and staging HTTP verification
are NOT verified, so Phase 2 and Phase 10 remain BLOCKED.


Validation note: `npm test -- --runInBand` is not a valid Vitest invocation (exit 1); the
supported `npm test` command is the one reported above. No local PostgreSQL A/B test is claimed,
because the required isolated database evidence is not available.

## Phase status

| Phase | Status | Actual acceptance state |
|---|---|---|
| Phase 0 | VERIFIED_LOCAL | Baseline and preservation evidence exist; no destructive action was taken. |
| Phase 1 | BLOCKED | Local guards exist, but geography, live PostgreSQL, dataset lineage, and live contracts are unverified. |
| Phase 2 | BLOCKED | Automated auth safeguards exist, but real Google sign-in, live persistence, and staging negative tests are unverified. |
| Phase 3 | IMPLEMENTED_UNVERIFIED | Local Flutter checks pass; device startup, session, and accessibility evidence is missing. |
| Phase 4 | IMPLEMENTED_UNVERIFIED | Local guards and labels exist; live no-dataset and device/offline acceptance is missing. |
| Phase 5 | IMPLEMENTED_UNVERIFIED | Local RAG and zero-cost tests exist; no approved live corpus or bilingual gold evaluation is available. |
| Phase 6 | VERIFIED_LOCAL | Real private R2 bucket `decidcix` connected (public URL disabled), Wrangler and backend S3 round-trips passed, and the full upload→R2→validate→ingest→activate→overview flow passed with rollback; Flutter client half and staging R2 config remain unverified. |
| Phase 7 | IMPLEMENTED_UNVERIFIED | Local ML reproduction passes; approved-data temporal validation and staging numerical reconciliation are missing. |
| Phase 8 | BLOCKED | Official codes/geometry and device map acceptance are missing. |
| Phase 9 | BLOCKED | Release package and migration review are prepared, but deployment, live migrations, secrets, and staging acceptance are not authorized or verified. |
| Phase 10 | BLOCKED | End-to-end and release signoff cannot start until Phases 1, 2, 6, 8, and 9 P0 gates pass. |

`VERIFIED_LOCAL` means reproducible repository/test evidence only. `VERIFIED_STAGING` and
`VERIFIED_DEVICE` are intentionally absent because those acceptance gates have not passed.

## Progress table

| Task ID | Description | Priority | Status | Evidence | Blocker | Next step |
|---|---|---:|---|---|---|---|
| T0.1 | Baseline and safety capture | P0 | VERIFIED_LOCAL | HEAD `a4c5bbd...`, branch and dirty tree captured; `git diff --check` passed | No deployed-SHA evidence | Preserve baseline |
| T0.2 | Preserve remediation and secrets | P0 | VERIFIED_LOCAL | Dirty changes preserved; no reset/clean; release package contains no secrets | External secret/config review | Continue scoped work |
| T1.1 | Define canonical geography and codes | P0 | BLOCKED | Dataset guard/provenance code exists | Geography and approved dataset | Owner selects geography |
| T1.2 | Enforce dataset version guard | P0 | IMPLEMENTED_UNVERIFIED | Active validated version is required; new row-level foreign keys and exact-version query predicates cover analytical tables; 4 lineage tests pass | Deployed staging SHA/configuration and live migration execution | Reconcile and redeploy only with approval |
| T1.3 | Reconcile KPI/history origins | P1 | IMPLEMENTED_UNVERIFIED | Sector, historical, priority, quality, comparison, and recommendation paths require exact active-version mappings; missing mappings return unavailable; 184 backend tests pass | Approved dataset/live DB and staging response evidence | Verify each output against the approved dataset |
| T1.4 | Validate numeric semantics | P1 | IMPLEMENTED_UNVERIFIED | API contract defines raw numbers; numerical local data audit passed | Staging API still returns legacy forecast metrics | Reconcile deployed SHA |
| T1.5 | Verify PostgreSQL persistence | P0 | BLOCKED | Prisma schema/migrations exist | Staging DB access | Owner approves migration proof |
| T1.6 | Reconcile response contracts | P1 | BLOCKED | Historical QA recorded mismatches | Flutter/backend staging | Align and run contract tests |
| T1.7 | Verify authorization and tenant filtering | P1 | IMPLEMENTED_UNVERIFIED | Auth/repository tests exist | Live RBAC evidence | Run staging matrix |
| T2.1 | Configure Google audiences safely | P0 | IMPLEMENTED_UNVERIFIED | Env schema and E8 notes | Environment/device evidence | Verify each environment |
| T2.2 | Gate test identity paths | P0 | IMPLEMENTED_UNVERIFIED | Auth tests passed; code gates mock tokens to `NODE_ENV=test` | Staging negative test | Reject test tokens outside tests |
| T2.3 | Verify Google subject linking | P1 | IMPLEMENTED_UNVERIFIED | Google subject migration exists | Real token exchange | Test collision/link rules |
| T2.4 | Verify JWT/session rotation | P1 | IMPLEMENTED_UNVERIFIED | Session code/tests exist | Live persistence | Test replay/reuse |
| T2.5 | Verify refresh restoration | P1 | IMPLEMENTED_UNVERIFIED | Client/server lifecycle exists | Connected device | Restart and restore session |
| T2.6 | Verify logout/account switching | P1 | IMPLEMENTED_UNVERIFIED | Ownership checks exist | Device/staging | Test account isolation |
| T2.7 | Verify protected endpoints | P1 | IMPLEMENTED_UNVERIFIED | Middleware and tests exist | Staging users | Record 401/403 matrix |
| T2.8 | Complete real-device sign-in | P0 | BLOCKED | E8 says device disconnected | Firebase SHA-1/device | Register SHA-1 and run flow |
| T3.1 | Startup/API environment guard | P1 | VERIFIED_LOCAL | `flutter analyze` passed; Flutter suite passed | Device and deployed-config evidence | Preserve regression test |
| T3.2 | Native splash and startup state | P1 | IMPLEMENTED_UNVERIFIED | Current status records APK build | Device evidence | Verify first frame |
| T3.3 | Secure token storage/restoration | P1 | IMPLEMENTED_UNVERIFIED | Auth storage code exists | Device/live session | Run lifecycle tests |
| T3.4 | Auth error/loading/empty states | P1 | IMPLEMENTED_UNVERIFIED | Shared state views exist | Device/localization sweep | Run bilingual widget tests |
| T3.5 | Router protected-route behavior | P1 | IMPLEMENTED_UNVERIFIED | Router/auth integration exists | Device/deep links | Test redirect/logout |
| T3.6 | RTL/accessibility regression sweep | P1 | IMPLEMENTED_UNVERIFIED | Flutter tests/docs exist | Device matrix | Run current device sweep |
| T4.1 | Prevent synthetic production display | P0 | IMPLEMENTED_UNVERIFIED | Six seed-backed analytical paths and recommendations now use persisted records or DATASET_NOT_CONNECTED; local suite passed | Deployed staging SHA/configuration | Reconcile and redeploy only with approval |
| T4.2 | Bilingual unavailable states | P1 | IMPLEMENTED_UNVERIFIED | Shared error views exist | Device proof | Verify Arabic/English |
| T4.3 | Suppress unverified map pins | P0 | IMPLEMENTED_UNVERIFIED | Geometry guard exists | Official geometry | Verify no placeholder pins |
| T4.4 | Label demos/simulations | P1 | IMPLEMENTED_UNVERIFIED | Demo/simulation labels exist | Screen sweep | Check all surfaces |
| T4.5 | Verify offline behavior | P1 | NOT_STARTED | Prior QA claim needs reconciliation | Device/cache evidence | Run offline test |
| T5.1 | Versioned approved corpus | P1 | IMPLEMENTED_UNVERIFIED | RAG and analytical schema now carry dataset-version mappings; exact active-version filters are locally tested | Live corpus and migration execution | Ingest approved corpus |
| T5.2 | Embedding compatibility | P1 | IMPLEMENTED_UNVERIFIED | Deterministic embedding metadata exists | Mixed-model fixture | Run rejection test |
| T5.3 | Arabic retrieval | P1 | IMPLEMENTED_UNVERIFIED | Arabic normalization exists | Gold corpus | Build/run Arabic set |
| T5.4 | Evidence prompt sandbox | P1 | IMPLEMENTED_UNVERIFIED | Grounding prompt/tests exist | Live model call | Run injection tests |
| T5.5 | Citation correctness | P1 | IMPLEMENTED_UNVERIFIED | Citation format exists | Approved documents | Verify source/period/version |
| T5.6 | Insufficient evidence refusal | P1 | IMPLEMENTED_UNVERIFIED | Refusal path exists | Live dataset | Test empty/threshold cases |
| T5.7 | Free-model enforcement | P0 | VERIFIED_LOCAL | Backend auth/RAG tests passed; zero-cost config guards exercised | Live spend/config cannot be independently verified | Preserve allowlist and 402/429 tests |
| T5.8 | Evaluation and observability | P1 | NOT_STARTED | No gold report recorded | Approved corpus | Create repeatable report |
| T6.0 | Owner chooses source/geography | P0 | OWNER_ACTION_REQUIRED | Phase D roadmap lists preconditions | Owner decision | Record source/licence/geography |
| T6.1 | Verify R2 connection | P1 | VERIFIED_LOCAL | Real bucket `decidcix` (account `806347af…`): Wrangler put/get/checksum/delete passed and `npm run r2:verify` passed with run-time overrides | `backend/.env` still lacks `R2_ACCOUNT_ID` and has placeholder bucket; staging has no `R2_*` | Owner adds the two documented `.env` lines, then `npm run r2:verify` unmodified |
| T6.2 | Ingest candidate object | P1 | VERIFIED_LOCAL | Real presigned PUT to R2, object checksum matched stored `checksumSha256`, validate→ingest→activate→overview served the new version, rollback restored the previous one; CSV template now normalizes into the same canonical path and is covered by unit + real-PostgreSQL tests | Flutter UI not driven on device | Owner uploads a canonical JSON or template CSV from Flutter and confirms activation |
| T6.3 | Validate schema/quality | P1 | VERIFIED_LOCAL | Canonical dataset validation, quality range checks, and referential integrity verified; 247 backend unit tests + 8 real PG integration tests pass | None (local verified) | Maintained |
| T6.4 | Approve and activate version | P1 | VERIFIED_LOCAL | Atomic single-transaction activation verified; enforces that version is validated and fully ingested before activation | Staging DB approval | Maintained |
| T6.5 | Roll back/supersede | P1 | VERIFIED_LOCAL | Prior active version preserved across failed validation/ingestion/activation; safe rollback tested | None | Maintained |
| T7.1 | Reproduce training inputs | P1 | VERIFIED_LOCAL | Training smoke test passed; 60 train / 24 test records | Dataset is synthetic/current fixture | Repeat with approved dataset |
| T7.2 | Evaluate temporal generalization | P1 | IMPLEMENTED_UNVERIFIED | ML tests passed; training produced R² values | Official dataset and leakage review | Re-run on approved data |
| T7.3 | Classify forecast outputs | P1 | IMPLEMENTED_UNVERIFIED | API classification exists; Flutter tests passed | UI/staging proof | Verify disclaimers on device |
| T7.4 | Validate recommendations | P1 | IMPLEMENTED_UNVERIFIED | Recommendations require exact active-version rows and expose derived/unvalidated-method confidence classification; local tests pass | Approved recommendation methodology and staging data | Review recommendation claims |
| T7.5 | Regression numerical correctness | P1 | IMPLEMENTED_UNVERIFIED | Local dataset/math checks pass; script reaches staging mismatch assertion | Deployed staging returns legacy model R² values | Reconcile staging build/data |
| T8.1 | Map official codes/geometry | P0 | BLOCKED | Pin suppression exists | Owner geography | Obtain official geometry |
| T8.2 | Reconcile regional metrics | P1 | BLOCKED | Repository joins exist | Canonical codes/data | Test joins |
| T8.3 | Device/map UX regression | P1 | NOT_STARTED | Prior QA needs reconciliation | Connected device | Test map in both languages |
| T9.1 | Reconcile local vs deployed SHA | P0 | IMPLEMENTED_UNVERIFIED | Release package records reviewed source `a4c5bbd...`; live endpoint still serves legacy behavior, proving SHA/config drift | Heroku app/build access | Obtain deployed commit/build manifest |
| T9.2 | Apply staging migrations | P0 | BLOCKED | Migrations exist | Owner DB approval | Backup/apply/verify/rollback |
| T9.3 | Configure staging secrets | P0 | BLOCKED | Env examples exist | Owner secret manager | Configure without commits |
| T9.4 | Run backend contract/RBAC suite | P1 | IMPLEMENTED_UNVERIFIED | Read-only staging probe executed; 1/14 checks passed against deployed endpoint; no full authenticated matrix run | Reconciled staging build, users, and DB | Run contract/RBAC matrix after approval |
| T9.5 | Run Flutter staging build | P1 | VERIFIED_LOCAL | `flutter build apk --debug --dart-define-from-file=env/staging.json` passed | Device install and release signing unavailable | Install exact artifact when device returns |
| T9.6 | Verify observability/recovery | P1 | IMPLEMENTED_UNVERIFIED | Release package and runbooks prepared | Heroku owner and live logs | Exercise recovery after approved staging deployment |
| T10.1 | Full screen/data lineage sweep | P0 | IMPLEMENTED_UNVERIFIED | Lineage matrix and Flutter tests exist | Device/live official data | Capture current device evidence |
| T10.2 | Auth/device/notification acceptance | P0 | BLOCKED | FCM/device limitation recorded | Device/Firebase | Run real-device acceptance |
| T10.3 | Security/cost/release gate | P0 | IMPLEMENTED_UNVERIFIED | Local backend/Flutter/ML gates pass; staging probe failed 14/14 checks; no live spend/device evidence | Reconciled staging, secret, and device evidence | Re-run all gates after staging approval |
| T10.4 | Defense/release signoff | P0 | BLOCKED | Release package prepared; no end-to-end signoff evidence | Dataset/geography, DB/R2, Firebase/device, staging reconciliation | Owner supplies decisions and access |

## Checkpoint details

### Backend verification results

- Current reconciliation rerun: `npm --prefix backend test` passed with **180/180 tests**, exit 0,
  including six production-mode seed-elimination regressions.
- Current `npx prisma validate` from `backend` passed, exit 0. `npm --prefix backend run build`
  passed in the prior checkpoint.
- Test logs show PostgreSQL is unavailable locally and repositories use the in-memory fallback;
  this is test evidence, not live persistence evidence.
- Live PostgreSQL persistence and deployed-SHA reconciliation remain unverified.

### Flutter verification results

- Existing project status records `flutter analyze` clean and Flutter tests passing in the latest
  implementation pass; exact current rerun was intentionally not performed.
- Staging debug APK build was recorded as passing in the project status.
- Real Android Google authentication and full current screen sweep remain unverified.

### Android/device results

- A prior QA report records emulator exploration, but current E8 state says the connected Android
  device disconnected and `adb` was unavailable in the relevant session.
- Real Google Sign-In requires Firebase package/SHA-1 registration and a connected authorized device.

### Database/migration results

- Prisma schema validation passed and the ordered migration inventory was reviewed locally.
- [DECIDIX_STAGING_RELEASE_PACKAGE.md](DECIDIX_STAGING_RELEASE_PACKAGE.md) records the
  migration list, hashes, release commands, and backup/rollback gates.
- No live migration or production database operation was performed for this task.
- Staging apply/backup/rollback evidence is required before any `VERIFIED_STAGING` status.

### Authentication real-device status

`BLOCKED`: implementation and automated tests exist, but real token exchange, Google audience
validation against staging, session persistence, refresh, logout, and protected-route behavior
have not been completed on a connected device against the live database.

### Staging probe result

The corrected [staging_probe.mjs](../scripts/staging_probe.mjs) is read-only and no longer creates
throwaway accounts. The observed deployed staging endpoint passed **1/14 checks**: analytics
routes served legacy fixture data instead of `503 DATASET_NOT_CONNECTED`, fixture IDs were
reachable, the assistant exposed a fabricated citation pattern, `/auth/google` returned 404, and
the unauthenticated admin route correctly returned 401. The
previous probe also created a throwaway staging account and observed an accepted client-supplied
admin role; the staging owner must remove that account and reconcile the deployed build before
any further write-capable probe.

### Chatbot grounding status

`IMPLEMENTED_UNVERIFIED`: code requires active validated dataset versions, filters retrieval,
tracks citations, and refuses insufficient evidence. No approved live corpus has been ingested and
the bilingual gold evaluation set is not yet recorded.

### Dataset availability and provenance

`BLOCKED`: the repository contains metadata, synthetic/test fixtures, provenance helpers, and a
Phase D acquisition roadmap, but no owner-approved official dataset is recorded as active.

### R2 connectivity status

`VERIFIED_LOCAL`: bucket `decidcix` on account `806347af0627a1cbb814172a14ce952c` is private (public
`r2.dev` URL disabled 2026-11-06), Wrangler object put/get/checksum/delete passed, and backend
`npm run r2:verify` passed (HeadBucket, upload, download, SHA-256, cleanup). A full dataset upload was
executed through the real HTTP endpoints and rolled back with no residue. Still open: the local `.env`
needs `R2_ACCOUNT_ID` and `R2_BUCKET_NAME=decidcix`, staging has no `R2_*` variables, browser CORS is
not configured (no policy) and the Flutter client half is unverified on device.

### Owner decisions pending

1. Country, administrative geography, official region codes, and boundary source.
2. Approved dataset, licence/permission, source owner, vintage, and refresh cadence.
3. Non-production R2 bucket and secret-management path.
4. Staging PostgreSQL access and migration/rollback approval.
5. Firebase SHA-1/device registration and real-device test availability.
6. Heroku staging/release, observability, recovery, signing, and APNs decisions.

### Known regressions and discrepancies

- Historical QA recorded flat-vs-nested response mismatches for historical and data-quality
  screens; current code may have changed, so this must be rechecked rather than assumed fixed.
- Historical documents cite missing `DECIDIX_PHASE_*` reports; those files are not in this checkout.
- Historical test totals differ by date and report; use fresh targeted commands for release claims.
- Synthetic fixtures and in-memory fallbacks remain valid for tests only and must not leak into
  normal non-test responses.
- The earlier mutable staging probe may have created one temporary account, but its generated
  identifier was not captured. The only known form is `probe_<timestamp>@example.invalid`; do not
  guess, delete, or recreate it. The staging owner must identify it from provider logs and request
  approval before removal.
- Post-hardening audit found and fixed additional local paths: overview/region dataset checks now
  precede database fallback decisions; simulation and citizen-report like mutations require an
  approved active dataset; non-test projects/reports do not fall back to memory when PostgreSQL
  is unavailable; non-test predictions reject unavailable database/target-year evidence; and
  model responses with missing or fabricated evidence citations are rejected in favor of the
  deterministic grounded fallback.

## Next three recommended tasks

1. Owner completes the Google Console, dataset/geography, R2, PostgreSQL, and staging checklist
   in [DECIDIX_STAGING_RELEASE_PACKAGE.md](DECIDIX_STAGING_RELEASE_PACKAGE.md).
2. T9.1/T9.2/T9.3: reconcile the deployed SHA, approve backup/migration/rollback, and configure
   staging secrets without committing values.
3. T2.8/T9.4/T10.2: reconnect an authorized Android device and run real Google sign-in,
   contract/RBAC, notification, and bilingual device acceptance against the reconciled staging
   build.

## Session log

| Date | Tasks | Work completed | Modified files | Commands/results | Blockers / next task |
|---|---|---|---|---|---|
| 2026-11-04 | T0.2, PR-35 | Created recovery skill, canonical plan, live tracker; inspected 53 relevant Markdown files; no app code, deploy, migration, or credential changes | `.codex/skills/decidix-recovery/SKILL.md`, `docs/DECIDIX_RECOVERY_MASTER_PLAN.md`, `docs/DECIDIX_RECOVERY_STATUS.md`, `AGENTS.md`, `docs/PROJECT_MASTER_STATUS.md` | `git diff --check -- <changed docs>` exit 0; PR/task ID validation PASS; internal Markdown link check PASS; `git status --short --branch` exit 0 | T0.1 baseline capture; owner decisions remain |
| 2026-11-04 | T0.1-T10.3 | Executed all local code-fixable phases. Fixed ML artifact path resolution so tests work from `ml/`; preserved forecast classification and dataset/RAG/auth guards. No deployment, live migration, credential change, or production write. | `ml/inference/predict.py`, `ml/training/train_forecaster.py`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md` | `npm --prefix backend test`: 173/173 passed, exit 0; `npm --prefix backend run build`: passed, exit 0; `npx prisma validate`: passed, exit 0; `flutter analyze`: passed, exit 0; `flutter test`: 211 passed, 2 skipped, exit 0; `flutter build apk --debug --dart-define-from-file=env/staging.json`: passed, exit 0; `pytest -q` in `ml`: 4/4 passed, exit 0; `python scripts\\verify_numerical_correctness.py`: exit 1 at staging legacy R² assertion` | Owner-gated dataset/geography, R2, PostgreSQL, Firebase/device, and staging SHA reconciliation remain |
| 2026-11-04 | T9.1-T10.3 reconciliation | Corrected the staging probe to be read-only, prepared the complete staging release package, reviewed the ordered Prisma migrations and hashes, and reconciled P0/P1 statuses without claiming live acceptance. | `scripts/staging_probe.mjs`, `docs/DECIDIX_STAGING_RELEASE_PACKAGE.md`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md` | `node --check scripts\\staging_probe.mjs`: passed after fixing one syntax error; corrected probe reached staging and passed 1/14 checks; `npm --prefix backend test`: 173/173 passed, exit 0; `Push-Location backend; npx prisma validate`: passed, exit 0; scoped `git diff --check`: passed | Deployed staging serves legacy fixtures and lacks `/auth/google`; no deployment, migration, secret change, or production write. Next: owner checklist and SHA reconciliation |
| 2026-11-04 | T2.2, T4.1, T5.6, T3.2 | Hardened public registration to force `viewer` outside test mode, protected recommendation mutation with authenticated `projects:manage`, blocked decision fallbacks without an approved active dataset, removed hardcoded chatbot answer branches, and removed fabricated default forecast years from Flutter. | `backend/src/modules/auth/auth.service.ts`, `backend/src/modules/intelligence/intelligence.router.ts`, `backend/src/repositories/decisions.repository.ts`, `backend/src/integrations/openrouter.ts`, `backend/tests/auth.test.ts`, `lib/features/intelligence/presentation/screens/predictions_screen.dart` | `npm --prefix backend test`: 173/173 passed, exit 0; `npm --prefix backend run build`: passed, exit 0; `Set-Location backend; npm exec -- prisma validate --schema prisma/schema.prisma`: passed, exit 0; `flutter analyze`: passed, exit 0; `flutter test`: 211 passed, 2 skipped, exit 0; `python -m pytest -q`: 4 passed, exit 0 | Live staging still serves legacy fixtures and lacks `/auth/google`; no deployment, live migration, secret change, or production write. Next: owner-approved SHA reconciliation and staging migration/contract matrix |
| 2026-11-04 | T1.2, T4.1, T5.4, T5.6 | Completed post-hardening P0/P1 audit. Dataset checks now precede database fallback decisions; simulation and report-like mutations are dataset-gated; non-test project/report/forecast paths reject unavailable persistence instead of returning memory fixtures; model responses with unknown or missing citations are rejected; and the whitespace failures reported by `git diff --check` were fixed in `backend/src/modules/auth/auth.router.ts`, `lib/core/localization/strings/common_strings.dart`, and `test/api/staging_contract_verification_test.dart`. | `backend/src/repositories/overview.repository.ts`, `backend/src/repositories/regions.repository.ts`, `backend/src/repositories/decisions.repository.ts`, `backend/src/repositories/forecast.repository.ts`, `backend/src/integrations/openrouter.ts`, `backend/tests/assistant.test.ts`, `lib/core/localization/strings/common_strings.dart`, `test/api/staging_contract_verification_test.dart`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md` | Focused backend regressions: 72 passed, exit 0; complete backend suite: 174 passed across 9 files, exit 0; `npm --prefix backend run build`: passed, exit 0; `Set-Location backend; npm exec -- prisma validate --schema prisma/schema.prisma`: passed, exit 0; `flutter analyze`: passed, exit 0; `flutter test`: 211 passed, 2 skipped, exit 0; `python -m pytest -q`: 4 passed, exit 0; `flutter build apk --debug --dart-define-from-file=env/staging.json`: passed, exit 0; `git diff --check`: passed, exit 0 | Remaining seed-backed analytical implementations, approved corpus/R2/official geography, live PostgreSQL, staging SHA/configuration, Google Console/device, deployment, and live acceptance remain blocked. Next: owner-approved staging SHA reconciliation; do not deploy or migrate live environments |
| 2026-11-04 | T1.3, T4.1, T5.5, T7.4 | Removed production seed-backed responses for sector insights, historical data, priority, data quality, comparisons, and recommendations. Production now reads persisted records only when an approved active dataset exists and otherwise returns `DATASET_NOT_CONNECTED`; community-report likes no longer require an analytical dataset, while non-test database outages return `DATABASE_NOT_CONNECTED`. Citation validation now rejects unsupported numeric claims in addition to fabricated citations. | `backend/src/repositories/insights.repository.ts`, `backend/src/modules/intelligence/intelligence.router.ts`, `backend/src/repositories/decisions.repository.ts`, `backend/src/integrations/openrouter.ts`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md` | `npm --prefix backend run build`: passed, exit 0; `npm --prefix backend test`: 174/174 passed across 9 files, exit 0; `git diff --check`: passed, exit 0 | Approved dataset lineage, staging deployment, live PostgreSQL, and real-device acceptance remain blocked. Next: add/execute production-mode route regressions with a controlled persisted fixture, then owner-approved staging reconciliation |
| 2026-11-04 | T1.3, T4.1, T5.5, T7.4 validation | Added production-mode unavailable regressions for all six audited analytical areas and recommendations; prevented non-test simulation from using seed regions; completed cross-layer validation without deployment or live writes. | `backend/tests/seed_elimination.test.ts`, `backend/src/services/simulator.service.ts`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md` | `npm --prefix backend test`: 180/180 passed across 10 files, exit 0; focused seed-elimination tests: 6/6 passed, exit 0; simulation tests: 36/36 passed, exit 0; `npm --prefix backend run build`: passed, exit 0; Prisma validate: passed, exit 0; `npm --prefix backend exec vitest run tests/rag.test.ts`: 26/26 passed, exit 0; `flutter analyze`: no issues, exit 0; `flutter test`: 211 passed, 2 skipped, exit 0; `python -m pytest -q` in `ml`: 4 passed, exit 0; staging APK build: passed, exit 0; `git diff --check`: passed, exit 0 | No approved dataset or live PostgreSQL evidence exists; staging SHA/configuration, R2, Google Console/device, deployment, and live acceptance remain blocked. Keep Phases 9 and 10 blocked |
| 2026-11-04 | T1.2, T1.3, T5.1, T7.4 lineage isolation | Added additive dataset-version foreign keys and indexes to analytical tables; production queries now constrain rows and related regions/indicators/recommendations to the exact active validated version. Added provenance fields, simulation baseline provenance, client provenance retention, and safe empty/partial Flutter parsing. | `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261104233000_add_analytical_dataset_lineage/migration.sql`, `backend/src/repositories/insights.repository.ts`, `backend/src/modules/intelligence/intelligence.router.ts`, `backend/src/services/simulator.service.ts`, `backend/tests/dataset_lineage.test.ts`, `lib/api/models/common.dart`, `lib/api/models/insights.dart`, `lib/api/models/intelligence.dart`, `lib/features/insights/presentation/screens/development_priority_screen.dart` | `npm --prefix backend test`: 184/184 passed across 11 files, exit 0; lineage tests: 4/4 passed, exit 0; backend build: passed, exit 0; Prisma validate: passed, exit 0; `flutter analyze`: no issues, exit 0; `flutter test`: 211 passed, 2 skipped, exit 0; `git diff --check`: passed, exit 0 | Migration has not been run; no approved active dataset, live PostgreSQL, staging SHA, R2, Google/device, or live provenance evidence exists. Dataset integration remains IMPLEMENTED_UNVERIFIED; keep Phases 9 and 10 blocked |
| 2026-11-04 | T1.5, T6.3 ingestion architecture review | Replaced raw-record-only ingestion with a fail-closed canonical payload contract and one Prisma transaction covering raw records, metadata, analytical tables, recommendations, and version-matched RAG documents. Added source/licence/geography/time/quality validation, reference checks, and cross-version key conflict rejection. | `backend/src/services/dataset.service.ts`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md` | `Set-Location backend; npm run build`: exit 0; `Set-Location backend; npm test`: 184/184 passed across 11 files, exit 0; `git diff --check`: exit 0. Vitest logs confirmed `localhost:5432` is unavailable; no PostgreSQL A/B integration test was claimed. | Region/Indicator global keys and regional-metric uniqueness still prevent parallel A/B versions; stable-reference/versioned-observation schema and owner approval remain required. No live or staging database was changed; keep Phases 9 and 10 blocked |
| 2026-11-04 | T1.5 architecture proposal | Prepared a proposal for true multi-version Dataset support with stable references, version-owned observations, activation/rollback, RAG lineage, legacy handling, migration outline, and integration tests. | `docs/DECIDIX_VERSIONED_DATA_ARCHITECTURE_PROPOSAL.md`, `docs/DECIDIX_RECOVERY_STATUS.md` | Source review only; no code or migration changes; no PostgreSQL integration test, database access, deployment, or live write performed | Owner approval required for geography, indicator identity, retention, activation completeness, forecast ownership, and additive migration design |

| 2026-11-06 | T6.1, T6.2 real R2 connection | Verified the authenticated Cloudflare account and the pre-existing bucket, disabled its public development URL, left CORS unconfigured (native path), proved a Wrangler object round-trip, ran `r2:verify` against real S3 credentials, executed and rolled back a full dataset upload, and removed only this run's probe artifacts. No source code, migration, deployment, staging secret, or pre-existing dataset record was changed. | `docs/deployment/cloudflare_r2_setup.md`, `docs/DECIDIX_RECOVERY_STATUS.md`, `docs/PROJECT_MASTER_STATUS.md`, `docs/DECIDIX_RECOVERY_MASTER_PLAN.md` | `wrangler r2 object put/get/delete` round-trip SHA-256 matched then object absent; `npm run r2:verify` exit 0 (`configured=true`, access/upload/download/checksum/cleanup success); E2E initiate/PUT/complete/validate/ingest/activate/overview 200 with rollback to `ds_demo_curated_2025_v1`; backend unit 19 files/247 tests, PG integration 8/8, build exit 0; Flutter analyze 0 issues, upload widget tests 4/4; `git diff --check` 0 | Owner adds `R2_ACCOUNT_ID` + `R2_BUCKET_NAME=decidcix` to `backend/.env` (not modified here), configures staging `R2_*` later, decides the CSV→canonical mapping, and runs the device upload test |

| 2026-11-06 | CSV upload compatibility | Added the strict Decidix CSV template normalizer so CSV and canonical JSON share one validate/ingest/activate path; a parse failure now marks the version invalid; the upload screen documents the template, shows it with a copy action, and maps CSV error codes. No deployment, migration, secret change, or database reset. | `backend/src/services/dataset_csv.ts` (new), `backend/src/services/dataset.service.ts`, `backend/tests/dataset_csv.test.ts` (new), `backend/tests/integration/dataset_csv_upload.test.ts` (new), `backend/tests/r2.test.ts`, `backend/tests/dataset_upload.test.ts`, `lib/features/datasets/presentation/screens/dataset_upload_screen.dart`, `test/datasets/dataset_upload_test.dart`, `docs/deployment/cloudflare_r2_setup.md` | backend unit 20 files/269 tests; PG integration 3 files/10 tests; build exit 0; `flutter analyze` 0 issues; `flutter test` 228 passed / 2 skipped; upload widget tests 6/6; `git diff --check` 0 | Device/browser upload still unverified; staging `R2_*` absent; the Flutter client half of the end-to-end path remains IMPLEMENTED_UNVERIFIED |

## Markdown cleanup record

No Markdown files were deleted. Existing documentation is retained because it is either
authoritative, referenced, architecture-specific, or ambiguous. The Master Plan records the
inventory/consolidation decision and the missing historical report references.


## P0 production safety and security hardening — 2026-11-04

**Task IDs:** P0-S1 release configuration, P0-S2 mock/data fail-closed, P0-S3 backend
authorization, P0-S4 production environment validation.
**Classification:** `VERIFIED_LOCAL` for configuration rejection and authorization behaviour.
Nothing was deployed, pushed, migrated, or changed in any live database or secret store.

### P0-S1 — Flutter release configuration (fixed)

- Confirmed: `AppConfig.useMock` defaulted to `true`, so a release build with no dart-defines
  silently served `assets/mock` as if it were real data.
- Confirmed: `API_BASE_URL` was only rejected when the transport was already building, and no
  scheme/host rules existed, so `http://` or a localhost address could ship in a release.
- Fixed: `AppConfig.useMock` is now `requested && !kReleaseMode`; a release build can never serve
  mock data, even with `USE_MOCK=true`.
- Fixed: `AppConfig.validateApiConfiguration` runs before transport selection and rejects, in a
  release build, a missing/malformed URL, plain HTTP, loopback or `.local` hosts. Development keeps
  an http loopback workflow.
- Files: `lib/core/config/app_config.dart`, `lib/api/api_providers.dart`.

### P0-S2 — Mock and data integrity (already enforced; one gap closed)

- Confirmed already fixed: every analytical repository gates seed/synthetic data behind
  `syntheticDataAllowed()` and returns `DATASET_NOT_CONNECTED` otherwise; the demo banner shows in
  mock mode; forecasts are labelled simulated.
- Gap closed: `ALLOW_SYNTHETIC_DATA=true` could still enable synthetic data in production. Production
  now returns `false` unconditionally, so an unconnected dataset fails closed.
- File: `backend/src/config/env.ts`.

### P0-S3 — Backend authorization (already fixed; regression tests added)

- Verified: `/v1/admin/*` requires a JWT plus the admin role; `/v1/datasets/*` requires auth and an
  admin/analyst role; notifications and profile require auth; identity and role come only from the
  verified JWT, never from request fields.
- Verified: public registration assigns `viewer` and ignores a supplied `role` outside
  `NODE_ENV=test`; in-memory identity/session fallbacks are test-only.
- Reviewed and left unchanged as intended guest surfaces: assistant chat, decision simulation, and
  citizen reports use `optionalAuth` (anonymous use is a product decision, and they grant no
  privilege).
- Added `backend/tests/authorization_hardening.test.ts` (6 tests).

### P0-S4 — Production environment validation (fixed)

- Confirmed: `JWT_SECRET` and `DATABASE_URL` had defaults that production would silently accept, so
  a deploy could sign tokens with a published secret or point at localhost.
- Fixed: new `productionConfigProblems` guard runs at startup and refuses to boot in production when
  `JWT_SECRET` is missing, shorter than 32 characters, or the built-in development default;
  when `DATABASE_URL` is missing; or when `CORS_ORIGIN` is `*`.
- Messages name the rule only and never include a value.
- Files: `backend/src/config/production_guard.ts`, `backend/src/config/env.ts`,
  `backend/tests/production_config.test.ts` (8 tests).

### Commands executed and actual results

- `flutter analyze`: `No issues found!`, exit 0.
- `flutter test test/api/transport_choice_test.dart`: 11 passed, exit 0.
- `flutter test`: 222 passed, 2 skipped, 0 failed, exit 0.
- `npm --prefix backend run build`: exit 0, no `error TS`.
- `npm --prefix backend test`: 13 files, 199 tests passed, exit 0.
- `git diff --check`: exit 0.

### Remaining risks

- Optional-auth endpoints still accept anonymous traffic (intended) and rely on rate limiting.
- Health endpoints expose the configured model identifier and database status, not secrets.
- No staging or device run; production startup rejection is unit-tested, not deploy-tested.
- Real Google OAuth and physical-device sign-in remain unverified.

### Owner action / next task

Run the backend once with `NODE_ENV=production` and an intentionally incomplete environment to
confirm the startup error text in the target platform's log, then set the real secrets in Heroku
(not in the repository) before any deploy.

## Core system recovery — Phase 0–4 execution — 2026-11-04

**Classification:** `VERIFIED_LOCAL` for the code paths below. Live PostgreSQL, R2, staging and device
evidence remain absent, so no phase is production-verified.

### 1. Actual dependency graph (verified against the tree)

```text
dataset file (JSON/CSV)
  → R2Service.createPresignedUploadUrl            (upload URL, no local copy)
  → DatasetService.completeUpload                 → dataset_versions (validationStatus=uploaded)
  → DatasetService.validate                       → checksum + canonical provenance/integrity/quality
  → DatasetService.ingest                         → dataset_records (raw, is_retrievable)
                                                  → dataset_metadata, regions, indicators,
                                                    national_index_history, regional_metrics,
                                                    sector_breakdowns, ai_recommendations,
                                                    rag_documents      (all tagged dataset_version_id)
  → DatasetService.activate                       → dataset_versions.is_active (single active)
  → DatasetService.active()                       → the version every analytical read must resolve
  → OverviewRepository / InsightsRepository / RegionsRepository / DecisionsRepository /
    ForecastRepository / SimulatorService         → API JSON (+ provenance)
  → Flutter api/transport (DioTransport | MockTransport) → repositories → providers → screens
```

Flutter auth path: `AuthNotifier` (restore/refresh, single-flight) → `ApiClient` (Bearer, 401 retry)
→ backend `requireAuth` → JWT claims → route permission. Session/refresh persistence:
`sessions` table via `AuthRepository`; device push: `device_tokens`.

### 2. Component classification

| Component | State |
| --- | --- |
| Flutter auth, refresh coordination, session restore | VERIFIED_LOCAL (tests) |
| Backend auth, roles, session rotation, revocation | VERIFIED_LOCAL (tests); live DB BLOCKED |
| Prisma schema vs migrations | PARTIAL — see migration requirement below |
| Raw `pg` usage | Only the migration runner (`migrate.ts`, `pool.ts`); analytical code is Prisma |
| Dataset upload/validate/ingest/activate | PARTIAL — safety guards now enforced, R2 BLOCKED |
| Version isolation | PARTIAL — reads enforced; coexistence BLOCKED (schema) |
| Analytics repositories | PARTIAL — version-scoped, several KPIs still empty or constant |
| ML forecasting | EXPERIMENTAL — simulated labels, no approved-data training |
| RAG ingestion/retrieval | IMPLEMENTED_UNVERIFIED — live pgvector never exercised |
| Flutter screens | VERIFIED_LOCAL against mocks; live backend responses unverified |

### 3. Confirmed defects and fixes

1. **Overview endpoint read across dataset versions.** `OverviewRepository.getOverview` queried
   `national_index_history` and `regions` with no `datasetVersionId` predicate, so rows from a
   previous version could appear in an active response. **Fixed**: both queries (and the trend query)
   now filter by the resolved active version.
2. **Fabricated backfill in a verified response.** An empty trend was replaced with
   `SEED_OVERVIEW.trend_points_7y`, and an empty region list with seed regions, even when synthetic
   data was disallowed. **Fixed**: no backfill outside synthetic mode; empty stays empty, missing
   history fails closed with `DATASET_NOT_CONNECTED`.
3. **Provenance mislabelled.** The overview always returned `SYNTHETIC_PROVENANCE`, including when
   serving an approved dataset. **Fixed**: verified responses report `derived_calculation` with the
   active version's source, version and observation period.
4. **Validation only checked the checksum.** `DatasetService.validate` parsed the file but never ran
   `requireCanonicalDataset`/`validateCanonicalDataset`, so an un-usable file could be marked
   `validated`. **Fixed**: canonical structure, provenance completeness, referential integrity and
   quality ranges are enforced; failures mark the version `invalid` with the reason and rethrow.
5. **Activation without ingested rows.** `activate` accepted any `validated` version, including one
   never ingested, leaving every analytical endpoint answering for an empty version. **Fixed**:
   activation requires metadata, region and metric rows owned by that version
   (`DATASET_NOT_INGESTED`).
6. **Cross-version observation conflict surfaced as a raw DB error.** `regional_metrics` is unique on
   `(region_id, indicator_key, year)` regardless of version, so a second version with overlapping
   observations would fail inside the transaction. **Fixed**: conflicts are counted and reported
   before any write (`CANONICAL_OBSERVATION_VERSION_CONFLICT`).

### 4. Remaining structural blocker (not changed — requires owner approval)

Global `regions.id` / `indicators.key` primary keys and the version-agnostic unique constraint on
`regional_metrics` make two dataset versions unable to coexist. Consequences that remain:

- A second version cannot own the same region/indicator/year observations.
- `ingest` re-points shared region/indicator rows to the newest version, so rolling back to a
  previous version can leave it with zero region rows.
- There is no DB-level guarantee of a single active version (enforced only by
  `activate`'s transaction).

`docs/DECIDIX_VERSIONED_DATA_ARCHITECTURE_PROPOSAL.md` resolves this with stable reference tables,
version-owned observation tables, a `dataset_runtime_state` singleton and a partial unique index on
`is_active`. It is additive and forward-only, and was **not implemented** here: it needs an owner
decision and an isolated PostgreSQL A/B proof.

### 5. Tests added

- `backend/tests/dataset_lifecycle.test.ts` (6): canonical validation rejection with `invalid` status,
  missing provenance rejection, complete dataset acceptance, activation refused before ingestion,
  activation transaction for an ingested version, pre-write observation-conflict rejection.
- `backend/tests/overview_version_isolation.test.ts` (3): active-version predicates on all three
  queries, no seed backfill, fail-closed without history.

These use mocked Prisma. They are unit tests, not PostgreSQL integration evidence.

### 6. Exact results

- `npm --prefix backend run build`: exit 0, no TypeScript errors.
- `npm --prefix backend test`: 15 files, 208 tests passed, exit 0.
- `flutter analyze`: 0 issues.
- `flutter test`: 222 passed, 2 skipped, 0 failed.
- `git diff --check`: exit 0.

No deployment, push, migration execution, live database write, secret change, or paid service use.

### 7. Required migrations (not executed)

1. Stable region/indicator reference tables + version-owned observation tables.
2. `dataset_runtime_state` singleton and activation event log.
3. Partial unique index guaranteeing at most one active version.
4. Backfill only rows with known provenance; quarantine the rest.
5. Switch repositories behind a reviewed compatibility boundary, then tighten NOT NULL.

### 8. External configuration still required

R2 credentials/bucket for dataset upload and download; a staging `DATABASE_URL`; a real
`GOOGLE_WEB_CLIENT_ID`; Heroku environment secrets. None is in the repository.

### 9. Prioritized execution plan

1. Owner approves the versioned-observation design.
2. Additive migration + isolated PostgreSQL A/B test (activate A → read; ingest B → activate B →
   read; roll back to A → read).
3. Compute overview KPIs from the active version (currently empty).
4. Replace hardcoded model R² and top-improver deltas with recorded artifacts.
5. Only then re-audit ML/RAG against approved data.

### 10. Versioned-model proof pass (2026-11-04)

Scope: review the existing proposal against the actual schema/services, finalize the versioned
model, and prove A→B→A on isolated PostgreSQL before any project migration.

**Result: design finalized; PostgreSQL proof BLOCKED.** No database was modified and no migration
was applied.

#### Blocker (exact)

- `psql`, `pg_ctl`, `pg_isready`, `docker`: not installed.
- No PostgreSQL service registered; nothing listening on port 5432.
- `backend/.env` declares a `DATABASE_URL` (value not read), but no server or client exists here,
  and the configured instance is not an isolated proof database in any case.
- Therefore A→B→A, concurrency, and transaction-rollback results cannot be produced on this host,
  and none is claimed. The existing unit tests remain mocked-Prisma tests, not DB evidence.

#### Design corrections made during review

1. `dataset_runtime_state` is the single active pointer; `is_active` becomes a transitional mirror
   and is dropped in the contract phase (two authoritative flags would be a split brain).
2. `AiRecommendation` needs a surrogate primary key + `UNIQUE(dataset_version_id, external_id)`;
   its current global `id` collides when two versions carry the same recommendation.
3. `dataset_records` must be `ON DELETE RESTRICT` (it is currently `CASCADE`), or raw evidence
   disappears with the version row.
4. `dataset_metadata` needs `UNIQUE(dataset_version_id)`.
5. Version-owned observations require an explicit `classification`; silence must not mean
   `observed`.
6. The proposal's claim that `OverviewRepository` is version-blind is stale — it was fixed in the
   previous pass. The still-unversioned reads are `RegionsRepository` (no predicate anywhere),
   hardcoded forecast actuals, and `ml_forecasts` (no version column).

#### Artifacts added (no application code changed)

- `backend/prisma/proof/001_schema.sql` — proof DDL, `activate_dataset()` (row lock, completeness
  and orphan checks, audit insert), and `active_*` views.
- `backend/prisma/proof/002_fixtures.sql` — synthetic A/B/invalid fixtures, labelled `test-only`.
- `backend/prisma/proof/guard.mjs` — pure guards, no database: loopback host only
  (`localhost`/`127.0.0.1`/`::1`), database prefix `decidix_proof_`, refusal when the target matches
  the configured application database (host + port + database, independent of credentials), and
  cleanup permitted only for a schema this run created.
- `backend/tests/proof_guard.test.ts` — rejection cases exercised without any connection.
- `backend/prisma/proof/run_proof.mjs` — 24 separately reported assertions over real `pg`: A→B→A
  values, invalid activation, duplicate observation, cross-version isolation, concurrent activation,
  transaction rollback, provenance retention/restrict. Refuses non-loopback hosts, databases not
  named `decidix_proof_*`, URLs matching the app database, and an existing `proof` schema; drops
  only the schema it created; redacts credentials from all output.
- `backend/prisma/proof/README.md` — run instructions, guards, expected output.
- `docs/DECIDIX_VERSIONED_MIGRATION_PLAN.md` — M1 additive → M2 dual write → M3 backfill →
  M4 read switch → M5 contract, plus locking/downtime/rollback and per-repository query changes.
- `docs/DECIDIX_VERSIONED_DATA_ARCHITECTURE_PROPOSAL.md` §15 — review corrections (model v2).

#### Checks run in this pass

- `node --check backend/prisma/proof/guard.mjs` and `run_proof.mjs`: exit 0.
- Runner with no `PROOF_DATABASE_URL`: exit 2, `BLOCKED [MISSING_PROOF_URL]`.
- Runner with a remote host (`db.example.com`): exit 2, `BLOCKED [NON_LOOPBACK_HOST]`. Both are
  refusals, not results; no connection is attempted.
- `npm --prefix backend run build`: exit 0.
- `npm --prefix backend test`: 16 files, 227 tests passed, exit 0 (includes 19 database-free guard
  tests in `backend/tests/proof_guard.test.ts`).
- `git diff --check`: exit 0.

#### Real PostgreSQL execution (2026-11-05) — PASSED

Server: PostgreSQL 18.6 (`x86_64-windows`), Windows service `postgresql-x64-18`, installed at
`E:\PostgreSQL` (data directory `E:\PostgreSQL\data`), listening on `127.0.0.1:5432` with
`scram-sha-256` host authentication. `psql`, `createdb`, `dropdb` and `pg_isready` are present in
`E:\PostgreSQL\bin` (not on `PATH` by default). The password was supplied locally and never written
to the repository, `.env`, logs, or this document.

Disposable database: `decidix_proof_20261105a` (created for this run, dropped after verification).

Result: `24/24 proof assertions passed.` / `PROOF PASSED against real PostgreSQL.`, exit 0. Output
contained exactly 24 `PASS` lines and 0 `FAIL` lines: A1–A4, B1–B6, R1–R4, E1–E10.

Also verified against the live server:

- A successful run leaves no `proof` schema and no user tables in the disposable database.
- With a pre-existing `proof` schema holding a sentinel table, the runner exited 2 with
  `BLOCKED [PROOF_SCHEMA_EXISTS]` and the sentinel row survived; the schema was then dropped
  manually. The existing-schema, loopback, and owned-only-cleanup branches are therefore verified
  live, not only by unit tests.

Harness defects exposed by the first real executions (all fixed; no application code involved):

1. `run_proof.mjs` called `fs.readFile(path, 'utf8')` without a callback, which throws before any
   SQL runs; it now uses `readFileSync`.
2. `001_schema.sql` re-issued `CREATE SCHEMA proof` after the runner had already created it, so
   every run aborted with `schema "proof" already exists`; the DDL now creates nothing and requires
   the runner-created schema.
3. `activate_dataset()` had no fixed `search_path`, so it failed on fresh sessions (the concurrent
   activation clients) with `relation "dataset_runtime_state" does not exist`; the function now sets
   `search_path = proof, pg_temp`.
4. Three assertions compared `active_region_scores` against region ids (`central_capital`,
   `frontier`) although the view returns region codes (`SA-01`, `SA-02`); expectations corrected.
5. E10 expected SQLSTATE `23503`. PostgreSQL raises `23001` (restrict_violation) for `ON DELETE
   RESTRICT`; `23503` applies to `NO ACTION`. Expectation corrected and commented.

#### Next implementation task

M1 is generated **and executed in rehearsal** (see §11). Next: review the M1 SQL and the
four-state evidence, then decide whether to record `001`–`005` as the project's next
migration and plan M2 (dual write) behind an explicit owner authorization. No staging or
production execution is authorized yet.

### 11. M1 additive migration — executed in rehearsal on PostgreSQL 18.6 (2026-11-05)

Scope: generate the M1 additive SQL, execute it against isolated PostgreSQL 18.6
databases in four planned states, prove legacy preservation and constraint behaviour,
test failure/rollback, and verify Prisma compatibility. **No project, staging or
production database was contacted; application reads and writes were not switched.**

#### Verdict, item by item

| Claim | Verdict | Evidence |
| --- | --- | --- |
| Migration generated | **YES** | `backend/prisma/m1/{001_schema,002_backfill,003_indexes,004_optional_exclusions,005_rollback}.sql`, two legacy fixtures, a post-001 metadata fixture, `guard.mjs`, `run_rehearsal.mjs` |
| Migration syntax executed | **YES** | 001–004 applied in all four states on PostgreSQL 18.6; 304/304 assertions, exit 0 |
| Legacy-data preservation verified | **YES** | 15 legacy tables fingerprinted (row count + md5 over the original column list) before and after M1; identical in `empty`, `legacy`, `versioned`, `unattributable` and after rollback |
| Rollback verified | **YES** | injected failure (`22012`) inside 001+002 rolls both back with legacy unchanged; `005_rollback.sql` applied after a full M1 restores the legacy shape, drops every M1 object and returns the `dataset_records` FK to `ON DELETE CASCADE` |
| Application compatibility verified | **YES for the current app** | `npm run build` exit 0; `npm test` 16 files / 227 tests passed; `prisma validate` valid; the app does not read or write any M1 object yet |
| Applied to project / staging / production | **NO** | not attempted; the local cluster contained only `postgres`, `template0`, `template1` |

#### Environment (exact)

- Server: `PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit`,
  Windows service `postgresql-x64-18`, `E:\PostgreSQL`, `127.0.0.1:5432`, SCRAM auth.
- Client: `psql (PostgreSQL) 18.6`, Node `v25.4.0`, npm `11.7.0`, Prisma `5.22.0`.
- Maintenance target: loopback `postgres` database only. The password was supplied for
  the run and never written to the repository, `.env`, logs or this document.

#### Four planned database states (each a fresh, uniquely named, disposable database)

| State | Seed | Quarantine rows | Legacy rows of note |
| --- | --- | --- | --- |
| `empty` | none | 0 | none |
| `legacy` | `fixtures/legacy_rows.sql` | 8 | 2 regions, 2 indicators, 2 metrics, 1 national index, 1 sector, 1 recommendation, 1 metadata, 1 RAG doc |
| `versioned` | `legacy_rows.sql` + `versioned_rows.sql` | 1 | + 4 versions, 4 raw records, 1 forecast; one version unvalidated |
| `unattributable` | `legacy_rows.sql` + validated versions that own no rows | 8 | versions exist, analytical rows still NULL — must not be guessed into a version |

Databases were named `decidix_m1_20261105t100122z_98d696_{empty,legacy,versioned,unattributable}`,
plus `_failure` and `_down`. All six were dropped; `pg_database` was re-checked and
contains zero `decidix%` databases afterwards.

#### What the 304 assertions proved

- **Schema** — all 12 M1 tables, both reconciliation functions and
  `activate_dataset_bundle()` exist in every state; all 9 SQL-only indexes are valid; all
  10 named SQL-only constraints exist; `dataset_records → dataset_versions` is
  `confdeltype = 'r'` (RESTRICT); with `btree_gist` present, both 004 `EXCLUDE`
  constraints exist.
- **Legacy preservation** — every legacy table's count and content hash over its
  original columns is byte-identical before and after M1. M1 only appends columns
  (`external_id`, `seq`), so the hash deliberately excludes columns that did not exist
  before the migration; no legacy row is updated, deleted or re-attributed.
- **Backfill discipline** — one catalog era per indicator (2), one boundary era per
  region with geometry (2), `external_id` populated, `seq` populated from the owned
  sequence, and **zero** observations invented (that is M3). Quarantine copies equal the
  NULL-provenance rows exactly (8 / 1 / 8).
- **Versioned definitions** — second open era `23505`; reversed era `23514`; metric
  observation referencing a missing definition era `23503`; valid era accepted.
- **Boundary history** — second open boundary era `23505`; unknown boundary era `23503`;
  self-relation `23514`; unknown relation type `23514`.
- **Bundle activation** — validated activation returns one pointer row and the bundle
  key, sets exactly one `is_active` mirror in the family, writes an audit row with actor
  and reason; unvalidated version `23514`; blank actor `22023`; missing version `23503`;
  bundle containing an unvalidated member `23514`; two same-family versions in one
  bundle `23505`.
- **Observation-source lineage** — same-version link accepted; cross-version link
  reported by `report_lineage_version_mismatches()`; orphan reported by
  `report_orphan_observation_source_records()`; duplicate link `23505`; deleting a
  record or version that owns evidence `23001`.
- **Failure behaviour** — 001 refuses a database without the legacy schema and leaves no
  M1 table; an injected `22012` between 001 and 002 rolls back both and leaves legacy
  data unchanged; a duplicate key makes the 003 unique build fail with `23505` and
  leaves an **INVALID** index (`indisvalid = false`) while earlier statements remain
  applied — fail-visible, not silently half-valid.
- **Down migration** — after a full M1, `005_rollback.sql` drops all 12 M1 tables, all
  M1 columns and all three functions, removes the 004 exclusions, restores the
  `dataset_records` FK to CASCADE, and leaves every legacy table and row identical.

#### Prisma compatibility

- `prisma validate` → `The schema at prisma/schema.prisma is valid`.
- `prisma generate` (part of the build) → exit 0.
- `prisma migrate diff --from-url <M1 database> --to-schema-datamodel schema.prisma`
  contains **0** `DROP INDEX`, **0** `CHECK`, **0** `DROP TABLE`/`DROP COLUMN`: CHECK
  constraints, partial unique indexes and `EXCLUDE` constraints are left alone by Prisma
  and remain SQL-only.
- The same diff exposed a real incompatibility: `DatasetRecord.datasetVersion` was
  declared `onDelete: Cascade`, so Prisma would have re-added the evidence FK as CASCADE,
  silently undoing M1's RESTRICT. Fixed to `onDelete: Restrict`; the diff now re-adds it
  as `ON DELETE RESTRICT`. Prisma still reconciles foreign keys (adding
  `ON UPDATE CASCADE`), so **`prisma migrate dev` must never be run against an M1
  database**; M1 SQL is authoritative.

#### Rehearsal isolation

- The runner reads only `M1_ADMIN_URL`; `process.env.DATABASE_URL` and `backend/.env` are
  never read (source contains no such access).
- Behavioural proof: a run with a poisoned
  `DATABASE_URL=postgresql://sentinel:sentinel@192.0.2.55:5432/decidix_production_sentinel`
  still completed 297/297 (pre-rollback version of the suite) — nothing connected to it.
- Every target database is created by the run, uniquely named, and dropped in a
  `finally` block; the runner refuses to reuse an existing database or a non-loopback
  host.

#### Defects found by real execution (all fixed, no application code changed)

1. `guard.splitStatements` split on a semicolon inside a comment, corrupting 003.
2. `fixtures/versioned_rows.sql` referenced `dataset_family`/`bundle_key`, which 001
   adds; it ran before M1 and failed. Split into a legacy-only fixture plus
   `fixtures/versioned_m1_metadata.sql` applied between 001 and 002.
3. `activate_dataset_bundle()` raised `42702` (`dataset_family` ambiguous between the
   `RETURNS TABLE` parameter and the column). Fixed with `#variable_conflict use_column`
   and explicit aliases.
4. `schema.prisma` contradicted the M1 evidence FK (`Cascade` vs `RESTRICT`); fixed.

#### Checks run in this pass

- `node prisma/m1/run_rehearsal.mjs` → 304/304, exit 0, `M1 REHEARSAL PASSED against real PostgreSQL.`
- Independent second path via `psql -v ON_ERROR_STOP=1` (all 10 legacy migrations + 001–004):
  32 CHECK constraints, 9 valid SQL-only indexes, 2 exclusion constraints, 2 legacy rows.
- `npm --prefix backend run build` → exit 0. `npm --prefix backend test` → 16 files, 227
  tests passed, exit 0. `git diff --check` → exit 0.
- 0 leftover `decidix%` databases after the runs.

#### Not claimed

- M1 was **not** applied to the project, staging or production database.
- No application reads or writes were switched (that is M2/M4).
- M2 dual write, M3 backfill of observations, and M4 read switch remain unimplemented;
  `003` is intentionally non-transactional and `004` remains optional on servers without
  `btree_gist`.

## Batch 1 — local PostgreSQL, schema drift, and backend connectivity (2026-11-05)

Scope: make the existing backend run against a real local database. No dataset bootstrap, ML,
RAG, R2, staging, or deployment work was performed, and no pre-existing change was discarded.

### Verdict against the Batch 1 completion criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | PostgreSQL 18.6 accepts the local app connection | **PASS** | `psql 18.6`; `decidix_app` connects to `decidix_dev` |
| 2 | `decidix_dev` exists | **PASS** | created this batch (only system databases existed before) |
| 3 | Standard migrations complete | **PASS** | 10/10 applied, `migrate status` = up to date, 19 public tables |
| 4 | Prisma schema matches the migration-backed schema | **PASS** | M1-only declarations removed; `P2022` proof below; 0 destructive diff statements |
| 5 | Prisma Client generates | **PASS** | `prisma generate` exit 0 (v5.22.0) |
| 6 | Safe seed completes | **PASS** | users 5, regions 12, indicators 4, history 1, forecasts 11, RAG 3, metadata 4 |
| 7 | Backend connects to PostgreSQL | **PASS** | `/v1/health` 200 `healthy`, `database: connected` (no `fallback_memory`) |
| 8 | Database-backed auth/session behaviour | **PASS** | login/me/refresh/rotation/replay/logout matrix below |
| 9 | Build and full tests | **PASS** | build 0; **17 files / 230 tests**; validate 0; M1 rehearsal 304/304 |
| 10 | No pre-existing changes discarded | **PASS** | 135 modified preserved; no deletions/renames; `git diff --check` 0 |

### Local environment

- Server: PostgreSQL 18.6, service `postgresql-x64-18`, `127.0.0.1:5432`, SCRAM-SHA-256.
- Database `decidix_dev`, owner `decidix_app`; role attributes `rolsuper=false,
  rolcreatedb=false, rolcreaterole=false` (least privilege, not the superuser).
- The application credential and `SEED_ADMIN_PASSWORD` live only in the git-ignored
  `backend/.env`; neither is printed, logged, or committed. No Heroku/production credential used.

### Schema drift fix (the `P2022` defect)

Removed **only** M1-only declarations from `backend/prisma/schema.prisma` (the SQL, rehearsal,
proposal and migration plan under `backend/prisma/m1/` are untouched):

- the 12 M1 models; `DatasetVersion.datasetFamily` / `bundleKey` and its M1 relation arrays;
- `MlForecast.datasetVersionId` / `modelRunId` plus their relations and M1 index;
- `AiRecommendation.externalId` / `seq`; `RagDocument.externalId`;
- `Region`/`Indicator` M1 relation arrays; `DatasetRecord.sourceLinks`.

Preserved: `DatasetVersion` and `DatasetRecord` (both created by migration `20261104190000`),
every `dataset_version_id` lineage field added by `20261104233000`, the Google-subject migration,
the forecast default migration, and the migration-declared `ON DELETE CASCADE` on
`dataset_records` (the M1 `RESTRICT` variant is not migration-backed).

Proof, run on a disposable database built from `prisma/migrations`:

- before: `datasetVersion.findFirst()` → **`P2022 dataset_versions.dataset_family does not exist`**;
- after: `datasetVersion.findFirst()` → `null`; `user.count()` and `session.count()` succeed.

### Residual `migrate diff` (classified, not applied)

`migrate deploy` applies migration files only, never the diff. Against `decidix_dev` the diff has
**0 `DROP TABLE` / `DROP COLUMN`** statements and only:

1. seven FK re-creations because the migrations declare `ON UPDATE NO ACTION` while Prisma's
   relation default is `ON UPDATE CASCADE` — constraint-only, no data change, pre-existing;
2. `rag_documents.embedding` is `jsonb` locally because pgvector is unavailable
   (`pg_available_extensions` has no `vector`); the schema models `vector(1536)` for pgvector
   hosts. Environment-only; harmless while RAG ingestion stays in Batch 4.

### Seed review and execution

The standard seed is idempotent (upserts; preserves existing password hashes; history inserted
only when absent) and creates five users (`admin`, `analyst`, `decision_maker`, `planner`,
`viewer`), 12 regions, 4 indicators, projects/reports/recommendations/metadata, 11 forecasts and
3 RAG documents. It **creates no `DatasetVersion`** and tags no analytical row with
`dataset_version_id`; that is the Batch 2 blocker.

Test-pollution note: once the database became reachable, the route/auth suites (which had relied
on the in-memory fallback) created 22 users and 26 sessions in `decidix_dev`. Fixed by making the
unit suite hermetic (`backend/vitest.config.ts` points `DATABASE_URL` at a non-listening loopback
port); the freshly provisioned dev database was reset to its seeded state. No user data existed
before that reset.

### Backend verification (live, read-only probes)

- `/v1/health` → 200 `healthy`, `database: connected`.
- `POST /v1/auth/login` (seeded admin) → 200, role `admin`; `GET /v1/auth/me` → 200.
- `POST /v1/auth/refresh` → 200 with rotated refresh token; replaying the old token → 401 and a
  "refresh token reuse" warning; `POST /v1/auth/logout` → 200; replay after logout → 401;
  all sessions end `revoked_at`-set (3/3).
- `GET /v1/datasets/active` with a token → 200, `data: null` (proves a real DB read).
- `GET /v1/overview` → **503 `DATASET_NOT_CONNECTED`** with a correct JSON body. This is expected
  for Batch 2 and is not hidden with mock data.

### Exact test results

- `npm run build` exit 0; `prisma validate` exit 0; `prisma generate` exit 0;
  `migrate status` = up to date.
- `npm test`: **17 files / 230 tests passed, exit 0** (227 existing + 3 new
  `tests/schema_migration_alignment.test.ts`), dev-DB row counts unchanged (5/0/0).
- M1 rehearsal: **304/304**, exit 0 (scripts unchanged).
- `git diff --check` exit 0; 135 modified paths preserved; 0 deletions/renames.

### Files changed in Batch 1

- `backend/prisma/schema.prisma` — M1-only declarations removed.
- `backend/vitest.config.ts` — new; hermetic test database isolation.
- `backend/tests/schema_migration_alignment.test.ts` — new; drift regression guard.
- `backend/.env` — local/untracked: `DATABASE_URL` + `SEED_ADMIN_PASSWORD`.
- Recovery documents (this file, master status, master plan).

### Batch 2 blockers (unchanged by Batch 1)

1. No `DatasetVersion` and no active dataset → analytics answer `503 DATASET_NOT_CONNECTED`.
2. No Flutter dataset-upload UI; R2 is unconfigured (`R2_ACCOUNT_ID` missing, placeholder bucket).
3. Flutter live sign-in still lacks an email/password path; Google needs a registered device.
4. ML forecast provenance/hardcoded actuals and the unverified R² exposure remain.
5. Staging is still 26 commits behind and was not touched.

## Batch 2 — dataset bootstrap, canonical ingestion, and active dataset (2026-11-05)

Scope: get one real dataset through the existing validation/ingestion pipeline, activate it in
`decidix_dev`, and unlock the analytical API. No M1/M2 integration, no R2 work, no deployment.

### Result

`GET /v1/datasets/active` now returns **`ds_demo_curated_2025_v1`** (`is_active=true`,
`validationStatus=validated`), and the analytical endpoints return dataset-backed 200 responses.

### Dataset source and classification

- Input file: `datasets/processed/curated_regional_development.csv` (9,569 bytes, 84 rows,
  12 regions × 7 years 2019–2025, 19 columns).
- Provenance: **`synthetic_demo`**. Generated locally by `scripts/pipeline_ingest.py` from a fixed
  12-region `base_score` table. **No official statistics, publisher, URL or licence is claimed.**
  The dataset version's `source`/`license`/`coverage` and `dataset_metadata.original_source` say
  so explicitly, and API `is_official` is now computed as `false` for it.
- Region population/coordinates/names reuse the existing illustrative `SEED_REGIONS` constants;
  no boundary geometry is claimed (map points therefore return 0).

### Bootstrap loader

`backend/src/scripts/bootstrap-dataset.ts` (`npm run dataset:bootstrap`):

1. reads and structurally validates the CSV (required columns, row width, numeric fields);
2. normalises it into the canonical contract (regions, 18 indicators, 7 national history rows,
   1512 regional metrics);
3. registers the version, then calls the **existing** `DatasetService.validate()` →
   `ingest()` → `activate()` — no direct analytical inserts;
4. is idempotent: deterministic version id, checksum refreshed only when the derived payload
   changes, and a rerun produced identical version-scoped counts.

`DatasetService` gained an optional in-memory `content` argument on `validate()`/`ingest()` and a
`registerLocalVersion()` method, so the local bootstrap reuses the exact canonical pipeline while
R2 remains the production upload path.

### Exact ingestion evidence (local PostgreSQL 18.6)

| Item | Value |
|---|---|
| Dataset version id | `ds_demo_curated_2025_v1` |
| Version label | `demo-curated-2025-v1` |
| Validation | `validated`, no errors |
| Ingestion | `ingested` |
| Raw records | 1 canonical record (the CSV is normalised into one canonical JSON payload) |
| Version-scoped metadata | 1 |
| Version-scoped regions / indicators | 12 / 18 |
| Version-scoped national history | 7 |
| Version-scoped regional metrics | 1,512 |
| Active versions | exactly 1 |
| Idempotent rerun | version-scoped counts unchanged; still one active version |

Two migration-backed constraints were discovered during ingestion and handled by the loader
(no schema change): `dataset_metadata.status` allows only `synced|overdue`, and
`indicators.unit` is a fixed allowlist (SME density expressed as `percent`).

### Analytical API responses (live, authenticated)

| Endpoint | Status | Observed |
|---|---|---|
| `GET /v1/datasets/active` | 200 | version `ds_demo_curated_2025_v1`, active |
| `GET /v1/overview` | 200 | index 94.9, band `high`, 12 regions, 7 trend points, 3 needs-attention; `kpis=[]` |
| `GET /v1/regions` | 200 | 12 items, `meta.total=12`, first `central_capital` |
| `GET /v1/regions/map-points` | 200 | 0 points (no boundary geometry claimed) |
| `GET /v1/insights/historical?range=7Y` | 200 | 7 points |
| `GET /v1/insights/education` | 200 | 4 KPIs, `is_official=false` (was hardcoded `true`) |
| `GET /v1/insights/priority` | 200 | 10 queue entries, 3 high |
| `GET /v1/insights/data-quality` | 200 | 1 version-scoped source |
| `GET /v1/insights/comparison?a=central_capital&b=frontier` | 200 | `is_official=false` |

Provenance fix: the verified insight paths hard-coded `is_official: true`. They now derive it from
the active version's source/licence, so this synthetic dataset is not presented as official.
`/v1/overview` already carried a synthetic source and a "not an independent official measurement"
disclaimer.

### Tests and gates

- New real-PostgreSQL integration suite `tests/integration/dataset_bootstrap.test.ts`:
  **3/3 passed** — validate→ingest→activate with version-owned rows, idempotent re-ingestion,
  and refusal to activate a never-ingested version. It creates a uniquely named version and
  removes only its own rows, restoring the previously active version.
- Unit suite remains hermetic: **17 files / 230 tests passed** (integration excluded by
  `vitest.config.ts`; run separately with `npm run test:integration`).
- Backend build 0, Prisma validate/generate 0, `git diff --check` 0.
- M1 proof harness and rehearsal untouched (still 304/304 as of Batch 1).

### Remaining issues for Batch 3 (not fixed here)

1. `/v1/overview` `kpis` is hardcoded `[]`; the dashboard has no KPI cards.
2. Sector `index.score` averages mixed-unit KPI values (percent + pupils/teacher + USD) — not a
   valid composite; needs a defined normalisation.
3. `/v1/regions/map-points` returns 0 because no boundary geometry is claimed (illustrative
   regions); map UX needs a decision, not invented polygons.
4. Forecast actuals are still hardcoded (`60.4 … 68.4`) and `ml_forecasts` is not version-scoped;
   model accuracy/provenance needs the Batch 3 review.
5. Seeded legacy rows with `dataset_version_id = NULL` remain (1 history, 4 metadata, plus seeded
   recommendations/forecasts). They are not displayed by version-scoped queries but should be
   reconciled or quarantined.
6. `data_classification` on verified insight responses remains `derived_calculation`; only
   `is_official` was corrected. A explicit `synthetic_demo` classification can be added in Batch 3.

### R2 / upload status and owner checklist

The service is implemented (`presign`, `head`, `download`, `upload`, `delete`, SHA-256 checks)
but **not configured**: `R2Service.configurationStatus()` reports `configured=false`,
`missing=[R2_ACCOUNT_ID]`, `invalid=[R2_BUCKET_NAME]`, `bucketIsPlaceholder=true`. No credential
was invented and the local bootstrap deliberately does not depend on R2.

Owner actions before the upload integration can be tested:

1. Create/confirm a non-production R2 bucket and its public/custom domain if needed.
2. Provide `R2_ACCOUNT_ID`, `R2_BUCKET_NAME` (real, not placeholder), `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_REGION` via the environment/secret store (never a
   tracked file).
3. Allow `PUT`/`GET` for the presigned flow; verify CORS for mobile upload.
4. Run `npm run r2:verify` (writes one test object, verifies checksum, deletes it) and record the
   result before enabling the Flutter upload screen.
5. Minimum code work remaining: the Flutter upload screen (there is none today) and, if desired,
   a documented local adapter for offline demos — not a replacement for R2.

### Batch 3 entry point

Fix the five analytical issues above against the now-active, traceable dataset; no new dataset
ingestion is required.

## Batch 3 — analytics correctness and ML provenance (2026-11-05)

Scope: make the existing analytics and forecasting mathematically correct, traceable and honest.
No UI redesign, no M1/M2 integration, no deployment.

### 1. Overview KPIs (was `kpis: []`)

Five version-scoped KPIs are now computed in `OverviewRepository.getOverview`:

| Key | Formula | Unit | Value now |
|---|---|---|---|
| `national_index` | latest `national_index_history.score` for the active version | `score_100` | 94.9 |
| `average_region_score` | unweighted mean of `regions.score` for the active version | `score_100` | 94.9 |
| `regions_at_risk` | `national_index_history.at_risk_count` | `count` | 0 |
| `tracked_indicators` | count of `indicators` tagged to the active version | `count` | 18 |
| `data_completeness` | `dataset_metadata.completeness_pct` for the active version | `percent` | 100 |

Flutter's `Metric` model already accepts these fields; `count` renders as a plain number (unknown
unit), so no UI change was needed.

### 2. Sector normalization (invalid mixed-unit average removed)

`GET /v1/insights/:sector` no longer averages raw values. For each indicator in the sector:

1. take the latest reference year's regional observations;
2. min-max normalise the national mean against the observed regional range
   (`normalizeToScore`, 0–100);
3. invert the score when `higher_is_better = false`;
4. equal-weight average the normalised scores; missing indicators are excluded and counted.

The response now carries a `normalization` block (method, scale, direction, equal weights,
reference year, indicators used/missing) and `ranking.basis = normalized_sector_composite`.
Education now returns **index 40.4** from 4 indicators; the raw mean of those values
(94.13 %, 90.77 %, 21.91 pupils/teacher, 34.4 %) is ~60.3 — proof the two are not conflated.
Pure functions live in `src/utils/analytics.ts` with 5 deterministic unit tests, including
"different units are never averaged directly".

### 3. Score consistency (definitions, documented)

| Output | Definition | Universe |
|---|---|---|
| National index | unweighted mean of the 12 regional `development_index` values per year | `score_100` |
| Regional score | `development_index` for the latest year | `score_100` |
| Regional change | latest minus previous year | points |
| Sector score | equal-weight mean of direction-adjusted min-max normalised indicators | `0-100` (relative) |
| Indicator KPI | national mean of the latest year's regional values | source unit |
| Historical points | persisted `national_index_history` scores | `score_100` |

The sector composite is explicitly relative (0–100, observed range) and is **not** comparable to
the absolute development index; the response says so via `normalization` and `ranking.basis`.

### 4. Classification and provenance

- `data_classification` describes the RESULT (`derived_calculation`, `experimental_ml`, …).
- New `source_classification` describes the SOURCE dataset (`synthetic_demo` / `official_source`).
- `is_official` is derived, never hardcoded `true`; the synthetic dataset returns `false`.
- Overview and insights responses now carry `source_classification: synthetic_demo`; historical
  returns `derived_calculation` (was `official_observed`).

### 5. Legacy unversioned rows

Seeded rows with `dataset_version_id = NULL` remain in place (1 history, 4 metadata,
11 legacy forecasts, seeded recommendations). Every verified query filters on the active version;
a real-PostgreSQL test inserts an unversioned history row (score 1) and a foreign-version row
(score 2) and proves overview output is unchanged (same period, score, trend and attention list).
Nothing was deleted.

### 6. ML forecasting (hardcoded actuals removed)

- **Model:** ordinary least-squares linear trend on the national index (one feature: year),
  `backend/src/scripts/generate-forecasts.ts`.
- **Actuals:** read from `national_index_history` of the active version — the previous hardcoded
  2021–2025 series (60.4 … 68.4) is gone from the API.
- **Evaluation:** temporal holdout, train 2019–2023, test 2024–2025 → **MAE 0.210, RMSE 0.216**
  (fit residual σ 0.086, slope 0.261). These describe fit to the synthetic series, not real-world
  skill; the API marks `evaluation.status = "unavailable"` and publishes no R².
- **Persistence:** 5 forecasts (2026–2030) now carry `dataset_version_id = ds_demo_curated_2025_v1`,
  `model_name = linear_trend_baseline`, `model_version = 1.0.0`,
  `forecast_source = experimental_ml`, `validation_status = experimental`.
- **Migration:** `20261105140000_add_forecast_dataset_version` adds the nullable column, a
  `SET NULL` FK and an index. Tested on a disposable database first, then applied to
  `decidix_dev` (11 migrations total, `migrate status` up to date).
- **API:** default prediction status is now `experimental`; only the producing model is listed
  (`r2: null`); provenance is `experimental_ml` / `synthetic_demo` with the dataset version and
  2019–2025 observation period. Predictions fail closed when no version-scoped forecasts exist.
- `ml/models/backend_backtest.json` records the reproducible metrics and model inputs.

### Exact live results (authenticated, local)

| Endpoint | Result |
|---|---|
| `GET /v1/overview` | 200, `kpis=5`, index 94.9, `source_classification=synthetic_demo` |
| `GET /v1/insights/education` | 200, index 40.4, `normalization.method=min_max_across_regions_per_indicator`, 4 indicators used, `is_official=false` |
| `GET /v1/insights/historical?range=7Y` | 200, 7 points, `data_classification=derived_calculation`, `is_official=false` |
| `GET /v1/intelligence/predictions?target_year=2028` | 200, projected 95.8, 7 actuals (2019–2025), 3 forecasts (2026–2028), model `linear_trend_baseline`, `r2=null`, provenance `experimental_ml/synthetic_demo` |

### Tests and gates

- Unit: **18 files / 235 tests passed** (5 new normalization tests; forecast/API tests updated to
  the DB-sourced contract).
- Real PostgreSQL integration: **8/8 passed** (5 new: KPIs, sector normalization, unversioned/
  foreign-version isolation, historical trends, DB actuals + version-scoped forecasts).
- Flutter: `flutter analyze` 0 issues; **222 tests passed, 2 skipped**.
- Python ML: 4 passed. Backend build 0. Prisma validate/generate 0.
- `git diff --check` exit 0; schema diff still has 0 destructive statements.

### Remaining (not Batch 3 blockers)

1. `/v1/regions/map-points` still returns 0 — no boundary geometry is claimed for the illustrative
   regions (a UX decision, not invented polygons).
2. Sector KPI cards carry their true units; only the composite is normalized. The old
   `breakdown.bars` remains empty (the verified path never populated it).
3. Legacy unversioned forecast rows remain in `ml_forecasts` (filtered out by version); they can
   be pruned later without affecting the active dataset.
4. `available_years` stays `[2027, 2028, 2030]` for the existing Flutter selector even though
   2026–2030 rows exist.

### Files changed in Batch 3

- `backend/src/utils/analytics.ts` (new), `backend/tests/analytics_normalization.test.ts` (new).
- `backend/src/repositories/overview.repository.ts` (KPIs, source classification).
- `backend/src/repositories/insights.repository.ts` (normalized sector, provenance).
- `backend/src/repositories/forecast.repository.ts` (DB actuals, version filter, honest models).
- `backend/src/scripts/generate-forecasts.ts` (new), `backend/prisma/migrations/20261105140000_*`.
- `backend/prisma/schema.prisma` (forecast version column/relation), `package.json` scripts.
- Tests updated: `forecast.test.ts`, `api.test.ts`, `overview_version_isolation.test.ts`;
  new `tests/integration/analytics_batch3.test.ts`.

## Final integration and staging deployment (2026-11-05)

### Chatbot grounding (implemented and verified locally)

- Added `backend/src/services/evidence.service.ts`: deterministic, active-version evidence for the
  national index, history, named regions, sector indicator means, specific indicators, experimental
  forecasts and dataset provenance. It refuses unsupported geography and unrelated questions.
- `AiAssistantService` now merges structured evidence with RAG documents and never calls OpenRouter
  with zero evidence. The deterministic fallback cites up to three documents, and `sources` use the
  real document titles/periods.
- OpenRouter: the configured `meta-llama/llama-3.3-70b-instruct:free` model returned **404** and was
  replaced locally with an available free model, `google/gemma-4-31b-it:free`. In the 7-question run,
  one answer came from the real model and the rest hit HTTP 429 (free-tier rate limit) and used the
  grounded deterministic fallback. No paid model or web search was used.
- Grounding results: national index 94.9 (2025), regional comparison, 7-year history, education
  indicators (4 KPIs, units preserved), experimental 2026–2030 forecast, Germany question refused
  with no sources, prompt-injection question answered only from the stored 94.9 evidence.

### Flutter

- Added email/password sign-in (`AuthNotifier.signInWithPassword`) against backend `/auth/login`,
  with persistent tokens, session restore path unchanged, and bilingual fields/buttons on the
  existing login screen. Google and demo paths are untouched.
- `flutter analyze`: 0 issues. `flutter test`: **222 passed, 2 skipped**.
- Release APK built with `env/staging.json` (mock disabled, HTTPS staging API):
  `build/app/outputs/flutter-apk/app-release.apk`, **61,650,757 bytes**, SHA-256
  `068DAFA1A82FA60B18C24CD4FCF39740B0DA3913C2073BEA5239C710E3FFD0E1`,
  package `com.decidixteam.app`, version `1.0.0+1`.
- No Android device was attached (`adb devices` empty; `flutter devices` only Windows/Chrome/Edge),
  so physical-device verification is **pending**, not claimed.

### Heroku staging deployment (completed)

- Preflight: app `decidix-backend-staging`, previous release v7 at `25d782f4`, 5 migrations applied,
  fresh backup `b005` (2026-11-05) captured before any schema change.
- Reviewed six additive migrations (device tokens, forecast defaults, Google subject,
  dataset versions, analytical lineage, forecast dataset version). Applied them to staging:
  **11/11 migrations**. No destructive changes, no reset.
- Deployed on top of the deployed commit (fast-forward, no force): `25d782f4` → `fefda8c` →
  **`81e8ab4`** (current release **v10**). Heroku ran `prisma migrate deploy` during build and
  reported no pending migrations.
- One startup crash was found and fixed: the production CORS guard rejected `CORS_ORIGIN=*`.
  `CORS_ORIGIN` was set to the explicit staging origin (not a secret) and the dyno came up.
- Verified live: `/v1/health` 200 `healthy`, `database: connected`; `/v1/overview` 503
  `DATASET_NOT_CONNECTED` (fail-closed, no fixture leak); `/v1/datasets/active` 401 anonymous;
  `POST /v1/auth/login` 401 for invalid credentials; `POST /v1/auth/google` 503
  `GOOGLE_CONFIG_MISSING` (route exists; config absent).
- Staging has **no active dataset** (and no known seed password), so staging analytics are
  intentionally unavailable. The working end-to-end demo is the local stack.

### R2 / dataset upload

- R2 remains unconfigured locally and on staging: `R2_ACCOUNT_ID` missing, bucket placeholder;
  staging has no `R2_*` config keys at all. No credentials were invented and no object test was run.
- The backend presign/complete/validate/ingest/activate flow is intact but cannot be exercised
  without a bucket. The Flutter upload screen is **not implemented** (needs a file picker plus a
  configured bucket); this is the main remaining feature gap.

### Final local gates

Backend build 0; unit **235/235**; real-PostgreSQL integration **8/8**; Prisma validate 0;
Python ML 4/4; Flutter analyze 0 and 222 passed / 2 skipped; `git diff --check` 0.

### Remaining blockers

1. R2 credentials/bucket (owner) and the Flutter upload UI.
2. Google OAuth client ID/fingerprints on staging (owner); email/password works.
3. Staging active dataset + known demo password (owner decision) for a staging-hosted demo.
4. Android device for physical verification.
