#!/usr/bin/env node
/**
 * Send one assistant question to staging and print the grounding metadata.
 *
 * Usage: node scripts/e2e/chat_probe.mjs "<question>" [language]
 */
import { login } from './staging_api_probe.mjs';

const BASE = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';
const question = process.argv[2];
const language = process.argv[3] || 'en';
if (!question) {
  console.error('Usage: node scripts/e2e/chat_probe.mjs "<question>" [en|ar]');
  process.exit(2);
}

const token = await login();
const response = await fetch(`${BASE}/intelligence/assistant/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: JSON.stringify({ message: question, language }),
});
const body = await response.json();
console.log(`HTTP ${response.status}`);
console.log(JSON.stringify(body, null, 1).slice(0, 2600));
