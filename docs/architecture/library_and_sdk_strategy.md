# Decidix — Library & SDK Selection Strategy

**Document Version:** 2.0.0  
**Status:** Approved Master Architecture  
**Engineering Philosophy:** "Don't Reinvent the Wheel" — Standard, battle-tested solutions across all tiers.  

---

## 1. Evaluation & Selection Framework

Every technical capability in Decidix is evaluated against four strict criteria:
1. **Maturity & Security:** Established package with active maintenance, high weekly downloads, and zero unaddressed CVEs.
2. **Flutter Integration Harmony:** Seamless integration with the existing Flutter application (`lib/`) with zero UI or state management rewrites.
3. **Zero Financial Waste:** Must operate completely within the **$13.00 / month GitHub Student Developer Pack credit allowance** on Heroku through July 2027.
4. **Minimal Operational Overhead:** Low complexity, self-contained within Heroku Dynos and PostgreSQL, avoiding external SaaS dependency cascades.

---

## 2. Comprehensive Technology Selection Matrix

| Capability | Evaluated Options | Selected Solution | Key Rationale & Rejection Factors |
|---|---|---|---|
| **ORM / Data Layer** | Prisma, Drizzle, TypeORM, raw `pg` | **Prisma ORM** | **Selected:** Declarative schema, automated migrations (`prisma migrate`), full TypeScript type generation, built-in connection pool controls, native `pgvector` preview support.<br>*Rejected Drizzle:* More boilerplate for relation queries.<br>*Rejected TypeORM:* Maintenance instability and legacy decorator design.<br>*Rejected raw pg:* High risk of SQL injection and tedious manual migrations. |
| **Authentication** | Better Auth, Passport.js, Clerk, Auth0, Backend JWT | **Backend JWT (`jose` / `jsonwebtoken`) + `bcrypt`** | **Selected:** 100% compatible with Flutter's pre-wired `AuthInterceptor` (`Authorization: Bearer <token>`). Zero external SaaS subscription fees. Self-contained in PostgreSQL `users` and `sessions` tables.<br>*Rejected Clerk / Auth0:* External paid subscriptions; complex JWKS setup; unnecessary SaaS risk for student project.<br>*Rejected Better Auth / Passport:* Unnecessary session cookie abstractions for a mobile API consuming Bearer tokens. |
| **Request Validation** | Zod, Joi, Yup, class-validator | **Zod** | **Selected:** De-facto TypeScript standard, zero runtime dependencies, static type inference (`z.infer<typeof Schema>`), composable schemas matching `docs/api_contract.md`.<br>*Rejected Joi/Yup:* Clunky TypeScript typing.<br>*Rejected class-validator:* Heavy experimental decorator overhead. |
| **HTTP Security Headers** | Helmet, manual Express headers | **Helmet** | **Selected:** Industry standard for secure HTTP headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) in one line of code (`app.use(helmet())`). |
| **DDoS & Rate Limiting** | express-rate-limit, Redis-rate-limit, Cloudflare WAF | **express-rate-limit (In-Memory)** | **Selected:** Zero external dependencies, protects `/v1/auth/*` (10 req/min) and `/v1/assistant/*` without requiring a paid Redis marketplace add-on.<br>*Rejected Redis add-on:* Not covered by Heroku student credits ($10/mo extra out-of-pocket). |
| **Structured Logging** | Pino, Winston, Bunyan, Morgan | **Pino + pino-http** | **Selected:** Fastest Node.js logger available, native JSON format, writes to `stdout` for automatic ingestion into Heroku Logplex (`heroku logs --tail`). Zero disk I/O. |
| **Push Notifications** | Firebase Admin SDK, OneSignal, Pusher | **Firebase Admin SDK (`firebase-admin`)** | **Selected:** Official Google SDK, 100% free unlimited push messages on Firebase Spark plan, direct pairing with Flutter's `firebase_messaging` plugin.<br>*Rejected OneSignal/Pusher:* Proprietary commercial SaaS with subscription paywalls. |
| **AI LLM Gateway** | OpenAI SDK, LangChain, LlamaIndex, custom fetch | **OpenAI SDK (`openai` configured for OpenRouter)** | **Selected:** OpenRouter exposes a 100% standard OpenAI-compatible API (`baseURL: "https://openrouter.ai/api/v1"`). Official `openai` npm package provides battle-tested retries, streaming, and full TypeScript typing. Avoids heavy LangChain bloat.<br>*Rejected LangChain:* Massive dependency tree, unnecessary abstraction layers, fragile breaking changes. |
| **Vector Search (RAG)** | `pgvector`, Pinecone, Qdrant, Chroma | **`pgvector` (Heroku Postgres Extension)** | **Selected:** Natively supported on Heroku Postgres 15+ (`essential-0`). Single database for transactional and vector data, enabling SQL joins between metadata and vectors. Zero extra costs.<br>*Rejected Pinecone/Qdrant:* External managed vector databases with billable subscriptions and multi-system data sync complexity. |
| **ML Inference Serving** | Dedicated Python Microservice Dyno, In-Dyno Python execution + DB Cache | **In-Dyno Python (`predict.py`) + PostgreSQL Cache** | **Selected:** Saves $7.00/mo by avoiding a 2nd Heroku dyno. Fast Python script precomputes multi-year forecasts into `ml_forecasts` table. API responds in $<15\text{ms}$. |
| **Test Runner & Harness** | Vitest, Jest, Mocha | **Vitest + Supertest** | **Selected:** Instant TypeScript execution via esbuild, zero config compared to ts-jest, native ESM support, identical assertion syntax to Jest. |

---

## 3. Package Manifest Alignment (`backend/package.json`)

To prevent dependency drift, the backend production dependencies are standardized:

```json
{
  "name": "decidix-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "express-rate-limit": "^7.4.1",
    "firebase-admin": "^12.7.0",
    "helmet": "^8.0.0",
    "jose": "^5.9.6",
    "openai": "^4.73.0",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.17.6",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

---

## 4. Elimination of Redundant & Prohibited Packages

The following libraries and patterns are strictly prohibited in the codebase:
- ❌ **Appwrite SDKs (`appwrite`, `node-appwrite`):** Permanently eliminated.
- ❌ **Clerk SDKs (`@clerk/clerk-sdk-node`):** Replaced by standard backend JWT.
- ❌ **LangChain / LlamaIndex:** Prohibited to maintain clean, inspectable RAG logic.
- ❌ **Heavy ORMs with reflection (`typeorm`, `sequelize`):** Replaced by Prisma.
- ❌ **Insecure custom cryptographic hashing (md5, sha1, custom salts):** Must use `bcryptjs` / `@node-rs/argon2`.

