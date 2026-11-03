---
name: postgresql-appwrite
description: Design Decidix PostgreSQL data models and scoped Appwrite support without creating a competing system of record.
---

# Decidix PostgreSQL and Appwrite

Use for schemas, migrations, data ownership, and Appwrite boundaries.

- Make PostgreSQL the canonical source for application entities, metrics, decisions, audit data, and dataset metadata.
- Model identifiers, constraints, indexes, tenancy/authorization boundaries, retention, and auditability explicitly.
- Write reversible, reviewed migrations with forward/backward compatibility and backup/rollback notes.
- Use Appwrite only for an approved supporting responsibility (for example, a bounded service integration); document what it owns and its mapping to PostgreSQL.
- Never silently replicate canonical tables into Appwrite or rely on client-controlled Appwrite permissions for server authorization.
