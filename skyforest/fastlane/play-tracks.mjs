#!/usr/bin/env node
// Показать все треки и их релизы (read-only).
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

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
async function api(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const token = await getAccessToken();
const edit = await api(token, 'POST', '/edits', {});
const tracks = await api(token, 'GET', `/edits/${edit.id}/tracks`);
console.log(JSON.stringify(tracks, null, 2));
const bundles = await api(token, 'GET', `/edits/${edit.id}/bundles`);
console.log('bundles:', JSON.stringify(bundles, null, 2));
await api(token, 'DELETE', `/edits/${edit.id}`);
