## Description

Please include a summary of the changes and the related issue/milestone.

Fixes / Closes #(issue_number)

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance / Security hardening

## Area Affected

- [ ] Flutter Mobile Client (`lib/`)
- [ ] Node.js Backend (`backend/`)
- [ ] PostgreSQL / Prisma Schema (`backend/prisma/`)
- [ ] Machine Learning / Datasets (`ml/`, `datasets/`)
- [ ] DevOps / CI / Heroku Deployment

## Quality & Compliance Checklist

- [ ] My code adheres to the style guidelines of this project.
- [ ] I have performed a self-review of my code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] Arabic and English bilingual / RTL layouts remain intact.
- [ ] Zero secrets, private keys, or `.env` files are tracked in Git.
- [ ] **Permanent Zero-Cost AI Policy:** Strictly zero paid AI models or paid embedding APIs are invoked.
- [ ] Unit and integration tests pass locally:
  - Flutter: `flutter test`
  - Flutter analyze: `flutter analyze`
  - Backend: `npm --prefix backend test`
  - Backend build: `npm --prefix backend run build`
- [ ] `docs/PROJECT_MASTER_STATUS.md` and/or `docs/api_contract.md` are updated if contracts changed.
