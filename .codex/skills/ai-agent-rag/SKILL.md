---
name: ai-agent-rag
description: Build Decidix OpenRouter-powered assistants grounded in approved datasets through secure, attributable RAG.
---

# Decidix AI Agent and RAG

Use for assistant, retrieval, prompts, and RAG evaluation.

- Retrieve only from approved, versioned documents/datasets; index metadata must include provenance, approval status, date, access scope, and source locator.
- Apply authorization and tenant/region filters before retrieval, not only after generation.
- Require citations/source metadata in answers. If evidence is inadequate or conflicting, say so and avoid fabricated facts.
- Keep OpenRouter credentials server-side; minimize prompts, redact sensitive fields, and log safely.
- Evaluate retrieval relevance, citation correctness, groundedness, refusal behavior, prompt injection resistance, cost, and latency before release.
