# Decidix Staging Release Package

**Prepared:** 2026-11-04  
**Source branch:** `recovery/stabilization`  
**Source commit:** `a4c5bbdadf38f186e602ba78805d018c3bac2767`  
**Deployment performed:** No  
**Production database or infrastructure changed:** No

This package is a release-readiness bundle for owner review. It does not authorize
deployment, migration, seeding, secret changes, or production writes.

## Package contents

- Backend release workflow: [deploy_staging.yml](../.github/workflows/deploy_staging.yml)
- Backend build and test commands: `npm --prefix backend run build`,
  `npm --prefix backend test`
- Flutter staging artifact command:
  `flutter build apk --debug --dart-define-from-file=env/staging.json`
- Read-only staging probe: [staging_probe.mjs](../scripts/staging_probe.mjs)
- Prisma migration inventory under `backend/prisma/migrations/`
- Migration runbook: [database_migration.md](./database_migration.md)
- Environment inventory: [environment_variables.md](./environment_variables.md)

## Local release gates

| Gate | Command | Result |
|---|---|---|
| Backend build | `npm --prefix backend run build` | Passed |
| Backend tests | `npm --prefix backend test` | 173/173 passed |
| Prisma schema | `Push-Location backend; npx prisma validate` | Passed |
| Flutter analysis | `flutter analyze` | Passed in prior checkpoint |
| Flutter tests | `flutter test` | 211 passed, 2 skipped in prior checkpoint |
| Staging APK | `flutter build apk --debug --dart-define-from-file=env/staging.json` | Passed in prior checkpoint |
| ML tests | `pytest -q` from `ml` | 4/4 passed in prior checkpoint |

These are local or test-environment results. They are not live staging or
real-device acceptance evidence.

## Migration review

Pending migrations are:

1. `20261102203000_add_sessions`
2. `20261102220000_add_ml_forecasts`
3. `20261103102000_fix_users_role_check`
4. `20261103102500_widen_ml_forecast_id`
5. `20261103120000_add_device_tokens`
6. `20261104170000_safe_forecast_defaults`
7. `20261104173000_add_google_subject`
8. `20261104190000_add_dataset_versions`

Migration SQL SHA-256 manifest:

| Migration | SHA-256 |
|---|---|
| `0_init` | `C6677812F4AD67C3DDC7971ED584E0DD33E8FF4C865E7E7FCDF12C77A4882ECE` |
| `20261102203000_add_sessions` | `734E09D3D8B3E484E5AE3C3094715615BABA859C1BAF44F6A05D4B0F72EE7444` |
| `20261102220000_add_ml_forecasts` | `4167BFE3CD95BE2C160A338DFF843C5E59E6DCE4B537505CF44A1B4C872388DF` |
| `20261103102000_fix_users_role_check` | `3D613CF90232729F87A33CC3AA060C4CE87D63C3FF0D1561DB05099FF5BA1D9F` |
| `20261103102500_widen_ml_forecast_id` | `B93C05FC02D2C73BBC6423EE03990B8FBF495CAB5467795FE63BABC8D86C1EE8` |
| `20261103120000_add_device_tokens` | `6678559610752DEDA33BFE6959712C6FF61E2A24E7153DBC39C61564AD6C76A6` |
| `20261104170000_safe_forecast_defaults` | `6586453B929DC9C41D35B8F9947536C5E55797402863E3CBA57593BF1E1EC029` |
| `20261104173000_add_google_subject` | `B84694917A2DC2F63596EC9029A0A8B4E1391DA0DCB68C88E1F5BEBD02088EFB` |
| `20261104190000_add_dataset_versions` | `709B67F85667B49DEF5FDEB1EEC5EA28865AA3EA2214DBCEDDB5F510B2A68AD7` |

The migration SQL was reviewed locally and the Prisma schema validates. The
dataset migration adds versioned metadata and records, then links RAG documents
to a dataset version. The forecast-default migration changes defaults only and
does not rewrite existing rows. The Google subject migration adds a nullable
unique column. No migration was applied to any live database.

