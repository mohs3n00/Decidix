# Decidix Backend — Heroku Staging Deployment Runbook

**Document Version:** 4.0.0 (Phase D2 Live Staging Deployed & Verified)  
**Live Application:** `decidix-backend-staging`  
**Web URL:** `https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/`  
**Live API Base:** `https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1`  
**Target Region:** `eu` (Europe Common Runtime)  
**Runtime Stack:** `heroku-24` (Ubuntu 24.04 LTS / Node.js 24.x LTS)  
**Database Plan:** `heroku-postgresql:essential-0` (`postgresql-rugged-61997`, PG 18.4)  
**Extensions Active:** `uuid-ossp` (1.1), `pgcrypto` (1.4), `vector` (0.8.2)  
**Compute Plan:** `web: 1 x Basic` ($7.00/mo covered under GitHub Student Credit, $291.23 remaining)  
**Permanent Zero-Cost Policy:** Strictly ZERO external AI API spending ($0.00 spent).  

---

## 1. Prerequisites Checklist

- [x] Heroku CLI installed and authenticated (`mohsn9165@gmail.com`).
- [x] GitHub Student Pack credit active ($291.23 remaining through June 2028).
- [x] Application provisioned: `decidix-backend-staging` in `eu` region.
- [x] Database attached: `heroku-postgresql:essential-0` (PG 18.4, 20 max connections).
- [x] Required PostgreSQL extensions enabled (`uuid-ossp`, `pgcrypto`, `vector` 0.8.2).
- [x] Automated Prisma migrations applied in release phase (5 migrations).
- [x] Authoritative seed script and RAG vector population verified (12 regions, 11 forecasts, 3 RAG docs with native vectors).
- [x] Production environment variables configured with zero-cost AI policy enforcement.
- [x] Backend deployed via Git subtree push (`web.1` up and healthy).
- [x] All 10 live backend staging endpoints verified (auth, predictions, simulations, grounded RAG, DB writes).
- [x] Flutter client integrated (`env/staging.json` updated with live staging URL).
- [x] Flutter test suites passing (24/24 contract, 10/10 decisions, 184/184 full suite).

---

## 2. Comprehensive 12-Step Staging Deployment Runbook

### Step 1: Create the Heroku Application
Create the dedicated staging application in the European region:
```bash
heroku create decidix-backend-staging --region eu --stack heroku-24
```

### Step 2: Select the Intended Region
Verify that the app was provisioned in the `eu` region:
```bash
heroku info -a decidix-backend-staging | grep Region
# Expected: Region: eu
```

### Step 3: Attach the Approved PostgreSQL Plan
Provision the student-budget-approved PostgreSQL `essential-0` tier:
```bash
heroku addons:create heroku-postgresql:essential-0 -a decidix-backend-staging
```
Verify attachment and retrieve database status:
```bash
heroku pg:info -a decidix-backend-staging
```

### Step 4: Configure Environment Variables
Set production environment variables. Secrets must be generated locally and never hardcoded in git:

```bash
# Generate high-entropy secrets locally
JWT_SECRET=$(openssl rand -hex 32)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)

heroku config:set -a decidix-backend-staging \
  NODE_ENV=production \
  PORT=5000 \
  API_PREFIX=/v1 \
  CORS_ORIGIN=* \
  DATABASE_SSL=true \
  JWT_SECRET="$JWT_SECRET" \
  REFRESH_TOKEN_SECRET="$REFRESH_TOKEN_SECRET" \
  JWT_EXPIRES_IN=7d \
  OPENROUTER_API_KEY="sk-or-v1-..." \
  OPENROUTER_MODEL="meta-llama/llama-3.3-70b-instruct:free" \
  OPENROUTER_FALLBACK_MODEL="openrouter/free" \
  OPENROUTER_EMBEDDING_MODEL="local/deterministic-fnv1a-v1" \
  OPENROUTER_REQUEST_TIMEOUT_MS=10000 \
  ZERO_COST_ENFORCEMENT=true \
  RAG_SIMILARITY_THRESHOLD=0.65
```

> [!IMPORTANT]
> `DATABASE_URL` is injected automatically by the `heroku-postgresql` add-on. Do NOT manually overwrite `DATABASE_URL`.

### Step 5: Enable Required PostgreSQL Extensions
Connect to the database via Heroku CLI psql to enable `uuid-ossp`, `pgcrypto`, and `vector`:
```bash
heroku pg:psql -a decidix-backend-staging -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
heroku pg:psql -a decidix-backend-staging -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
heroku pg:psql -a decidix-backend-staging -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```
Verify extension installation:
```bash
heroku pg:psql -a decidix-backend-staging -c '\dx'
```

> [!IMPORTANT]
> **Staging Prerequisite: pgvector Extension:**
> Heroku Postgres supports `vector` on PostgreSQL 15+ (`essential-0` on `heroku-24`).
> The `vector` extension is a **required staging prerequisite** for PostgreSQL database-backed vector storage and similarity retrieval.
> If `vector` is absent, PostgreSQL stores no vectors and cannot execute SQL cosine distance queries (`<=>`). In that scenario, the application bypasses database vector search and relies solely on ephemeral in-memory cosine similarity over seeded documents. Therefore, enabling `vector` in Step 5 is mandatory for full database-backed RAG functionality.


