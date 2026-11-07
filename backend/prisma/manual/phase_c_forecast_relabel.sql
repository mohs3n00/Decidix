-- OWNER-RUN SCRIPT — DO NOT APPLY AUTOMATICALLY.
--
-- This file is deliberately NOT in backend/prisma/migrations/. It was never executed by an agent,
-- and it is not part of `prisma migrate deploy`.
--
-- Purpose: relabel forecast rows that claim an official source or official validation. No row is
-- deleted and no value is changed. Run only after reviewing the dry-run output and taking a backup.
--
-- Confirm the column names against backend/prisma/schema.prisma before running:
--   ml_forecasts(id, forecast_source, validation_status, is_calibrated, ...)
--
-- The `id` embeds the status suffix (fc_<region>_<indicator>_<year>_<version>_<status>). Rewriting it
-- keeps future upserts from creating a duplicate row under a new key. If a row with the rewritten id
-- already exists, this statement fails and the transaction rolls back — resolve the duplicate first.

BEGIN;

-- 1. Dry run: inspect what would change.
SELECT id, forecast_source, validation_status, is_calibrated
FROM ml_forecasts
WHERE validation_status = 'validated' OR forecast_source = 'official_planning'
ORDER BY forecast_year;

-- 2. Relabel in place (values preserved).
UPDATE ml_forecasts
SET forecast_source = 'simulated_scenario',
    validation_status = 'simulated',
    is_calibrated = false,
    id = replace(id, '_validated', '_simulated')
WHERE validation_status = 'validated' OR forecast_source = 'official_planning';

-- 3. Column defaults must stop asserting official status for future inserts.
--    The reviewed migration 20261104170000_safe_forecast_defaults handles new
--    inserts separately. This owner-run script is only for existing rows.
ALTER TABLE ml_forecasts ALTER COLUMN forecast_source SET DEFAULT 'simulated_scenario';
ALTER TABLE ml_forecasts ALTER COLUMN validation_status SET DEFAULT 'simulated';
ALTER TABLE ml_forecasts ALTER COLUMN is_calibrated SET DEFAULT false;

-- 4. Verify: this must return zero rows.
SELECT count(*) AS remaining_official_claims
FROM ml_forecasts
WHERE validation_status = 'validated' OR forecast_source = 'official_planning';

COMMIT;
