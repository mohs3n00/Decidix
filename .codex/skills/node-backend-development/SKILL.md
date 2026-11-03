---
name: node-backend-development
description: Build Decidix Node.js TypeScript APIs with versioned contracts, PostgreSQL ownership, authorization, and operational safety.
---

# Decidix Node Backend Development

Use for backend APIs and business orchestration.

- Begin from `docs/api_contract.md`; propose contract changes before breaking mobile clients.
- Validate requests and authorization at the boundary; return stable error envelopes and safe errors.
- Use transactions for multi-record invariants, parameterized database access, migrations, and structured logs without secrets or sensitive payloads.
- Keep orchestration in TypeScript; call Python ML/data services through explicit, authenticated interfaces.
- Document idempotency, pagination, rate limits, failure modes, and observability for externally callable endpoints.
