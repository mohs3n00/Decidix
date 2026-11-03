# Decidix — Database Migration & Seeding Runbook

**Document Version:** 2.0.0  
**Status:** Approved Master Specification  
**ORM Tool:** Prisma Migrate (`prisma migrate`)  
**Target Engine:** PostgreSQL 15+ (Heroku Postgres `essential-0`)  

---

## 1. Migration Lifecycle & Strategy

Database schema evolution is managed via versioned, reproducible SQL migrations generated and executed through the Prisma CLI.

### The Migration Lifecycle

```mermaid
flowchart LR
    DevSchema["Edit schema.prisma (Local Dev)"] --> DevMigrate["npx prisma migrate dev"]
    DevMigrate --> SQLFiles["prisma/migrations/YYYYMMDD_name/migration.sql"]
    SQLFiles --> GitCommit["Git Commit Migration Files"]
    GitCommit --> HerokuPush["git subtree push to Heroku"]
    HerokuPush --> ReleasePhase["Release Phase: prisma migrate deploy"]
    ReleasePhase --> ProductionDB["Heroku Postgres (Schema Updated)"]
```

---

## 2. Baseline Migration & Dual-Database Deployment Runbook

The consolidated baseline migration is located at:
`backend/prisma/migrations/0_init/migration.sql`

### Case 2.1: Fresh Database Provisioning
For new environments (e.g. newly provisioned Heroku Postgres staging or test databases):

```bash
# Apply baseline and pending migrations to fresh database
npx prisma migrate deploy
```

This runs `0_init/migration.sql` and `20261102203000_add_sessions/migration.sql` in full, creating extensions (`uuid-ossp`, `pgcrypto`, `vector`), 14 canonical tables, foreign keys, and indexes, and records migrations in `_prisma_migrations`.

### Canonical Migration Authority: Prisma Migrate vs Legacy SQL Runner
The repository contains both Prisma migrations (`backend/prisma/migrations/`) and legacy raw SQL runner scripts (`backend/src/database/migrate.ts`). 
- **Canonical Authority:** `prisma migrate deploy` is the single source of truth for all production, staging, and CI environments.
- **Release Automation:** Heroku executes `npx prisma migrate deploy` in the release phase.
- **Parity Guarantee:** Any DDL changes must be generated via Prisma CLI and committed to `backend/prisma/migrations/`.

### Case 2.2: Existing Database Baseline Adoption
If connecting to an existing PostgreSQL database where tables were previously created via raw SQL:

```bash
# Mark the 0_init baseline as already applied WITHOUT re-running SQL
npx prisma migrate resolve --applied 0_init
```

This registers the baseline in `_prisma_migrations` so subsequent migrations apply cleanly without attempting to recreate existing tables or causing data loss.

---

## 3. Heroku Release Phase Automation

Heroku executes the `release` phase command defined in `backend/Procfile` before routing traffic to new dynos:

```text
release: npx prisma migrate deploy
```

### Guarantees of the Release Phase:
1. **Zero-Downtime:** If migrations fail, the deployment is aborted immediately, and existing dynos continue serving traffic on the previous version.
2. **Deterministic Sequence:** Migrations execute against the live `DATABASE_URL` in strict chronological order.
3. **Audit Trail:** Applied migrations are recorded in the `_prisma_migrations` table with execution checksums and timestamps.

---

## 3. Seed Execution & Initial Data Loading

After applying initial migrations, the database must be seeded with regional data, sectoral indicators, active development projects, and test accounts.

### Data Seed Contents (`backend/src/database/seed.ts`):
1. **12 Administrative Regions:** Exact coordinates, populations, areas, and priorities matching Figma designs (`central_capital`, `frontier`, `highland`, `coastal_haven`, etc.).
2. **Sector Indicators:** Historical baseline metrics (2018–2025) for education (literacy, teacher ratios), healthcare (hospital beds, infant mortality), economy (unemployment, GDP per capita), and infrastructure (water, electricity, roads).
3. **Development Projects:** Active initiatives (e.g., Clean Water Access, Regional Healthcare Center) with milestone dates and budgets.
4. **Pre-Seeded User Accounts:**
   - **Admin:** `admin@decidix.gov` (Role: `ADMIN`)
   - **Lead Analyst:** `analyst@decidix.gov` (Role: `ANALYST`)
   - **Regional Planner:** `planner@decidix.gov` (Role: `PLANNER`)

### Executing the Seed on Heroku
```bash
# Execute seed inside an ephemeral one-off dyno
heroku run "node dist/database/seed.js" -a decidix-backend-demo
```

---

## 4. Rollback & Migration Recovery Runbook

### Case A: Rolling Back a Failed Migration in Production
If a migration fails during the release phase or introduces an unexpected bug:

1. **Write a Reversion Migration:**
   Modify `backend/prisma/schema.prisma` to revert the problematic table or column, then generate a forward rollback migration:
   ```bash
   npx prisma migrate dev --name revert_feature_x
   ```
2. **Deploy the Reversion:** Commit and push the new migration to Heroku.

### Case B: Resolving Migration State (`_prisma_migrations`)
If a network blip causes Prisma to record a migration as failed:

```bash
# Check migration status
heroku run "npx prisma migrate status" -a decidix-backend-demo

# Mark migration as rolled back so it can be safely reapplied
heroku run "npx prisma migrate resolve --rolled-back 20261102120000_name" -a decidix-backend-demo
```

