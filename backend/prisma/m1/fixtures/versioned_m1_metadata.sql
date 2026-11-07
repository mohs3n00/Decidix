-- M1-era metadata for the pre-existing versions created by versioned_rows.sql.
--
-- `dataset_versions.dataset_family` and `.bundle_key` are added by
-- 001_schema.sql, so this step runs between 001 and 002. This mirrors a real
-- rollout: versions ingested before M1 get their family/bundle assigned in the
-- same release that introduces the columns, from the release manifest — not by
-- guessing from payload contents.
--
--   ver-a  national_index  bundle-x   (validated)
--   ver-b  national_index  NULL       (validated)
--   ver-d  national_index  bundle-y   (validated)
--   ver-c  sector_economy  bundle-y   (uploaded  -> bundle must refuse activation)

UPDATE dataset_versions SET dataset_family = 'national_index', bundle_key = 'bundle-x'
 WHERE id = 'ver-a';
UPDATE dataset_versions SET dataset_family = 'national_index'
 WHERE id = 'ver-b';
UPDATE dataset_versions SET dataset_family = 'national_index', bundle_key = 'bundle-y'
 WHERE id = 'ver-d';
UPDATE dataset_versions SET dataset_family = 'sector_economy', bundle_key = 'bundle-y'
 WHERE id = 'ver-c';
