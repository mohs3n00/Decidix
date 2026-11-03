# Decidix — Database Backup & Disaster Recovery Runbook

**Document Version:** 2.0.0  
**Status:** Approved Master Specification  
**Platform:** Heroku Postgres (`essential-0`)  
**Recovery Targets:** RTO < 30 Minutes | RPO < 24 Hours  

---

## 1. Overview & Objectives

Data integrity and fast disaster recovery are vital to prevent accidental data corruption or demo interruptions during thesis defenses and academic reviews.

This runbook establishes:
1. Automated daily database snapshots using native Heroku PG Backups.
2. Manual pre-demo snapshot protocols.
3. Rapid restoration procedures to return the database to a known clean state in $<10\text{ minutes}$.

---

## 2. Backup Schedules & Automation

Heroku Postgres provides built-in backup automation without third-party tools:

### Step 2.1: Schedule Automated Daily Backups
Schedule automated daily backups at 02:00 UTC:

```bash
heroku pg:backups:schedule DATABASE_URL --at '02:00 UTC' -a decidix-backend-demo
```

### Step 2.2: Verify Backup Schedule
```bash
heroku pg:backups:schedules -a decidix-backend-demo
```

---

## 3. Manual Backup Protocol (Pre-Demo & Pre-Defense)

Before every live demonstration, feature deployment, or grading evaluation, the developer must capture a manual snapshot and download an offsite copy:

```bash
# 1. Capture manual snapshot
heroku pg:backups:capture -a decidix-backend-demo

# 2. View available backups
heroku pg:backups -a decidix-backend-demo

# 3. Download the latest backup locally (offsite copy)
heroku pg:backups:download -a decidix-backend-demo -o decidix_backup_latest.dump
```

---

## 4. Disaster Recovery & Database Restoration

If the database is corrupted, polluted with invalid test records, or fails during testing:

### Option A: Restore from the Latest Heroku Cloud Backup
```bash
# 1. Put the app in maintenance mode to prevent incoming writes
heroku maintenance:on -a decidix-backend-demo

# 2. Restore the latest backup
heroku pg:backups:restore -a decidix-backend-demo --confirm decidix-backend-demo

# 3. Turn off maintenance mode
heroku maintenance:off -a decidix-backend-demo
```

### Option B: Reset Database & Reseed to Clean Demo State
If a clean slate is required immediately before a live defense:

```bash
# 1. Reset the database
heroku pg:reset DATABASE_URL -a decidix-backend-demo --confirm decidix-backend-demo

# 2. Re-run migrations
heroku run "npx prisma migrate deploy" -a decidix-backend-demo

# 3. Re-seed demo data
heroku run "node dist/database/seed.js" -a decidix-backend-demo
```

---

## 5. Pre-Defense Readiness Checklist

- [ ] Run `heroku pg:backups:capture` 2 hours prior to the presentation.
- [ ] Download `decidix_backup_latest.dump` to local disk.
- [ ] Confirm `curl https://<app>.herokuapp.com/health` returns HTTP 200.
- [ ] Verify that the Flutter client connected to staging/prod displays all 12 regions with valid indices.
- [ ] Test OpenRouter connectivity by running a test question in the AI Assistant screen.

