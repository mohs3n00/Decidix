#!/usr/bin/env node
/**
 * Read the deployed staging API and store responses as evidence.
 *
 * Credentials come from `scripts/test_staging_e2e.js` (the existing demo account)
 * unless STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD are set. Tokens are never
 * printed or written to disk; only response bodies (without headers) are saved.
 *
 * Usage: node scripts/e2e/staging_api_probe.mjs [endpoint ...]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';
const OUT = resolve('docs/evidence/e2e/api');

function demoCredentials() {
  if (process.env.STAGING_ADMIN_PASSWORD) {
    return {
      email: process.env.STAGING_ADMIN_EMAIL || 'admin@decidix.gov',
      password: process.env.STAGING_ADMIN_PASSWORD,
    };
  }
  const source = readFileSync(resolve('scripts/test_staging_e2e.js'), 'utf8');
  const password = /password: '([^']+)'/.exec(source)?.[1];
  const email = /email: '([^']+)'/.exec(source)?.[1];
  if (!password || !email) throw new Error('No demo credential found for the staging probe.');
  return { email, password };
}

export async function login() {
  const { email, password } = demoCredentials();
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Login failed: HTTP ${response.status}`);
  return body.data.token;
}

async function get(path, token) {
  const response = await fetch(`${BASE}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

const ENDPOINTS = [
  '/overview',
  '/regions',
  '/insights/data-quality',
  '/insights/historical',
  '/insights/priority',
  '/insights/comparison',
  '/insights/education',
  '/intelligence/predictions?target_year=2027',
  '/datasets/active',
  '/datasets',
  '/intelligence/recommendations',
  '/decisions/projects',
  '/decisions/reports',
];

// Only probe when invoked directly; other scripts import `login` from here.
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('staging_api_probe.mjs');
if (invokedDirectly) {
  await probe(process.argv.slice(2));
}

async function probe(requested) {
const paths = requested.length ? requested : ENDPOINTS;
const token = await login();
mkdirSync(OUT, { recursive: true });

for (const path of paths) {
  const safeName = path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const { status, body } = await get(path, token);
  const file = resolve(OUT, `${safeName}.json`);
  writeFileSync(file, JSON.stringify({ path, status, body }, null, 2));
  const preview =
    typeof body === 'object' && body !== null
      ? JSON.stringify(body).slice(0, 160)
      : String(body).slice(0, 160);
  console.log(`${status} ${path} -> ${file.replace(process.cwd(), '.')}\n    ${preview}`);
}
}