### Step 6: Run Prisma Migrations
The `release` phase defined in `backend/Procfile` executes `npx prisma migrate deploy` automatically on deployment. To run migrations manually or verify pending migrations:
```bash
heroku run "npx prisma migrate deploy" -a decidix-backend-staging
```

### Step 7: Run Authoritative Seed Script
Populate the 12 regions, indicators, national baseline index, projects, citizen reports, AI recommendations, dataset catalog, and validated ML forecasts:
```bash
heroku run "node dist/database/seed.js" -a decidix-backend-staging
```

### Step 8: Deploy the Backend
Deploy the backend package using Git subtree:
```bash
git subtree push --prefix backend https://git.heroku.com/decidix-backend-staging.git main
```
Tail deployment logs:
```bash
heroku logs --tail -a decidix-backend-staging
```

### Step 9: Configure Flutter Staging Client
Update `env/staging.json` with the live staging API address and disable mock mode:
```json
{
  "USE_MOCK": false,
  "API_BASE_URL": "https://decidix-backend-staging.herokuapp.com/v1"
}
```

### Step 10: Perform Smoke and Integration Tests
Execute external API health probes and contract checks against live staging:

```bash
# 1. Heroku liveness probe
curl -s https://decidix-backend-staging.herokuapp.com/health | jq .
# Expected: { "status": "ok", "service": "decidix-backend", "version": "1.0.0", ... }

# 2. Detailed subsystem probe (Database ping, zero-cost policy enforcement)
curl -s https://decidix-backend-staging.herokuapp.com/v1/health | jq .
# Expected: { "status": "ok", "database": "connected", "ml_engine": "ready", "zero_cost_policy": "enforced", ... }

# 3. National Overview contract check
curl -s https://decidix-backend-staging.herokuapp.com/v1/overview | jq .data.index.score
# Expected: 68.4

# 4. Regions directory check
curl -s "https://decidix-backend-staging.herokuapp.com/v1/regions?page=1&per_page=5" | jq .data | jq length
# Expected: 5

# 5. What-If Simulator test
curl -s -X POST https://decidix-backend-staging.herokuapp.com/v1/decisions/simulate \
  -H "Content-Type: application/json" \
  -d '{"region_id":"frontier","allocations":{"education":30000000,"healthcare":45000000,"infrastructure":20000000,"economy":25000000}}' \
  | jq .data.projected_score
# Expected: 51.0
```

### Step 11: Rollback and Recovery Procedures

#### A. Application Release Rollback (Non-Destructive)
If a newly deployed build exhibits regressions or errors, roll back immediately without modifying database contents:
```bash
# 1. View deployment release history
heroku releases -a decidix-backend-staging

# 2. Roll back to the previous stable release (e.g., v4)
heroku rollback v4 -a decidix-backend-staging
```

#### B. Pre-Migration Snapshot (Safety Requirement)
Always capture a manual snapshot before executing new schema migrations:
```bash
heroku pg:backups:capture -a decidix-backend-staging
```

#### C. Database Recovery via Snapshot Restore (Non-Destructive Rollback)
If a schema migration introduces breaking data corruption, restore from the captured snapshot without destroying the database instance:
```bash
# 1. View captured snapshots
heroku pg:backups -a decidix-backend-staging

# 2. Restore from specific backup snapshot (e.g., b001)
heroku pg:backups:restore b001 DATABASE_URL -a decidix-backend-staging --confirm decidix-backend-staging
```

> [!CAUTION]
> `heroku pg:reset` is a **DESTRUCTIVE** command that permanently drops all PostgreSQL tables, schemas, and records. It must NEVER be used for routine rollbacks. It is reserved strictly for complete environment wipes and re-initialization during major milestone resets.

#### D. Disaster Recovery / Clean Re-initialization (DESTRUCTIVE ONLY)
Only if total environment re-initialization is required:
```bash
heroku pg:reset DATABASE_URL -a decidix-backend-staging --confirm decidix-backend-staging
heroku run "npx prisma migrate deploy" -a decidix-backend-staging
heroku run "node dist/database/seed.js" -a decidix-backend-staging
```

### Step 12: Cost Control & Resource Shutdown Guidance

1. **Credit Envelope Guard:**
   - Dyno cost: `eco` (\$5.00/mo) or `basic` (\$7.00/mo).
   - Database cost: `essential-0` (\$5.00/mo).
   - Total cost: \$10.00–\$12.00/mo (within \$13.00/mo GitHub Student credit envelope).
2. **Idle Scaling:**
   When testing is suspended or between development milestones, scale dyno to 0 to conserve dyno hours:
   ```bash
   heroku ps:scale web=0 -a decidix-backend-staging
   ```
   Resume testing:
   ```bash
   heroku ps:scale web=1 -a decidix-backend-staging
   ```
3. **De-provisioning Staging (Tear Down):**
   When the staging environment is no longer needed:
   ```bash
   heroku apps:destroy decidix-backend-staging --confirm decidix-backend-staging
   ```
