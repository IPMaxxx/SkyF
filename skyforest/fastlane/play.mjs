#!/usr/bin/env node
// Универсальный клиент Google Play Developer API (androidpublisher v3).
// Запуск: node fastlane/play.mjs <METHOD> <path-после-/androidpublisher/v3> [json-body | @file.json]
// Пример: node fastlane/play.mjs GET "/applications/ai.skyforest.app/subscriptions"
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const sa = JSON.parse(readFileSync(new URL('./play-service-account.json', import.meta.url), 'utf8'));
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const claims = b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${sig}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const [method, path, bodyArg] = process.argv.slice(2);
if (!method || !path) {
  console.error('usage: node play.mjs <METHOD> <path> [json-body | @file.json]');
  process.exit(2);
}
let body;
if (bodyArg) body = bodyArg.startsWith('@') ? readFileSync(bodyArg.slice(1), 'utf8') : bodyArg;

const token = await getAccessToken();
const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3${path}`, {
  method: method.toUpperCase(),
  headers: {
    Authorization: `Bearer ${token}`,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  },
  body,
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
process.exit(res.ok ? 0 : 1);
