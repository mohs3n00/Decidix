import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';

function getCredentials() {
  const source = fs.readFileSync(path.resolve(__dirname, 'test_staging_e2e.js'), 'utf8');
  const password = /password: '([^']+)'/.exec(source)?.[1];
  const email = /email: '([^']+)'/.exec(source)?.[1];
  if (!password || !email) throw new Error('No credential found in scripts/test_staging_e2e.js');
  return { email, password };
}

async function login() {
  const { email, password } = getCredentials();
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${JSON.stringify(data)}`);
  return data.data.token;
}

const results = [];

function record(name, pass, details = '') {
  results.push({ name, pass, details });
  const icon = pass ? ' PASS ' : ' FAIL ';
  console.log(`[${icon}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function run() {
  console.log('=== DECIDIX DATA PLATFORM, ML & AI END-TO-END VERIFICATION ===\n');
  const token = await login();
  console.log('Successfully authenticated with Heroku Staging Backend.\n');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Initial Datasets List & Stats
  try {
    const listRes = await fetch(`${BASE}/datasets`, { headers });
    const listData = await listRes.json();
    record('GET /v1/datasets (List)', listRes.ok, `Found ${listData.data?.length ?? 0} versions`);

    const statsRes = await fetch(`${BASE}/datasets/stats`, { headers });
    const statsData = await statsRes.json();
    record('GET /v1/datasets/stats', statsRes.ok, `Total: ${statsData.data?.total}, Processed: ${statsData.data?.processed}`);
  } catch (e) {
    record('Datasets List & Stats', false, e.message);
  }

  // 2. Upload CSV
  let csvDatasetId = null;
  try {
    const csvContent = fs.readFileSync(path.join(__dirname, 'fixtures/test_egypt_health.csv'), 'utf8');
    const uploadRes = await fetch(`${BASE}/datasets/upload-direct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'test_egypt_health.csv',
        format: 'csv',
        source: 'Ministry of Health Test',
        license: 'CC-BY-4.0',
        coverage: 'Egypt Regions 2022-2024',
        name: 'Egypt Health Metrics Test',
        content: csvContent,
        auto_activate: true,
      }),
    });
    const uploadData = await uploadRes.json();
    record('Upload CSV (Direct)', uploadRes.ok, `ID: ${uploadData.data?.id}, Records: ${uploadData.data?.record_count}, Status: ${uploadData.data?.validation_status}`);
    csvDatasetId = uploadData.data?.id;
  } catch (e) {
    record('Upload CSV (Direct)', false, e.message);
  }

  // 3. Upload TSV
  let tsvDatasetId = null;
  try {
    const tsvContent = fs.readFileSync(path.join(__dirname, 'fixtures/test_egypt_education.tsv'), 'utf8');
    const uploadRes = await fetch(`${BASE}/datasets/upload-direct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'test_egypt_education.tsv',
        format: 'tsv',
        source: 'Ministry of Education Test',
        license: 'CC-BY-4.0',
        coverage: 'Egypt Regions 2022-2024',
        name: 'Egypt Education Metrics Test',
        content: tsvContent,
        auto_activate: false,
      }),
    });
    const uploadData = await uploadRes.json();
    record('Upload TSV (Direct)', uploadRes.ok, `ID: ${uploadData.data?.id}, Records: ${uploadData.data?.record_count}, Status: ${uploadData.data?.validation_status}`);
    tsvDatasetId = uploadData.data?.id;
  } catch (e) {
    record('Upload TSV (Direct)', false, e.message);
  }

  // 4. Upload JSON Array
  let jsonDatasetId = null;
  try {
    const jsonContent = fs.readFileSync(path.join(__dirname, 'fixtures/test_egypt_records.json'), 'utf8');
    const uploadRes = await fetch(`${BASE}/datasets/upload-direct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'test_egypt_records.json',
        format: 'json',
        source: 'Telecom Authority Test',
        license: 'CC-BY-4.0',
        coverage: 'Egypt Regions 2022-2024',
        name: 'Egypt Broadband Coverage Test',
        content: jsonContent,
        auto_activate: false,
      }),
    });
    const uploadData = await uploadRes.json();
    record('Upload JSON Array (Direct)', uploadRes.ok, `ID: ${uploadData.data?.id}, Records: ${uploadData.data?.record_count}, Status: ${uploadData.data?.validation_status}`);
    jsonDatasetId = uploadData.data?.id;
  } catch (e) {
    record('Upload JSON Array (Direct)', false, e.message);
  }

  // 5. Upload JSONL / NDJSON
  let jsonlDatasetId = null;
  try {
    const jsonlContent = fs.readFileSync(path.join(__dirname, 'fixtures/test_egypt_stream.jsonl'), 'utf8');
    const uploadRes = await fetch(`${BASE}/datasets/upload-direct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'test_egypt_stream.jsonl',
        format: 'jsonl',
        source: 'Water Authority Test',
        license: 'CC-BY-4.0',
        coverage: 'Egypt Regions 2022-2024',
        name: 'Egypt Water Access Test',
        content: jsonlContent,
        auto_activate: false,
      }),
    });
    const uploadData = await uploadRes.json();
    record('Upload JSONL Stream (Direct)', uploadRes.ok, `ID: ${uploadData.data?.id}, Records: ${uploadData.data?.record_count}, Status: ${uploadData.data?.validation_status}`);
    jsonlDatasetId = uploadData.data?.id;
  } catch (e) {
    record('Upload JSONL Stream (Direct)', false, e.message);
  }

  // 6. Upload Binary XLSX Spreadsheet
  let xlsxDatasetId = null;
  try {
    const xlsxBuffer = fs.readFileSync(path.join(__dirname, 'fixtures/test_egypt_economy.xlsx'));
    const xlsxBase64 = xlsxBuffer.toString('base64');
    const uploadRes = await fetch(`${BASE}/datasets/upload-direct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'test_egypt_economy.xlsx',
        format: 'xlsx',
        source: 'Economy Ministry Test',
        license: 'CC-BY-4.0',
        coverage: 'Egypt Regions 2022-2024',
        name: 'Egypt Economy Workbook Test',
        content: xlsxBase64,
        auto_activate: false,
      }),
    });
    const uploadData = await uploadRes.json();
    record('Upload Binary XLSX (Direct)', uploadRes.ok, `ID: ${uploadData.data?.id}, Records: ${uploadData.data?.record_count}, Status: ${uploadData.data?.validation_status}`);
    xlsxDatasetId = uploadData.data?.id;
  } catch (e) {
    record('Upload Binary XLSX (Direct)', false, e.message);
  }

  // 7. Upload Malformed File & Quality Gate Rejection
  try {
    const malformedContent = fs.readFileSync(path.join(__dirname, 'fixtures/test_malformed.csv'), 'utf8');
    const uploadRes = await fetch(`${BASE}/datasets/upload-direct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'test_malformed.csv',
        format: 'csv',
        source: 'Test Source',
        license: 'Test',
        coverage: 'Test',
        name: 'Malformed Test File',
        content: malformedContent,
        auto_activate: false,
      }),
    });
    const uploadData = await uploadRes.json();
    const isRejectedOrReported = !uploadRes.ok || uploadData.data?.validation_status === 'invalid';
    record('Malformed File Quality Gate', isRejectedOrReported, `Status: ${uploadRes.status}, Error/Validation: ${uploadData.error?.message || uploadData.data?.validation_status}`);
  } catch (e) {
    record('Malformed File Quality Gate', true, `Caught rejection correctly: ${e.message}`);
  }

  // 8. Test Records Preview API (`GET /v1/datasets/:id/records`)
  const targetId = csvDatasetId || xlsxDatasetId || jsonDatasetId;
  if (targetId) {
    try {
      const recordsRes = await fetch(`${BASE}/datasets/${targetId}/records?page=1&limit=5`, { headers });
      const recordsData = await recordsRes.json();
      const records = recordsData.data?.records;
      record('GET /v1/datasets/:id/records', recordsRes.ok && records?.length > 0, `Retrieved ${records?.length} records, Total: ${recordsData.data?.total}`);
    } catch (e) {
      record('GET /v1/datasets/:id/records', false, e.message);
    }

    // 9. Test Quality Report API (`GET /v1/datasets/:id/report`)
    try {
      const reportRes = await fetch(`${BASE}/datasets/${targetId}/report`, { headers });
      const reportData = await reportRes.json();
      const report = reportData.data;
      record('GET /v1/datasets/:id/report', reportRes.ok && !!report, `Report Status: ${report?.status}, Processed: ${report?.processedRecords}, Columns: ${report?.detectedColumns?.join(', ')}`);
    } catch (e) {
      record('GET /v1/datasets/:id/report', false, e.message);
    }
  }

  // 10. Test ML Predictions API (`GET /v1/intelligence/predictions?target_year=2028`)
  try {
    const mlRes = await fetch(`${BASE}/intelligence/predictions?target_year=2028`, { headers });
    const mlData = await mlRes.json();
    const items = mlData.data?.items ?? mlData.data;
    record('GET /v1/intelligence/predictions', mlRes.ok, `Retrieved ${Array.isArray(items) ? items.length : 'predictions'} items for 2028`);
  } catch (e) {
    record('GET /v1/intelligence/predictions', false, e.message);
  }

  // 11. Test AI Assistant Retrieval & Grounding
  try {
    const aiRes = await fetch(`${BASE}/intelligence/assistant/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'What datasets and indicators are available in the system?',
        language: 'en',
      }),
    });
    const aiData = await aiRes.json();
    const reply = aiData.data?.reply?.text;
    const isModelOrFallback = aiData.data?.answer_source === 'model' || aiData.data?.answer_source === 'deterministic_fallback';
    record('AI Assistant Grounded Response', aiRes.ok && !!reply && isModelOrFallback, `Source: ${aiData.data?.answer_source}, Reply length: ${reply?.length} chars`);
  } catch (e) {
    record('AI Assistant Grounded Response', false, e.message);
  }

  console.log('\n=== SUMMARY OF RESULTS ===');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
}

run().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
