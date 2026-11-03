---
name: project-architecture
description: Design and evolve Decidix architecture across Flutter, Node.js, PostgreSQL, Appwrite, Python, ML, and RAG without duplicating ownership.
---

# Decidix Project Architecture

Use for architecture, boundaries, repository organization, and cross-service decisions.

- Inspect `AGENTS.md`, `docs/`, existing code, and API contracts before proposing changes.
- PostgreSQL is the authoritative data store. Define Appwrite as a bounded supporting service only after its responsibility, identity mapping, and failure behavior are explicit.
- Keep Flutter dependent on versioned backend contracts, not on data-store or ML implementation details.
- Use Node.js/TypeScript for API orchestration; use Python for data engineering and ML workloads.
- Record significant choices, assumptions, interfaces, ownership, and rollback implications in `docs/`.
- Do not create a web frontend or admin dashboard.
