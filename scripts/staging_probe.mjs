#!/usr/bin/env node
/**
 * Read-only staging contract probe (Decidix recovery plan, Phase 0 / T0.3; also Phase 9 / T9.6).
 *
 * This script makes read-only GET/POST requests against the public analytics
 * and auth surface of a Decidix backend deployment and reports whether
 * fabricated fixture data or unsafe auth behaviour is reachable. It does not
 * create accounts or change server state, and never prints a token, password,
 * or secret value.
 *
 * Usage:
 *   node scripts/staging_probe.mjs [baseUrl]
 *
 * Default baseUrl: the current staging URL from env/staging.json.
 *
 * Exit code 0 means every check passed (no fabricated data reachable, auth
 * surface behaves safely). Exit code 1 means at least one check failed and
 * the backend is not yet safe to treat as "recovered".
 */

const DEFAULT_BASE_URL = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';
const baseUrl = (process.argv[2] || DEFAULT_BASE_URL).replace(/\/+$/, '');

/** @type {{name: string, pass: boolean, detail: string}[]} */
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name} - ${detail}`);
}

async function getJson(path, init) {
  const res = await fetch(`${baseUrl}${path}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`Probing ${baseUrl} (read-only; no writes, no secrets printed)\n`);

  // 1. Dataset-gated analytics routes must refuse fabricated data once the
  //    production guard (T1.2) is deployed. Before that fix ships, this is
  //    EXPECTED to fail -- that failure is the evidence that remediation has
  //    not reached this environment yet.
  const gatedRoutes = [
    '/overview',
    '/regions',
    '/regions/map-points',
    '/insights/education',
    '/insights/historical',
    '/insights/priority',
    '/insights/data-quality',
    '/intelligence/predictions',
  ];
  for (const route of gatedRoutes) {
    const { status, body } = await getJson(route);
    const isGated = status === 503 && body?.error?.code === 'DATASET_NOT_CONNECTED';
    record(
      `GET ${route} is dataset-gated`,
      isGated,
      isGated ? '503 DATASET_NOT_CONNECTED (no fabricated data served)' : `HTTP ${status}, body=${JSON.stringify(body).slice(0, 160)}`
    );
  }

  // 2. Fixture-fallback routes (recommendations, projects, citizen reports)
  //    must not serve inline fictional arrays.
  const fixtureRoutes = [
    { path: '/intelligence/recommendations', idPrefix: 'rec_' },
    { path: '/decisions/projects', idPrefix: 'prj_' },
    { path: '/decisions/citizen-reports', idPrefix: 'rep_' },
  ];
  for (const { path, idPrefix } of fixtureRoutes) {
    const { status, body } = await getJson(path);
    const text = JSON.stringify(body);
    const containsFixture = text.includes(`"${idPrefix}`);
    record(
      `GET ${path} contains no fixture IDs (${idPrefix}*)`,
      status !== 200 || !containsFixture,
      `HTTP ${status}, fixture-id-present=${containsFixture}`
    );
  }

  // 3. Chatbot must refuse without an approved active dataset, not answer
  //    from hardcoded keyword branches.
  {
    const { status, body } = await getJson('/intelligence/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the literacy rate in Frontier?', language: 'en' }),
    });
    const text = JSON.stringify(body);
    const looksFabricated = /Ministry of Health Registry|Central Capital leads|index of 44/i.test(text);
    const refusesOrGrounded = status === 503 || (status === 200 && !looksFabricated);
    record(
      'POST /intelligence/assistant/chat does not fabricate a ministry citation',
      refusesOrGrounded,
      `HTTP ${status}, fabricated-pattern-detected=${looksFabricated}`
    );
  }

  // 4. /auth/google must exist and reject an empty/invalid token with 401,
  //    not 404 (undeployed route) and not a silently-created session.
  {
    const { status, body } = await getJson('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const routeDeployed = status !== 404;
    record('POST /auth/google route is deployed', routeDeployed, `HTTP ${status}`);
    if (routeDeployed) {
      const rejectsCleanly = status === 400 || status === 401 || status === 422;
      record(
        'POST /auth/google with no token is rejected (no session minted)',
        rejectsCleanly,
        `HTTP ${status}, body=${JSON.stringify(body).slice(0, 160)}`
      );
    }
  }

  // 5. Protected admin routes must reject unauthenticated callers. Do not
  // probe registration here: creating throwaway accounts is not read-only.
  {
    const { status, body } = await getJson('/admin/users');
    const rejectsUnauthenticated = status === 401 || status === 403;
    record(
      'GET /admin/users rejects unauthenticated callers',
      rejectsUnauthenticated,
      `HTTP ${status}, body=${JSON.stringify(body).slice(0, 160)}`
    );
  }

  console.log('\n--- Summary ---');
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log('Failing checks:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('Probe crashed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
