# Decidix — Environment Variables & Secrets Inventory

**Document Version:** 3.0.0 (Phase D1 Approved Specification)  
**Status:** Approved Master Specification  
**Classification:** Operational Security & Configuration Runbook  

---

## 1. Environment Variable Categorization

The Decidix backend service categorizes all configuration parameters into four strict operational tiers:

### 1.1 Tier 1: Required Production Variables
These variables MUST be configured in Heroku for the service to start and function correctly in staging or production.

| Variable Name | Secret? | Default Value | Description / Validation |
|---|:---:|---|---|
| `NODE_ENV` | No | `development` | Set to `production` or `staging`. Activates security and strict validation. |
| `PORT` | No | `5000` | Injected dynamically by Heroku dyno environment. Server binds to `0.0.0.0:$PORT`. |
| `DATABASE_URL` | **YES** | None | PostgreSQL connection URI. Automatically injected by `heroku-postgresql` add-on. |
| `DATABASE_SSL` | No | `false` | Must be `true` for Heroku Postgres (enables SSL with `rejectUnauthorized: false`). |
| `JWT_SECRET` | **YES** | None | 256-bit cryptographically random key for access token signing (`openssl rand -hex 32`). |
| `REFRESH_TOKEN_SECRET` | **YES** | None | 256-bit random key for hashing refresh token sessions (`openssl rand -hex 32`). |
| `API_PREFIX` | No | `/v1` | Base path prefix for all API routes. |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins for browser/client requests (`*` for mobile clients). |
| `ZERO_COST_ENFORCEMENT` | No | `true` | Enforces university zero-cost AI policy: blocks paid models and paid endpoints. |

### 1.2 Tier 2: Optional Integration Variables
These variables control external integrations and fallbacks. The system operates gracefully with defaults if they are omitted.

| Variable Name | Secret? | Default Value | Description / Validation |
|---|:---:|---|---|
| `OPENROUTER_API_KEY` | **YES** | Empty | OpenRouter API key. If absent, AI Assistant engages grounded deterministic fallback. |
| `OPENROUTER_MODEL` | No | `meta-llama/llama-3.3-70b-instruct:free` | Free-tier chat model. Must have `:free` suffix or be `openrouter/free`. |
| `OPENROUTER_FALLBACK_MODEL` | No | `openrouter/free` | Zero-cost fallback router if primary free model is busy. |
| `OPENROUTER_EMBEDDING_MODEL`| No | `local/deterministic-fnv1a-v1` | Deterministic local 1536-dim embedding engine ($0.00 cost, zero network). |
| `OPENROUTER_REQUEST_TIMEOUT_MS` | No | `10000` | Client timeout (10s) preventing hung requests on free-tier rate limits. |
| `RAG_SIMILARITY_THRESHOLD` | No | `0.65` | Cosine similarity cutoff $\tau \ge 0.65$ for grounded evidence retrieval. |
| `ML_SERVICE_URL` | No | `http://localhost:8000` | URL for external Python ML service if deployed; otherwise uses cached PostgreSQL forecasts. |
| `FIREBASE_PROJECT_ID` | No | None | Optional Google Firebase project ID for Phase E push notifications. |
| `FIREBASE_CLIENT_EMAIL`| **YES** | None | Optional FCM service account email for Phase E push notifications. |
| `FIREBASE_PRIVATE_KEY` | **YES** | None | Optional FCM service account RSA private key for Phase E push notifications. |

### 1.3 Tier 3: Development-Only Variables
Used strictly during local workstation development and never set in production.

| Variable Name | Secret? | Default Value | Description |
|---|:---:|---|---|
| `DATABASE_URL` (local) | No | `postgresql://postgres:postgres@localhost:5432/decidix_dev` | Local developer database instance. |
| `LOG_LEVEL` | No | `debug` (local) / `info` (production) | Controls logger verbosity. |

### 1.4 Tier 4: Flutter Compile-Time Defines (Client-Side)
Injected at build time via `--dart-define-from-file=env/<environment>.json`. **No secrets are ever bundled into client binaries.**

| Variable Name | `dev.json` | `staging.json` | `prod.json` | Purpose |
|---|---|---|---|---|
| `API_BASE_URL` | `http://10.0.2.2:5000/v1` | `https://decidix-backend-staging.herokuapp.com/v1` | `https://decidix-backend-demo.herokuapp.com/v1` | Target backend URL |
| `USE_MOCK` | `true` | `false` | `false` | Controls whether client uses local mock JSON or calls backend |

---

## 2. Permanent Zero-Cost AI Policy Compliance Checklist

Decidix is a university graduation project. All AI operations must incur strictly ZERO external API spend:

- [x] `OPENROUTER_MODEL`: Configured strictly with verified `:free` model variants.
- [x] `OPENROUTER_EMBEDDING_MODEL`: Configured to `local/deterministic-fnv1a-v1` (local deterministic 1536-dim embeddings; zero API calls).
- [x] `ZERO_COST_ENFORCEMENT`: Enabled (`true`); backend blocks paid model IDs with HTTP 400.
- [x] Rate Limit Protection: HTTP 429 triggers graceful fallback to local deterministic reasoning.
- [x] Payment Required Protection: HTTP 402 triggers immediate fallback; never attempts credit top-up.
- [x] Request Timeout: Fixed 10s timeout prevents hung dyno connections.

---

## 3. Cryptographic Secret Generation Protocol

Generate production secrets using cryptographically secure pseudorandom number generators:

```bash
# Generate JWT_SECRET (256-bit)
openssl rand -hex 32

# Generate REFRESH_TOKEN_SECRET (256-bit)
openssl rand -hex 32
```

---

## 4. Secret Hygiene Rules

1. `backend/.env` is gitignored and must NEVER be committed.
2. In Heroku, secrets are injected strictly via `heroku config:set`.
3. Application loggers redact authorization tokens, passwords, and API keys.
4. If a key is accidentally exposed, immediately revoke it, rotate it in Heroku, and purge it from Git history using `git-filter-repo`.
