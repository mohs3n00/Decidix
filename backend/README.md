# Decidix Backend API

Production-ready, independently deployable Node.js + TypeScript REST API powering the Decidix Smart National Development Decision Support System.

## Architecture

- **Runtime:** Node.js (>=20.0.0) + Express + TypeScript
- **Database:** PostgreSQL (Primary System of Record)
- **Validation:** Zod schemas on all endpoints
- **Auth:** JWT authentication with RBAC (`admin`, `analyst`, `planner`, `viewer`)
- **AI Integration:** OpenRouter API gateway + Grounded RAG knowledge retriever
- **Contract Baseline:** Fully compliant with [`docs/api_contract.md`](../docs/api_contract.md)

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/decidix_dev` |
| `JWT_SECRET` | Secret key for JWT signing | (required in production) |
| `OPENROUTER_API_KEY` | OpenRouter API Key for AI Assistant | (optional - uses grounded fallback if empty) |

### 3. Database Migrations & Seeding

Run PostgreSQL schema migrations:

```bash
npm run migrate
```

Seed database with baseline development data:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

API is available at `http://localhost:5000/v1`
Health check: `http://localhost:5000/health`

### 5. Run Test Suite

```bash
npm test
```

Executes 16 end-to-end integration tests with Vitest & Supertest.

---

## Heroku Deployment

This `backend/` directory is self-contained and deployable directly to Heroku.

### Option A: Subtree Deployment from Monorepo

```bash
git subtree push --prefix backend heroku main
```

### Option B: Dedicated Repository Deployment

Initialize a git repository inside `backend/` and push to Heroku:

```bash
cd backend
heroku git:remote -a <your-heroku-app-name>
git push heroku main
```

### Heroku Config Vars

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<secure-random-32-character-secret>
heroku config:set OPENROUTER_API_KEY=<your-openrouter-key>
heroku addons:create heroku-postgresql:essential-0
```

The `Procfile` automatically handles database migrations during release phase:

```text
web: node dist/server.js
release: node dist/database/migrate.js
```

