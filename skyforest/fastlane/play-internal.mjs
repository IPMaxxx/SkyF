#!/usr/bin/env node
// Inspect/promote the internal track release via Google Play Developer API.
// Usage: node play-internal.mjs status | complete <versionCode>
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = 'ai.skyforest.app';
const sa = JSON.parse(readFileSync(new URL('./play-service-account.json', import.meta.url), 'utf8'));

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const claims = b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.private_key).toString('base64url');
  const jwt = `${header}.${claims}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;

async function api(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const action = process.argv[2] || 'status';
const token = await getAccessToken();

const edit = await api(token, 'POST', '/edits', {});
console.log(`edit id: ${edit.id}`);

const track = await api(token, 'GET', `/edits/${edit.id}/tracks/internal`);
console.log('internal track (before):');
console.log(JSON.stringify(track, null, 2));

if (action === 'complete') {
  const versionCode = process.argv[3];
  if (!versionCode) throw new Error('usage: play-internal.mjs complete <versionCode>');
  const updated = await api(token, 'PUT', `/edits/${edit.id}/tracks/internal`, {
    track: 'internal',
    releases: [{ status: 'completed', versionCodes: [versionCode] }],
  });
  console.log('track after update (pre-commit):');
  console.log(JSON.stringify(updated, null, 2));
  const committed = await api(token, 'POST', `/edits/${edit.id}:commit`, undefined);
  console.log('commit result:', JSON.stringify(committed));
} else {
  // read-only: try testers endpoint too, then delete the edit
  try {
    const testers = await api(token, 'GET', `/edits/${edit.id}/testers/internal`);
    console.log('testers (internal):', JSON.stringify(testers, null, 2));
  } catch (e) {
    console.log('testers (internal) not readable:', e.message);
  }
  await api(token, 'DELETE', `/edits/${edit.id}`);
  console.log('edit deleted (read-only run)');
}
