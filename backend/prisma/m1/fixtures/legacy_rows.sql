-- Representative legacy rows with NO version provenance.
-- Used by scenarios "legacy" and "unattributable". Every analytical row here
-- has dataset_version_id NULL, which is exactly the case M1 must not attribute.
INSERT INTO regions (id, name, arabic_name, rank, score, priority, population, latitude, longitude, boundary_geojson)
VALUES
  ('alpha', 'Alpha Region', 'منطقة ألفا', 1, 80.0, 'high', 1200000, 24.700000, 46.700000,
   '{"type":"Polygon","coordinates":[[[46.5,24.5],[46.9,24.5],[46.9,24.9],[46.5,24.9],[46.5,24.5]]]}'),
  ('beta',  'Beta Region',  'منطقة بيتا', 2, 60.0, 'medium', 800000, 21.500000, 39.200000,
   '{"type":"Polygon","coordinates":[[[39.0,21.3],[39.4,21.3],[39.4,21.7],[39.0,21.7],[39.0,21.3]]]}');

INSERT INTO indicators (key, label, arabic_label, domain, unit, higher_is_better, description)
VALUES
  ('development_index', 'Development Index', 'مؤشر التنمية', 'overall', 'score_100', true, 'Composite index'),
  ('school_enrollment', 'School Enrollment', 'الالتحاق بالمدارس', 'education', 'percent', true, 'Net enrollment rate');

INSERT INTO regional_metrics (region_id, indicator_key, year, value, change, sparkline)
VALUES
  ('alpha', 'development_index', 2024, 80.00, 1.50, '[76,78,79,80]'),
  ('beta',  'development_index', 2024, 60.00, -0.50, '[62,61,60,60]');

INSERT INTO national_index_history
  (period, year, score, band, population, regions_count, at_risk_count, ai_insight_text, ai_insight_arabic_text)
VALUES
  ('2024', 2024, 70.0, 'moderate', 2000000, 2, 1, 'Baseline insight.', 'رؤية أساسية.');

INSERT INTO sector_breakdowns (sector, key, label, arabic_label, value, unit, sort_order)
VALUES ('education', 'enrollment', 'Enrollment', 'الالتحاق', 82.5, 'percent', 1);

INSERT INTO ai_recommendations
  (id, priority, region_id, domain, title, arabic_title, summary, arabic_summary,
   index_impact, estimated_cost_amount, confidence, status)
VALUES
  ('rec-unversioned', 'high', 'beta', 'education', 'Expand schools', 'توسيع المدارس',
   'Build schools.', 'بناء مدارس.', 1.2, 500000.00, 70, 'suggested');

INSERT INTO dataset_metadata
  (id, name, arabic_name, original_source, license, time_coverage, update_frequency, record_count)
VALUES
  ('meta-unversioned', 'Legacy Dataset', 'مجموعة بيانات', 'Legacy source', 'internal',
   '2020-2024', 'annual', 2);

INSERT INTO rag_documents
  (id, title, arabic_title, content, arabic_content, source, category)
VALUES
  ('rag-unversioned', 'Legacy Doc', 'وثيقة', 'Content.', 'محتوى.', 'Legacy source', 'report');
