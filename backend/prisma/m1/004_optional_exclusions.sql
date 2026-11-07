-- ============================================================================
-- Decidix M1 — OPTIONAL hardening: full no-overlap enforcement for definition
-- eras and boundary eras.
--
-- Needs the btree_gist extension (available on stock PostgreSQL and Heroku
-- Postgres, but creatable only with the right privileges). Without it, M1
-- still guarantees at most ONE open era per key through the partial unique
-- indexes created in 001; closed-era overlap is prevented by the ingest
-- transaction (closing the previous era while opening the next).
--
-- Do not include this file in the base M1 migration. Apply it only after
-- `CREATE EXTENSION btree_gist` succeeds on the target instance, and only if
-- existing eras do not overlap (the constraint validates existing rows).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE indicator_definitions
  ADD CONSTRAINT indicator_definitions_no_overlap
  EXCLUDE USING gist (
    indicator_key WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  );

ALTER TABLE region_boundaries
  ADD CONSTRAINT region_boundaries_no_overlap
  EXCLUDE USING gist (
    region_id WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  );