Before staging execution, the owner must provide a backup, confirm the target
database, approve the ordered migration list, and define the rollback/recovery
owner. Prisma migrations are forward-only; rollback requires a reviewed forward
reversion migration or restoration from the approved backup.

## Staging probe evidence

Command:

```powershell
node scripts\staging_probe.mjs
```

The probe was corrected to avoid account creation and is now read-only. The
corrected probe observed **1/14 checks passed**: the protected admin route
returned the expected unauthenticated 401. The remaining checks exposed the
following release blockers:

- Dataset-gated routes returned HTTP 200 fixture/legacy data instead of
  `503 DATASET_NOT_CONNECTED`.
- Fixture IDs were present in recommendations, projects, and citizen reports.
- Assistant output contained a fabricated ministry citation pattern.
- `POST /auth/google` returned HTTP 404.
- The prior probe’s registration check created a throwaway staging account and
  observed that the deployed service accepted `role: admin`. Its exact
  identifier was not captured; the generated form was
  `probe_<timestamp>@example.invalid`. Do not guess or delete it. The staging
  owner must identify it from provider logs and obtain approval before removal;
  this check must not be repeated.

This evidence identifies a deployed-SHA/configuration mismatch. It does not
prove the current working tree is deployed.

## Deployment procedure after owner approval

1. Confirm the Heroku staging app, target branch, database, backup, rollback
   owner, observability owner, and release window.
2. Run the workflow with `dry_run=true` and retain the workflow URL and logs.
3. Reconcile the deployed commit/build manifest with the reviewed source.
4. Configure secrets only in Heroku; do not place them in GitHub files, APK
   defines, logs, or this repository.
5. Apply migrations through the release phase only after backup and explicit
   approval.
6. Run the corrected read-only staging probe, numerical audit, contract/RBAC
   suite, and health checks.
7. Install the exact APK on an authorized Android device and record Google
   sign-in, refresh, logout, RTL, offline, map, and notification evidence.
8. Stop and record a blocker if any P0 gate fails; do not promote or claim
   readiness.

## Owner-action checklist

### Google Console and Android

- [ ] Confirm Firebase project and package `com.decidixteam.app`.
- [ ] Register the release/staging SHA-1 fingerprints for the reviewed signing
  key and debug/staging key where applicable.
- [ ] Download the matching `google-services.json` through the approved channel.
- [ ] Confirm the server OAuth client ID/audience for staging.
- [ ] Provide an authorized Android device with Google Play Services and `adb`
  access.
- [ ] Execute real sign-in, wrong-audience rejection, refresh, logout, and
  account-switching checks.

### Dataset and geography

- [ ] Select the country and administrative level.
- [ ] Supply official region names, stable codes, and approved boundary source.
- [ ] Supply the official dataset, licence/permission evidence, vintage, owner,
  refresh cadence, and checksum.
- [ ] Approve the lineage and classification of every displayed metric.
- [ ] Do not activate ingestion until all provenance fields are complete.

### R2

- [ ] Provide a non-production bucket and endpoint.
- [ ] Provide secret-manager names for access credentials; never commit values.
- [ ] Confirm object prefix, retention, encryption, and permitted operators.
- [ ] Approve upload/download/checksum/quarantine/retention probes.

### Staging deployment and PostgreSQL

- [ ] Confirm Heroku app name, release process, database, and observability owner.
- [ ] Provide a fresh backup and approve the ordered Prisma migration list.
- [ ] Confirm rollback/recovery procedure and owner.
- [ ] Set `DATABASE_URL`, `DATABASE_SSL`, JWT/session secrets, Google audience,
  and zero-cost AI configuration in Heroku only.
- [ ] Run the workflow dry run, then authorize deployment separately.
- [ ] Reconcile deployed SHA before live acceptance.
- [ ] Run the staging probe, migration verification, numerical audit, contract
  tests, RBAC matrix, and device acceptance.
