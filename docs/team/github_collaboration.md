# Decidix — Team Collaboration & GitHub Workflow Guide

**Target Audience:** Engineering Team & Graduation Project Collaborators  
**Repository:** `https://github.com/mohs3n00-eng/Decidix`  
**Primary Platform:** GitHub + Heroku Staging  

---

## 1. Getting Started

### 1.1 Clone the Repository
```bash
git clone https://github.com/mohs3n00-eng/Decidix.git
cd Decidix
```

### 1.2 Checkout the Integration Branch
All active development starts from `develop`:
```bash
git checkout develop
```

### 1.3 Local Environment Setup
- **Flutter:** Run `flutter pub get` and verify with `flutter analyze`.
- **Backend:** Run `npm --prefix backend install` and `npm --prefix backend run build`.
- **Prisma & DB:** Do not connect local development to production databases. Backend runs with in-memory fallback for offline test suites.

---

## 2. Branching & Contribution Workflow

```
main (Protected, Staging Deployment)
  ▲
  │ Pull Request (Review & CI Gates)
  │
develop (Integration Branch)
  ▲
  │ Pull Request
  │
feature/* or fix/* (Topic Branches)
```

### 2.1 Branch Naming Conventions
- `feature/<name>`: New feature work (e.g. `feature/fcm-token-sync`, `feature/comparison-charts`)
- `fix/<name>`: Bug fixes (e.g. `fix/regional-score-rounding`, `fix/route-404`)
- `hotfix/<name>`: Emergency production patches branched directly from `main`

### 2.2 Making Commits
We follow the **Conventional Commits** specification:
```text
feat(notifications): add device token registration endpoint
fix(simulator): prevent negative budget allocation
docs(api): update contract for push notification routes
test(auth): add refresh token rotation test suite
```

### 2.3 Opening a Pull Request
1. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Navigate to the GitHub repository and click **Compare & pull request**.
3. Target branch:
   - For regular features and fixes: target `develop`.
   - For release promotions: target `main` from `develop`.
4. Fill in the Pull Request template:
   - Reference the issue number (e.g. `Fixes #12`).
   - Check all compliance checkboxes (bilingual RTL, $0 AI spending, no secret leaks).

---

## 3. Automated CI/CD & Quality Gates

Every Pull Request automatically triggers GitHub Actions CI:
- **Flutter CI (`flutter_ci.yml`):**
  - Runs `flutter analyze` (must have 0 errors and 0 warnings).
  - Runs `flutter test` (all 198 tests must pass).
- **Backend CI (`backend_ci.yml`):**
  - Runs TypeScript build (`npm run build`).
  - Runs Vitest test suite (all 155 tests must pass).

PRs cannot be merged until all CI checks pass and at least one team member approves the review.

---

## 4. Staging Deployment Workflow

The Heroku staging app (`decidix-backend-staging`) is connected to the `main` branch.

- **Subtree Architecture:** Because Decidix is a monorepo containing Flutter, Python ML, and Node.js backend, only the `backend/` directory is deployed to Heroku.
- **Automated Workflow:** Merging code into `main` that touches `backend/**` triggers `.github/workflows/deploy_staging.yml`.
- **Release Phase:** Heroku runs `npx prisma migrate deploy` in the release phase before cutting dyno traffic over.
- **Manual Trigger:** Developers can also trigger a staging deployment from the GitHub Actions tab via **Run workflow** (`workflow_dispatch`).

---

## 5. Security & Zero-Cost Guardrails

1. **Never Commit Secrets:**
   - `.env` files, Firebase service account keys (`*firebase-adminsdk*.json`), and `.p8` private keys are git-ignored.
   - If a secret is accidentally committed, notify the repository owner immediately to rotate credentials.
2. **Permanent Zero-Cost AI Policy:**
   - All AI integrations must use verified free models (`meta-llama/llama-3.3-70b-instruct:free`, `openrouter/free`).
   - No paid models, paid embedding APIs, or paid third-party add-ons are allowed without explicit owner authorization.

