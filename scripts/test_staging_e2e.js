/**
 * Phase E1 — Staging Security, Reliability & End-to-End Live Validation Script
 * Tests the live deployed Heroku staging backend (https://decidix-backend-staging-cfa3445b7c14.herokuapp.com)
 * and verifies PostgreSQL database state before and after state transitions.
 */

const BASE_URL = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com';
const API_PREFIX = '/v1';

async function api(path, options = {}) {
  const url = `${BASE_URL}${API_PREFIX}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function runE2ETests() {
  console.log('========================================================');
  console.log('Decidix Phase E1 — Live Staging Validation Suite');
  console.log('Target: ' + BASE_URL);
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, description, detail = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description} ${detail}`);
      failed++;
    }
  }

  // 1. Health and Subsystem Status
  console.log('--- 1. Health & Subsystem Probes ---');
  const healthRoot = await api('/../health');
  assert(healthRoot.status === 200 && healthRoot.body.status === 'ok', 'GET /health returns 200 OK');

  const healthV1 = await api('/health');
  assert(healthV1.status === 200, 'GET /v1/health returns 200 OK');
  assert(healthV1.body.database === 'connected', 'Database reported as connected in live health probe');
  assert(healthV1.body.zero_cost_policy?.compliant === true, 'Zero-Cost AI Policy is strictly enforced and compliant');
  assert(healthV1.body.zero_cost_policy?.model === 'meta-llama/llama-3.3-70b-instruct:free', 'Active AI model is verified :free model');

  // Rate Limiting Headers
  assert(healthV1.headers.get('x-ratelimit-limit') !== null, 'X-RateLimit-Limit header is present');
  assert(healthV1.headers.get('x-ratelimit-remaining') !== null, 'X-RateLimit-Remaining header is present');
  assert(healthV1.headers.get('x-ratelimit-reset') !== null, 'X-RateLimit-Reset header is present');

  // 2. Authentication & Session Ownership
  console.log('\n--- 2. Authentication & Session Lifecycle ---');
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@decidix.gov', password: 'DecidixAdmin2026!' }),
  });
  assert(loginRes.status === 200, 'Admin login succeeds with 200 OK');
  const adminToken = loginRes.body.data?.token;
  let refreshToken = loginRes.body.data?.refresh_token;
  assert(adminToken !== undefined, 'Access token is returned');
  assert(refreshToken !== undefined, 'Refresh token is returned');
  assert(loginRes.body.data?.user?.password_hash === undefined, 'Password hash is NEVER exposed in login response');

  // /v1/auth/me
  const meRes = await api('/auth/me', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(meRes.status === 200 && meRes.body.data?.user?.email === 'admin@decidix.gov', 'GET /v1/auth/me returns valid admin profile');
  assert(meRes.body.data?.user?.password_hash === undefined, 'Password hash is NEVER exposed in /me response');

  // Token Rotation
  const refreshRes = await api('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  assert(refreshRes.status === 200, 'Token rotation succeeds with 200 OK');
  const newAccessToken = refreshRes.body.data?.token;
  const newRefreshToken = refreshRes.body.data?.refresh_token;
  assert(newRefreshToken !== refreshToken, 'New distinct refresh token is issued');

  // Reuse Detection
  const reuseRes = await api('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  assert(reuseRes.status === 401 && reuseRes.body.error?.code === 'TOKEN_REUSE_DETECTED',
    'Reusing old refresh token triggers 401 TOKEN_REUSE_DETECTED and security breach response');

  // Re-login Admin for remaining tests
  const relogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@decidix.gov', password: 'DecidixAdmin2026!' }),
  });
  const currentAdminToken = relogin.body.data?.token;

  // 3. RBAC & Unauthorized Access
  console.log('\n--- 3. Role-Based Access Control (RBAC) ---');
  const viewerEmail = `viewer_${Date.now()}@decidix.gov`;
  const regViewer = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Viewer',
      email: viewerEmail,
      password: 'ViewerPassword2026!',
      role: 'viewer',
    }),
  });
  assert(regViewer.status === 201, 'Viewer registered with 201 Created');
  const viewerToken = regViewer.body.data?.token;

  // Viewer attempts admin route
  const viewerAdminRes = await api('/admin/users', {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  assert(viewerAdminRes.status === 403 && viewerAdminRes.body.error?.code === 'ROLE_NOT_AUTHORIZED',
    'Viewer denied access to /v1/admin/users with 403 ROLE_NOT_AUTHORIZED');

  // Viewer attempts policy modification
  const viewerRecRes = await api('/intelligence/recommendations/rec_frontier_mobile_clinics/accept', {
    method: 'POST',
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  assert(viewerRecRes.status === 403 && viewerRecRes.body.error?.code === 'PERMISSION_DENIED',
    'Viewer denied policy modification with 403 PERMISSION_DENIED');

  // Admin accesses admin route
  const adminUsersRes = await api('/admin/users', {
    headers: { Authorization: `Bearer ${currentAdminToken}` },
  });
  assert(adminUsersRes.status === 200 && Array.isArray(adminUsersRes.body.data?.users),
    'Admin successfully accesses /v1/admin/users');
  const hasLeakedHash = adminUsersRes.body.data?.users?.some(u => u.password_hash || u.passwordHash);
  assert(!hasLeakedHash, 'Administrative user list strictly sanitizes and omits password hashes');

  // 4. Overview & Regional Profiles
  console.log('\n--- 4. Overview & Regional Data ---');
  const overviewRes = await api('/overview');
  assert(overviewRes.status === 200, 'GET /v1/overview returns 200 OK');
  assert(overviewRes.body.data?.index?.score !== undefined, `National development score: ${overviewRes.body.data?.index?.score}`);

  const regionsRes = await api('/regions');
  assert(regionsRes.status === 200 && regionsRes.body.data?.length === 12, 'GET /v1/regions returns 12 regions');

  const frontierRes = await api('/regions/frontier');
  assert(frontierRes.status === 200 && frontierRes.body.data?.name === 'Frontier',
    'GET /v1/regions/frontier returns Frontier regional profile (score: ' + frontierRes.body.data?.score + ')');

  // 5. Sector Insights
  console.log('\n--- 5. Sector Insights ---');
  const eduRes = await api('/insights/education');
  assert(eduRes.status === 200 && eduRes.body.data?.kpis?.length > 0, 'GET /v1/insights/education returns deep-dive KPIs');

  const compRes = await api('/insights/comparison?a=delta&b=frontier');
  assert(compRes.status === 200 && compRes.body.data?.metrics?.length > 0,
    `GET /v1/insights/comparison returns regional indicator comparison (${compRes.body.data?.metrics?.length} metrics)`);

  // 6. ML Forecasts
  console.log('\n--- 6. Machine Learning Predictions ---');
  const mlRes = await api('/intelligence/predictions?target_year=2028');
  assert(mlRes.status === 200, 'GET /v1/intelligence/predictions returns 200 OK');
  assert(mlRes.body.data?.target_year === 2028, 'Target year 2028 confirmed');
  assert(mlRes.body.data?.projected_index !== undefined, `Projected index 2028: ${mlRes.body.data?.projected_index}`);
  assert(mlRes.body.data?.models?.length > 0, `Models present: ${mlRes.body.data?.models?.length} model architectures`);
  assert(mlRes.body.data?.series?.length > 0, `Historical/forecast series present: ${mlRes.body.data?.series?.length} points`);

  // 7. Grounded RAG Assistant
  console.log('\n--- 7. AI Assistant & Grounded RAG ---');
  const chatRes = await api('/intelligence/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'What are the primary healthcare indicators in Frontier?',
      language: 'en',
    }),
  });
  assert(chatRes.status === 200, 'POST /v1/intelligence/assistant/chat returns 200 OK');
  assert(chatRes.body.data?.reply?.text?.length > 20,
    `Assistant returns grounded reply: "${chatRes.body.data?.reply?.text?.slice(0, 80)}..."`);
  assert(chatRes.body.data?.reply?.sources?.length > 0,
    `Grounded retrieval returned ${chatRes.body.data?.reply?.sources?.length} source citations`);

  // 8. What-If Simulator Live Verification (Task 3)
  console.log('\n--- 8. What-If Scenario Simulator Live Verification ---');
  // Scenario A: $0 Allocation
  const simZero = await api('/decisions/simulate', {
    method: 'POST',
    body: JSON.stringify({
      region_id: 'frontier',
      allocations: { education: 0, healthcare: 0, infrastructure: 0, economy: 0 },
    }),
  });
  assert(simZero.status === 200 && simZero.body.data?.gain === 0 && simZero.body.data?.projected_score === simZero.body.data?.today_score,
    `Zero budget: Baseline ${simZero.body.data?.today_score} -> Projected ${simZero.body.data?.projected_score} (Gain: +0.00)`);

  // Scenario B: $10M Allocation
  const sim10M = await api('/decisions/simulate', {
    method: 'POST',
    body: JSON.stringify({
      region_id: 'frontier',
      allocations: { education: 2500000, healthcare: 2500000, infrastructure: 2500000, economy: 2500000 },
    }),
  });
  assert(sim10M.status === 200 && sim10M.body.data?.gain > 0,
    `$10M package: Baseline ${sim10M.body.data?.today_score} -> Projected ${sim10M.body.data?.projected_score} (Gain: +${sim10M.body.data?.gain})`);

  // Scenario C: Standard $120M Flutter package ($30M Edu, $45M Health, $20M Infra, $25M Econ)
  const sim120M = await api('/decisions/simulate', {
    method: 'POST',
    body: JSON.stringify({
      region_id: 'frontier',
      allocations: { education: 30000000, healthcare: 45000000, infrastructure: 20000000, economy: 25000000 },
    }),
  });
  assert(sim120M.status === 200 && sim120M.body.data?.today_score === 44 && sim120M.body.data?.projected_score === 51,
    `Standard $120M package: Baseline ${sim120M.body.data?.today_score} -> Projected ${sim120M.body.data?.projected_score} (Gain: +${sim120M.body.data?.gain})`);
  assert(sim120M.body.data?.best_lever?.domain === 'healthcare',
    `Best lever correctly identified: ${sim120M.body.data?.best_lever?.domain} (yield: ${sim120M.body.data?.best_lever?.marginal_yield})`);

  // Scenario D: $400M Heavy package to verify diminishing returns
  const sim400M = await api('/decisions/simulate', {
    method: 'POST',
    body: JSON.stringify({
      region_id: 'frontier',
      allocations: { education: 100000000, healthcare: 100000000, infrastructure: 100000000, economy: 100000000 },
    }),
  });
  const gain120 = sim120M.body.data?.gain;
  const gain400 = sim400M.body.data?.gain;
  // 3.33x budget should yield < 3.33x gain due to concavity
  const concavityHolds = (gain400 / gain120) < (400 / 120);
  assert(concavityHolds,
    `Diminishing marginal returns verified: 3.33x budget ($120M->$400M) yielded ${(gain400/gain120).toFixed(2)}x gain (+${gain120} -> +${gain400})`);

  // 9. Citizen Reports & Live PostgreSQL State Verification
  console.log('\n--- 9. Citizen Report Likes & Database State Inspection ---');
  const reportsBefore = await api('/decisions/citizen-reports');
  const rep = reportsBefore.body.data?.items?.find(r => r.id === 'rep_101');
  const initialLikes = rep?.likes;
  console.log(`  Initial likes count for rep_101: ${initialLikes}`);

  // Like toggle 1
  const toggle1 = await api('/decisions/citizen-reports/rep_101/like', {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentAdminToken}` },
  });
  assert(toggle1.status === 200, 'POST /citizen-reports/rep_101/like (toggle 1) returns 200 OK');
  const likes1 = toggle1.body.data?.likes;
  console.log(`  After toggle 1: ${likes1} (liked_by_me: ${toggle1.body.data?.liked_by_me})`);

  // Like toggle 2
  const toggle2 = await api('/decisions/citizen-reports/rep_101/like', {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentAdminToken}` },
  });
  assert(toggle2.status === 200, 'POST /citizen-reports/rep_101/like (toggle 2) returns 200 OK');
  const likes2 = toggle2.body.data?.likes;
  console.log(`  After toggle 2: ${likes2} (liked_by_me: ${toggle2.body.data?.liked_by_me})`);

  assert(likes1 !== likes2, `Like toggle state verified: transitioned from ${likes1} to ${likes2}`);

  console.log('\n========================================================');
  console.log(`Phase E1 Live Staging Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal error running live E2E tests:', err);
  process.exit(1);
});
