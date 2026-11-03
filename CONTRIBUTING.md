# Contributing to Decidix

Thank you for contributing to **Decidix — Smart National Development Decision Support System**! This document provides guidelines for code contributions, branching strategies, commit conventions, and review workflows.

---

## 1. Branching Strategy

Decidix follows a structured Git branching model:

- `main`: **Stable & production-ready branch.** Deployed to Heroku staging. Protected against direct pushes.
- `develop`: **Integration branch.** All ongoing feature and bugfix branches merge here via Pull Requests.
- `feature/<feature-name>`: New features or enhancements (e.g. `feature/fcm-device-sync`, `feature/what-if-slider`).
- `fix/<issue-name>`: Bug fixes (e.g. `fix/regional-score-rounding`, `fix/route-404`).
- `hotfix/<patch-name>`: Critical emergency fixes branched directly from `main`.

---

## 2. Development Workflow

1. **Pull the latest code:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create a topic branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Develop & Test Locally:**
   - Flutter:
     ```bash
     flutter analyze
     flutter test
     ```
   - Backend:
     ```bash
     npm --prefix backend run build
     npm --prefix backend test
     ```

4. **Commit using Conventional Commits:**
   Format: `<type>(<scope>): <short description>`
   - `feat`: A new feature (e.g., `feat(notifications): add device token registration endpoint`)
   - `fix`: A bug fix (e.g., `fix(simulator): prevent negative budget allocation`)
   - `docs`: Documentation only changes (e.g., `docs(api): update contract for push endpoints`)
   - `test`: Adding or correcting tests (e.g., `test(auth): add session rotation test`)
   - `refactor`: Code change that neither fixes a bug nor adds a feature
   - `chore`: Updating build tasks, package manager configs, etc.

5. **Push and Open a Pull Request:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Open a Pull Request against `develop` (or `main` for hotfixes) using the provided PR template.

---

## 3. Strict Project Constraints

- **Permanent Zero-Cost AI Policy:** All AI interactions must use verified `:free` OpenRouter models (`meta-llama/llama-3.3-70b-instruct:free`, `openrouter/free`) and deterministic local embeddings (`deterministic-fnv1a-v1`). Paid models, paid embedding APIs, and paid fallbacks are strictly prohibited.
- **Secrets Hygiene:** Never commit `.env` files, Firebase service account JSON files (`*firebase-adminsdk*.json`), private keys, or API credentials to Git.
- **RTL & Bilingual Awareness:** Every user-facing UI change must preserve bilingual support (English and Arabic) and RTL layout integrity.
- **Documentation Integrity:** Meaningful milestones and contract changes must maintain `docs/PROJECT_MASTER_STATUS.md` and `docs/api_contract.md`.

---

## 4. Code Review & Quality Gates

Every Pull Request must pass the automated GitHub Actions CI pipeline:
- Flutter: `flutter analyze` (0 issues) and `flutter test` (100% pass).
- Backend: TypeScript build (0 errors) and Vitest suite (100% pass).
- At least one peer review approval before merging.
