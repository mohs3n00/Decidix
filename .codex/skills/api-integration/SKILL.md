---
name: api-integration
description: Integrate Decidix mobile, backend, ML, Appwrite, and OpenRouter APIs through explicit secure contracts.
---

# Decidix API Integration

Use when a system boundary is introduced or changed.

- Define ownership, auth, request/response schemas, versioning, timeouts, retries, idempotency, pagination, and error mapping before coding.
- Keep secrets and provider calls on trusted server paths unless a public client integration is explicitly approved.
- Preserve the envelope and type conventions in `docs/api_contract.md`, or version/document a deliberate change.
- Add contract tests plus negative cases; test degraded provider behavior and avoid retry storms.
- Do not let mobile clients call PostgreSQL, ML internals, or privileged Appwrite/OpenRouter endpoints directly.
