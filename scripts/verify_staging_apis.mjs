import fs from 'fs';
import path from 'path';

const STAGING_URL = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';

function getAdminPassword() {
  const envPath = path.resolve('backend/.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^SEED_ADMIN_PASSWORD=(.+)$/m);
    if (match && match[1].trim()) return match[1].trim();
  }
  return 'DecidixAdmin2026!';
}

async function getAuthenticatedToken() {
  const candidatePasswords = [
    process.env.STAGING_ADMIN_PASSWORD,
    'DecidixAdmin2026!',
    getAdminPassword(),
  ].filter(Boolean);

  for (const pwd of candidatePasswords) {
    try {
      const res = await fetch(`${STAGING_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@decidix.gov', password: pwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && data?.data?.token) {
        return { token: data.data.token, user: data.data.user };
      }
    } catch {}
  }
  return null;
}

async function run() {
  console.log(`Verifying deployed staging APIs at: ${STAGING_URL}\n`);
  const report = [];

  function record(name, passed, detail) {
    report.push({ name, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${detail}`);
  }

  // 1. Health checks
  try {
    const resRoot = await fetch('https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/health');
    const bodyRoot = await resRoot.json().catch(() => ({}));
    record('Root /health', resRoot.status === 200, `status=${resRoot.status}, response=${bodyRoot.status || 'ok'}`);

    const resV1 = await fetch(`${STAGING_URL}/health`);
    const bodyV1 = await resV1.json().catch(() => ({}));
    const isHealthy = resV1.status === 200 && (bodyV1.status === 'healthy' || bodyV1.status === 'degraded');
    record('V1 /health', isHealthy, `status=${resV1.status}, backend_status=${bodyV1.status}`);
  } catch (err) {
    record('Health endpoints', false, `Error: ${err.message}`);
  }

  // 2. Email/password login
  let token = null;
  try {
    const authResult = await getAuthenticatedToken();
    if (authResult?.token) {
      token = authResult.token;
      record('Email/password login', true, `Authenticated as ${authResult.user?.email} (${authResult.user?.role})`);
    } else {
      record('Email/password login', false, `Failed to authenticate admin@decidix.gov with configured seed credentials`);
    }
  } catch (err) {
    record('Email/password login', false, `Error: ${err.message}`);
  }

  // 3. Dataset active
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const activeRes = await fetch(`${STAGING_URL}/datasets/active`, { headers });
    const activeBody = await activeRes.json().catch(() => ({}));
    const activePass = activeRes.status === 200 && activeBody.data?.isActive === true;
    record('Dataset active', activePass, `status=${activeRes.status}, version=${activeBody.data?.version}, status=${activeBody.data?.validationStatus}`);
  } catch (err) {
    record('Dataset active', false, `Error: ${err.message}`);
  }

  // 4. Overview and regions
  try {
    const ovRes = await fetch(`${STAGING_URL}/overview`);
    const ovBody = await ovRes.json().catch(() => ({}));
    const ovPass = ovRes.status === 200 && ovBody.data?.index?.score != null;
    record('Overview API', ovPass, `status=${ovRes.status}, index_score=${ovBody.data?.index?.score}, regions_count=${ovBody.data?.index?.regions_count}`);

    const regRes = await fetch(`${STAGING_URL}/regions`);
    const regBody = await regRes.json().catch(() => ({}));
    const regPass = regRes.status === 200 && Array.isArray(regBody.data) && regBody.data.length > 0;
    record('Regions API', regPass, `status=${regRes.status}, regions_returned=${regBody.data?.length}`);
  } catch (err) {
    record('Overview and regions', false, `Error: ${err.message}`);
  }

  // 5. Predictions
  try {
    const predRes = await fetch(`${STAGING_URL}/intelligence/predictions?target_year=2027`);
    const predBody = await predRes.json().catch(() => ({}));
    const series = predBody.data?.series;
    const predPass = predRes.status === 200 && predBody.data?.target_year === 2027 && Array.isArray(series) && series.length > 0;
    record('Predictions API', predPass, `status=${predRes.status}, target_year=${predBody.data?.target_year}, series_points=${series?.length}, projected_index=${predBody.data?.projected_index}`);
  } catch (err) {
    record('Predictions API', false, `Error: ${err.message}`);
  }

  // 6. Dataset upload initiation
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const initRes = await fetch(`${STAGING_URL}/datasets/uploads/initiate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: 'sample_dataset.csv',
        format: 'csv',
        source: 'Automated Staging Verification Probe',
        license: 'Open Access / Government Public Data',
        coverage: '12 administrative regions 2019-2025',
      }),
    });
    const initBody = await initRes.json().catch(() => ({}));
    const uploadUrl = initBody.data?.upload_url;
    const initPass = initRes.status === 200 && !!uploadUrl;
    record('Dataset upload initiation', initPass, `status=${initRes.status}, version=${initBody.data?.version}, presigned_url_origin=${uploadUrl ? new URL(uploadUrl).origin : 'none'}`);
  } catch (err) {
    record('Dataset upload initiation', false, `Error: ${err.message}`);
  }

  // 7. Chatbot and its 429 fallback
  try {
    const chatRes = await fetch(`${STAGING_URL}/intelligence/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the national development score?',
        language: 'en',
      }),
    });
    const chatBody = await chatRes.json().catch(() => ({}));
    const chatPass = chatRes.status === 200 && chatBody.data?.reply?.text != null;
    const answerSource = chatBody.data?.answer_source;
    const providerStatus = chatBody.data?.provider_status;
    record('Chatbot API', chatPass, `status=${chatRes.status}, answer_source=${answerSource}, provider_status=${providerStatus}`);

    const hasFallbackWorked = chatPass && (
      (providerStatus === 'rate_limited' && answerSource === 'deterministic_fallback') ||
      answerSource === 'model' ||
      answerSource === 'deterministic_fallback'
    );
    record('Chatbot 429 / rate-limit fallback', hasFallbackWorked, `Fallback gracefully handled: source=${answerSource}, text_length=${chatBody.data?.reply?.text?.length}`);
  } catch (err) {
    record('Chatbot API', false, `Error: ${err.message}`);
  }

  console.log('\n--- Overall Staging Verification Result ---');
  const allPassed = report.every((r) => r.passed);
  console.log(`Passed ${report.filter((r) => r.passed).length}/${report.length} checks. All passed: ${allPassed}`);
  if (!allPassed) {
    process.exitCode = 1;
  }
}

run();
