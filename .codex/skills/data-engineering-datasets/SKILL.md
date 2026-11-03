---
name: data-engineering-datasets
description: Build governed Decidix Python data pipelines and approved dataset lifecycle for analytics, ML, and RAG.
---

# Decidix Data Engineering and Datasets

Use for ingestion, transformation, quality, and dataset governance.

- Separate raw, staged, curated, and serving datasets; make transformations reproducible and idempotent.
- Capture source, license/approval, owner, extraction time, schema version, checks, lineage, and retention for every dataset.
- Quarantine invalid inputs; report completeness, freshness, accuracy, duplication, and schema-drift failures.
- Publish only approved, versioned curated data to PostgreSQL analytics, ML training, or RAG indexing.
- Keep PII classification, minimization, and access controls explicit; do not use production sensitive data in local fixtures.
