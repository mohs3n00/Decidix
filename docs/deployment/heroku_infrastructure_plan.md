# Decidix — Heroku-First Master Infrastructure Plan

**Document Version:** 2.0.0  
**Status:** Approved Master Infrastructure Architecture  
**Target Environment:** Heroku Common Runtime (`eu` Region)  
**Host Account:** `mohsn9165@gmail.com` (Authenticated Heroku CLI)  
**Budgetary Envelope:** $13.00 USD / month (100% Covered by GitHub Student Developer Pack)  

---

## 1. Executive Summary

This plan governs the deployment, configuration, resource allocation, and cost containment for Decidix on Heroku. It replaces all prior Appwrite and multi-service proposals with a **Heroku-native, single-dyno, PostgreSQL-backed architecture**.

### Primary Directives:
1. **GitHub Student Credit Adherence:** Total monthly platform spend must not exceed **$12.00 / month**, safely below the $13.00 / month student credit allowance.
2. **Zero Paid Marketplace Add-ons:** Exclude all third-party marketplace add-ons (Redis, Papertrail paid, SendGrid) which charge credit cards directly.
3. **Single Authoritative Database:** Heroku Postgres (`essential-0`) hosts relational entities, time-series metrics, device tokens, and `pgvector` knowledge embeddings.
4. **Automated Zero-Downtime Deployments:** Prisma migrations run automatically via Heroku's `release` phase in `Procfile` before dyno traffic switches.

---

## 2. Heroku Account & Resource Inventory

Inspection verified on 2026-11-02 via authenticated Heroku CLI:

```bash
$ heroku auth:whoami
mohsn9165@gmail.com

$ heroku apps
You have no apps.
```

### GitHub Student Developer Pack Credit Terms
- **Credit Allocation:** **$13.00 USD / month** in platform credits.
- **Coverage Scope:** Eligible Heroku platform products: Heroku Dynos (`eco`, `basic`, `standard-1x`) and Heroku Postgres (`essential-*`).
- **Billing Dashboard:** Developer monitors balance at: [`https://dashboard.heroku.com/account/billing`](https://dashboard.heroku.com/account/billing).

---

## 3. Resource Allocation & Cost Budget

| Resource Component | Plan / Tier | Quantity | Unit Price | Monthly Spend | Student Credit Eligible | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| **API Application Dyno** | `basic` | 1 | $7.00 / mo | $7.00 | **Yes** | Dedicated, never sleeps. Fast response for live graduation demos. |
| **Alternative Dyno (Dev)**| `eco` | 1 | $5.00 / mo pool | ($5.00) | **Yes** | Sleeps after 30 mins inactivity; recommended for staging/development. |
| **Primary Database** | `heroku-postgresql:essential-0` | 1 | $5.00 / mo | $5.00 | **Yes** | 10 GB storage, 20 connection limit, native `pgvector` support on Postgres 15+. |
| **ML Inference Engine** | In-Dyno Python + DB Cache | — | $0.00 | $0.00 | **Yes** | Forecasts precomputed into DB. Zero second dyno needed. |
| **Vector Store (RAG)** | `pgvector` Extension | — | $0.00 | $0.00 | **Yes** | Included inside Heroku Postgres `essential-0`. |
| **Logging & Metrics** | Heroku Logplex + Pino (stdout) | — | $0.00 | $0.00 | **Yes** | Free standard 1,500 lines log buffer. |
| **Total Monthly Spend** | — | — | — | **$10.00 – $12.00** | **100% Covered** | **Surplus Credit Margin: $1.00 – $3.00 / month** |

---

## 4. Environment Strategy: Staging vs. Production

To maintain rigorous software engineering standards within the student budget:

### Option A: Sequential Staging & Production (Recommended for Defense)
- **Phase 1 (Development & Staging):** Deploy `decidix-backend-staging` on `eco` dyno ($5) + `essential-0` Postgres ($5) = $10/mo.
- **Phase 2 (Pre-Defense Production):** Upgrade to `basic` dyno ($7) for continuous uptime without cold starts during professor evaluations.

### Option B: Unified Demo Environment
- A single high-performance demo app `decidix-backend-demo` on a `basic` dyno ($7) + `essential-0` Postgres ($5) = $12.00/mo.

---

## 5. Deployment Workflow & Git Subtree

The Decidix repository is a monorepo containing `/mobile`, `/backend`, `/ml`, and `/datasets`. Heroku deploys the backend subfolder seamlessly using Git subtree without restructuring the repository:

```bash
# Set up Heroku remote
heroku git:remote -a decidix-backend-demo

# Deploy backend subfolder directly
git subtree push --prefix backend heroku main
```

### Heroku Procfile Specification (`backend/Procfile`)
```text
web: node dist/server.js
release: npx prisma migrate deploy
```

---

## 6. Verification & Smoke Test Protocol

Following any Heroku deployment, verify the deployment health:

```bash
# 1. Check Dyno status
heroku ps -a decidix-backend-demo

# 2. Check Database health
heroku pg:info -a decidix-backend-demo

# 3. Stream real-time logs
heroku logs --tail -a decidix-backend-demo

# 4. Smoke test API health
curl -s -i https://decidix-backend-demo.herokuapp.com/health
curl -s -i https://decidix-backend-demo.herokuapp.com/v1/overview
```
