# Versioned data model — PostgreSQL proof harness

This directory holds the executable proof for
`docs/DECIDIX_VERSIONED_DATA_ARCHITECTURE_PROPOSAL.md` (model v2).

**Status: NOT YET EXECUTED.** No PostgreSQL server, client, or container runtime exists
on the development host, so no database result is claimed. The harness is ready for the
project owner to run on a disposable local instance.

## Safety contract

| Rule | Enforcement |
| --- | --- |
| Target comes only from `PROOF_DATABASE_URL` | The application `DATABASE_URL` is read **only** to compare targets, never to connect |
| Loopback only | Host must be `localhost`, `127.0.0.1`, or `::1` (`guard.mjs`) |
| Disposable database only | Name must match `^decidix_proof_[A-Za-z0-9_]+$` |
| Never the app database | Refused when host + port + database equal the configured app target, even with different credentials |
| No clobbering | Refuses to start if the `proof` schema already exists |
| Owned cleanup only | Drops `proof` only when this run created it; never drops a database or any other schema |
| No credential leakage | URLs and passwords are redacted from every message and error path |

The guards are pure functions in `guard.mjs` and are tested without any database in
`backend/tests/proof_guard.test.ts`.

## What it proves — 24 assertions

| Assertions | Scenario |
| --- | --- |
| A1–A4 | Activate A: pointer, region scores, national index, regional metric |
| B1–B6 | Activating B leaves A's rows and values untouched; pointer and B values correct |
| R1–R4 | Roll back to A: pointer, scores, index restored; B's rows preserved |
| E1–E2 | Invalid (`uploaded`) activation rejected; pointer unchanged |
| E3 | Duplicate observation inside one version rejected (`23505`) |
| E4 | Shared region keys isolated per version (50 vs 60) |
| E5–E6 | Concurrent activation yields one pointer and two audit rows |
| E7–E8 | Mid-transaction failure raised; no partial rows survive |
| E9–E10 | Raw records retained for both versions; deleting a version with evidence rejected (`23503`) |

All fixtures are **synthetic**, labelled `test-only`. No official data is used.

## Run on Windows (PowerShell)

Requires PostgreSQL 14+ installed locally and `createdb` on `PATH`.

```powershell
# 1. Create the disposable database (name must start with decidix_proof_)
createdb -h localhost -p 5432 -U postgres decidix_proof_v1

# 2. Run the proof without ever putting the password in shell history
cd E:\decidix_app\backend
$secure = Read-Host "Password for postgres@localhost:5432" -AsSecureString
$plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$env:PROOF_DATABASE_URL = "postgresql://postgres:$([uri]::EscapeDataString($plain))@localhost:5432/decidix_proof_v1"
node prisma/proof/run_proof.mjs
$code = $LASTEXITCODE
Remove-Item Env:PROOF_DATABASE_URL
Remove-Variable plain, secure

# 3. Drop the disposable database when done
dropdb -h localhost -p 5432 -U postgres decidix_proof_v1
exit $code
```

Expected tail on success:

```
24/24 proof assertions passed.
PROOF PASSED against real PostgreSQL.
```

Exit codes: `0` all assertions passed, `1` an assertion failed, `2` a guard refused
(missing/invalid URL, non-loopback host, non-proof database, app-database match, or an
existing `proof` schema). A `BLOCKED:` line is a refusal, not a result.

If a run was interrupted and the `proof` schema remains, drop it explicitly after
confirming the database is disposable — the runner will not do it for you:

```sql
DROP SCHEMA proof CASCADE;
```

## After a successful run

Record the command, database name, server version (`SELECT version()`), and the exact
`n/n` count in `docs/DECIDIX_RECOVERY_STATUS.md`. Do not mark the versioned model
verified until that output exists.
