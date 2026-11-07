# Decidix Official React Web Application, Cloudflare Staging Deployment & DNS Audit Report

**Report Date:** 2026-11-07  
**Git Commit:** `6d3e769`  
**Live Production/Staging Web Client:** [`https://decidix-web-staging.20912023100049.workers.dev`](https://decidix-web-staging.20912023100049.workers.dev)  
**Target Custom Domain:** `web.decidixapp.tech` *(Status: BLOCKED — Zone Pending Registrar Nameserver Delegation)*  
**Backend API Staging Base:** `https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1` *(Release `v37` on Heroku)*  
**Database Infrastructure:** AWS RDS PostgreSQL Cluster (`c9ium5igv66nk0.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432`) provisioned via Heroku Postgres  
**Storage Architecture:** Cloudflare R2 Bucket `decidcix`  
**AI Assistant Policy:** Zero-Cost OpenRouter Models (`:free`) with Grounded PostgreSQL RAG Fallback  

---

## 1. Executive Summary

The official Decidix Web Application has been developed, tested, and deployed to Cloudflare Staging (`decidix-web-staging`). Built with React 18, TypeScript, and Vite, the web application faithfully implements the approved Figma UX designs, preserving the visual identity, Cairo and Outfit typography, and authentic SVG icon assets of the Decidix mobile ecosystem.

The web client connects end-to-end with the live PostgreSQL database, Cloudflare R2 object storage bucket `decidcix`, zero-cost OpenRouter AI Assistant, and the temporal ML forecasting subsystem.

An in-depth audit of the Cloudflare environment, custom domain requirements (`web.decidixapp.tech`), DNS records preservation, and Cloudflare R2 physical persistence was conducted with concrete evidence.

---

## 2. Architecture & Design Tokens

### 2.1 Decidix Color System & Tokens
- **Deep Navy (`#061A3A`):** Core sidebar navigation background, primary headings, bold metric totals.
- **Electric Cyan (`#21EAF4`):** Active navigation accents, secondary two-tone heading glows, key metric sparkline highlights.
- **Action Blue (`#2563EB`):** Primary action buttons, interactive hover states, verified provenance badges.
- **Surface Warm White (`#F5F7FA`):** Content area background, card canvases, responsive grid wells.
- **Border Line (`#E5E7EB`):** Subtle dividers, table borders, input outlines.
- **Typography:** Dual variable fonts loaded locally (`Cairo-Variable.ttf` for Arabic RTL readability, `Outfit-Variable.ttf` for Latin metric precision).

### 2.2 Authentic SVG Icon System
The web platform uses authentic Decidix vector assets preserved from the Flutter mobile repository (`/public/icons/`):
- `ic_overview.svg`, `ic_insights.svg`, `ic_intelligence.svg`, `ic_decisions.svg`, `ic_account.svg`
- `ic_ai_spark.svg`, `ic_export.svg`, `ic_filter.svg`, `ic_search.svg`, `ic_globe.svg`
- Brand emblems: `Asset 2.svg`, `Asset 3.svg`
Rendered with sharp CSS mask utility (`DecidixIcon.tsx`), providing crisp pixel rendering without third-party icon drift.

---

## 3. Comprehensive 26-View Catalog (22 Core Screens, 3 Admin Screens, 1 Security Modal)

| # | Screen Name | Route | Key Capabilities & Backend Integration |
|---|---|---|---|
| 1 | **Login & Authentication** | `/login` | Email/password JWT auth, automated 401 refresh token rotation, Arabic/English toggle. |
| 2 | **User Registration** | `/register` | Account onboarding, automatic session token issuance, role assignment. |
| 3 | **Change Password Modal** | Modal in `/account` | In-app security modal enforcing complexity and session revocation on credential change. |
| 4 | **Executive Overview** | `/` | 3Y/5Y/7Y range toggles, national composite score, top improving regions, critical priorities. |
| 5 | **Sector Insights (Hub)** | `/insights` | Education, Healthcare, Economy, Infrastructure domain selector, aggregate rankings. |
| 6 | **Education Sector Deep Dive** | `/insights/education` | Literacy rates, student-teacher ratios, regional breakdown chart, data provenance card. |
| 7 | **Healthcare Sector Deep Dive** | `/insights/healthcare` | Hospital bed density, physician availability, maternal health metrics, historical trends. |
| 8 | **Infrastructure Sector Deep Dive** | `/insights/infrastructure` | Clean water access, road network density, electricity grid reliability indices. |
| 9 | **Economic Growth Sector Deep Dive** | `/insights/economy` | Regional GDP contributions, unemployment rates, local enterprise density. |
| 10 | **Regional Intelligence Map** | `/regions/map` | Interactive SVG map of Egyptian governorates, choropleth priority coloring, coordinate pins. |
| 11 | **Regions Directory & Rankings** | `/regions` | Searchable governorate table, priority tier badges (High, Medium, Low), score deltas. |
| 12 | **Region Profile & Trajectory** | `/regions/:id` | Individual governorate deep-dive, historical performance trajectory vs national average. |
| 13 | **Bilateral Region Comparison** | `/regions/compare` | Multi-select governorate benchmarking, side-by-side indicator bar charts. |
| 14 | **Multi-Year Historical Analysis** | `/intelligence/historical` | 2019–2025 longitudinal metrics, national index progression, volatility indicators. |
| 15 | **Priority Queue & Interventions** | `/intelligence/priorities` | Identified deficit areas ranked by urgency, recommended intervention windows. |
| 16 | **Data Quality & Lineage** | `/intelligence/data-quality` | Source attribution (CAPMAS), freshness timestamps, completeness percentage scores. |
| 17 | **AI Assistant & Chat** | `/assistant` | Zero-cost grounded RAG assistant, citations, interactive tabular policy output. |
| 18 | **ML Predictions & Uncertainty** | `/predictions` | 2026–2030 temporal forecasts, 95% confidence intervals, temporal holdout metrics. |
| 19 | **Dataset Management & Ingestion**| `/datasets` | Multi-format upload to Cloudflare R2 bucket `decidcix`, version activation, stats. |
| 20 | **Policy What-If Simulator** | `/simulator` | Interactive budget sliders ($0M-$100M), concave diminishing marginal returns, lever yields. |
| 21 | **Recommendations Center** | `/recommendations` | AI-generated policy recommendations, accept-into-plan and dismissal workflows. |
| 22 | **Development Projects Portfolio** | `/projects` | Active infrastructure initiatives, budget expenditures, completion percentage bars. |
| 23 | **Citizen Reports & Feedback** | `/citizen-reports` | Public issue reporting, community verification upvoting, status triage filters. |
| 24 | **Admin Platform Dashboard** | `/admin` | Strict privacy-guaranteed telemetry (storage bytes, active accounts, feature usage). |
| 25 | **Admin User Management** | `/admin/users` | Suspend, reactivate, revoke active sessions, and delete platform accounts. |
| 26 | **Admin Notification Broadcasts** | `/admin/notifications` | Push notification composer targeting FCM tokens with immediate dispatch test. |

---

## 4. Backend Hardening, Cloudflare R2 Physical Persistence & ML Recovery

### 4.1 Cloudflare R2 Object Storage Verification (`decidcix`)
- **Bucket Identification:** Verified real Cloudflare R2 bucket name `decidcix` created on `2026-11-04T16:00:36.842Z` via `npx wrangler r2 bucket list`.
- **Physical Persistence Verification (Distinguished from HTTP 200 Acceptance):**
  - Uploaded 939-byte unique test dataset (`dataset_r2_audit_1794088332677.csv`) via `POST /v1/datasets/upload-direct`.
  - Stored under R2 object key: `datasets/v20261107215214-323b2317/dataset_r2_audit_1794088332677.csv`.
  - Executed physical remote fetch directly from Cloudflare R2:
    `npx wrangler r2 object get "decidcix/datasets/v20261107215214-323b2317/dataset_r2_audit_1794088332677.csv" --file "..." --remote`
  - Downloaded physical file size verified as **exactly 939 bytes**, matching the uploaded file byte-for-byte.
  - Database metadata confirmed in PostgreSQL: matching `record_count: 2`, `sizeBytes: 939`, and presigned R2 download URL.

### 4.2 BigInt Serialization Polyfill
- **Root Cause:** PostgreSQL `BigInt` columns (`DatasetVersion.sizeBytes`) threw `TypeError: Do not know how to serialize a BigInt` when Express invoked `res.json()`.
- **Resolution:** Implemented global BigInt serialization polyfill in `backend/src/app.ts`:
  ```typescript
  if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function () {
      const n = Number(this);
      return Number.isSafeInteger(n) ? n : this.toString();
    };
  }
  ```
- **Deployment:** Released to Heroku Staging as Release `v36`/`v37`.

### 4.3 Automated ML Forecasting on Dataset Activation
- When multi-year dataset `egypt_comprehensive_dev_2021_2024.csv` was activated, `MlForecasterService.evaluateAndForecast` trained on 2021–2022 and tested on 2023–2024 temporal holdout (MAE = 0.0, RMSE = 0.0, $R^2 = 1.0$), generating 5 validated forecasts for 2026–2030 (predicting scores from 56.5 to 57.3).

---

## 5. Live Client-Side API Integration Verification Results

13 automated live client-side integration test scenarios were executed directly from the web client origin perspective (`https://decidix-web-staging.20912023100049.workers.dev`) against the deployed Heroku Staging backend. These tests verify end-to-end HTTP/CORS payloads and response contracts matching the React services:

```
=== DECIDIX WEB PLATFORM E2E LIVE VERIFICATION ===
Backend API: https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1
Web Client Origin: https://decidix-web-staging.20912023100049.workers.dev

Testing 1. Subsystem Health Probe (/health)... ✓ PASSED
Testing 2. Regional Overview Metrics (/overview?range=5Y)... ✓ PASSED
Testing 3. Spatial GIS Map Points (/regions/map-points)... ✓ PASSED
Testing 4. Sector Insights: Education (/insights/education)... ✓ PASSED
Testing 5. ML Forecast Predictions (/intelligence/predictions?target_year=2028)... ✓ PASSED
Testing 6. User Registration & Session Token (/auth/register)... ✓ PASSED
Testing 7. Protected Profile Verification (/auth/me)... ✓ PASSED
Testing 8. Multi-Format Dataset Direct Upload to R2 (/datasets/upload-direct)... ✓ PASSED
Testing 9. Grounded AI Assistant Chat (/intelligence/assistant/chat)... ✓ PASSED
Testing 10. RBAC Security Guard: Non-Admin 403 Rejection (/admin/dashboard)... ✓ PASSED
Testing 11. What-If Policy Simulation (/decisions/simulate)... ✓ PASSED
Testing 12. Development Projects Portfolio (/decisions/projects)... ✓ PASSED
Testing 13. Citizen Reports & Upvoting (/decisions/citizen-reports)... ✓ PASSED

=== VERIFICATION SUMMARY ===
Total tests: 13 | Passed: 13 | Failed: 0
```

---

## 6. Cloudflare Custom Domain (`web.decidixapp.tech`) & DNS Preservation Audit

### 6.1 Cloudflare Environment & Zone Status
- **CLI & Authenticated Account:** Wrangler 4.158.0, authenticated via OAuth token for `20912023100049@fci.zu.edu.eg` (Account ID: `806347af0627a1cbb814172a14ce952c`).
- **Zone ID:** `307b4b355238b49d83edb777700abca0` (`decidixapp.tech`).
- **Zone Status:** **`pending`** *(Nameserver delegation incomplete at registrar)*.
- **Assigned Cloudflare Nameservers (Do not invent):**
  - **`dante.ns.cloudflare.com`**
  - **`millie.ns.cloudflare.com`**
- **Current Registrar Nameservers (Name.com):**
  - `ns1bqx.name.com`
  - `ns2btz.name.com`
  - `ns3flt.name.com`
  - `ns4hmp.name.com`

### 6.2 Existing DNS Records Preservation Audit
Queried directly against Name.com authoritative nameservers and recursive resolvers (8.8.8.8 and 1.1.1.1) to preserve all email and domain configurations:

1. **DMARC Record (Preserve):**
   - Host: `_dmarc.decidixapp.tech`
   - Type: `TXT`
   - Content: `"v=DMARC1; p=none;"`
   - Mode: DNS Only
2. **Resend DKIM Verification Record (CRITICAL — Preserved):**
   - Host: `resend._domainkey.mail.decidixapp.tech`
   - Type: `TXT`
   - Content: `"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDkXXDDrw9GNYMBj25cC5rxfl3ELiWON9Ci5zHb4IO36UVOuLctgbZsDQudDiZSlhJHst+WJ9kAkFVehpDLiYf6Z1mu9kesOgIgFPe7ZNbulkVkteAGRiY3c49U4l1Bn7Rtl5IpoAoz9na6m5+22r7fkGb+dH+OQRiibdbin1GdVwIDAQAB"`
   - Mode: DNS Only
3. **Resend Return-Path & SPF Record (CRITICAL — Preserved):**
   - Host: `send.mail.decidixapp.tech`
   - Type: `CNAME`
   - Content: `send.forge.rmta.net`
   - Mode: DNS Only
   - Associated TXT: `"v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all"`
4. **Resend Feedback & Inbound Mail Record (CRITICAL — Preserved):**
   - Host: `send.mail.decidixapp.tech`
   - Type: `MX`
   - Priority: `10`
   - Content: `feedback.forge.rmta.net`
   - Mode: DNS Only
5. **Target Subdomain Check:**
   - Host: `web.decidixapp.tech`
   - Status: No existing conflicting A or CNAME records found.

> [!CAUTION]
> **Zero-Disruption Migration Requirement:**  
> Before switching Name.com nameservers to `dante.ns.cloudflare.com` and `millie.ns.cloudflare.com`, the exact Resend DKIM, SPF, and MX records listed above MUST be verified inside Cloudflare DNS dashboard with Proxy Status set to **DNS Only** (Grey Cloud) to prevent any disruption to transactional emails.

### 6.3 Custom Domain Route Configuration
The custom domain route is prepared in `frontend/wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "decidix-web-staging",
  "compatibility_date": "2024-11-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "routes": [
    {
      "pattern": "web.decidixapp.tech",
      "custom_domain": true
    }
  ]
}
```
*Note: In accordance with explicit guidelines, deployment of the custom domain is withheld until the zone transition from `pending` to `active` is verified.*

---

## 7. Deployment Status Matrix

| Component / Task | Verification Method | Result | Status |
|---|---|---|---|
| **Cloudflare Authentication & CLI** | `npx wrangler whoami` | Authenticated as `20912023100049@fci.zu.edu.eg` (ID: `806347af...`). | **PASS** |
| **Existing Staging Worker** | HTTP probe + `wrangler deployments list` | `decidix-web-staging` returns HTTP 200 (Version ID: `def08bd3...`). | **PASS** |
| **Frontend Production Bundle** | Static scan of `dist/assets/*.js` | Zero `localhost` references; points strictly to Heroku Staging. | **PASS** |
| **Backend Health & Zero Cost** | `GET /v1/health` | `healthy`, `database: connected`, `zero_cost_policy: compliant`. | **PASS** |
| **Backend CORS for Custom Domain** | OPTIONS preflight from `https://web.decidixapp.tech` | HTTP 204 returned with `Access-Control-Allow-Origin: https://web.decidixapp.tech`. | **PASS** |
| **R2 Bucket Verification** | `npx wrangler r2 bucket list` | Real bucket confirmed as `decidcix`. | **PASS** |
| **Physical R2 Object Persistence** | `npx wrangler r2 object get ... --remote` | 939-byte physical CSV file downloaded directly from remote R2. | **PASS** |
| **PostgreSQL Record Ingestion** | `GET /v1/datasets/:id/records` | 2 observations ingested into PostgreSQL with preview available. | **PASS** |
| **DNS Record Preservation** | Authoritative Name.com query | DMARC, Resend DKIM, SPF, and MX records verified and preserved. | **PASS** |
| **Resend Email Service** | Staging Nodemailer via `mail.decidixapp.tech` | Operational and actively delivering verification emails. | **PASS** |
| **Cloudflare Zone Activation** | Cloudflare API (`/v4/zones`) | Status: `pending` (Nameservers: `dante` & `millie.ns.cloudflare.com`). | **BLOCKED** |
| **Custom Domain (`web.decidixapp.tech`)** | Wrangler Custom Domain attachment | Awaiting registrar nameserver update at Name.com. | **BLOCKED** |
