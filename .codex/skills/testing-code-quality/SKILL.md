---
name: testing-code-quality
description: Plan and enforce Decidix quality checks across Flutter, TypeScript, Python, database migrations, and AI/RAG behavior.
---

# Decidix Testing and Code Quality

Use for test strategy, implementation, review, and release gates.

- Test changed behavior at the lowest useful level, then add contract/integration coverage at system boundaries.
- Cover authorization, validation, error envelopes, migrations, rollback compatibility, localization/RTL, and representative failure paths.
- Use deterministic fixtures and approved synthetic data; never commit credentials or sensitive production exports.
- For ML/RAG, maintain evaluated test sets for groundedness, citations, safety, regressions, and degraded retrieval.
- CI must run formatting, lint/static analysis, tests, dependency/security checks, and migration validation appropriate to changed components.
