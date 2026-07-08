#!/usr/bin/env node
// Залить AAB и выпустить релиз в указанный трек Google Play одним edit'ом.
// Usage: node play-release.mjs <track> [--upload] [--versionCode N] [--status completed|draft]
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = 'ai.skyforest.app';
const AAB = new URL('../android/app/build/outputs/bundle/release/app-release.aab', import.meta.url);
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
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD_BASE = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;

async function api(token, method, path, body, base = BASE, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const args = process.argv.slice(2);
const tracks = args[0]?.split(',');
if (!tracks?.length) throw new Error('usage: play-release.mjs <track[,track2]> [--upload] [--versionCode N] [--status completed]');
const doUpload = args.includes('--upload');
const vcIdx = args.indexOf('--versionCode');
const versionCode = vcIdx >= 0 ? Number(args[vcIdx + 1]) : null;
const stIdx = args.indexOf('--status');
const status = stIdx >= 0 ? args[stIdx + 1] : 'completed';

const token = await getAccessToken();
const edit = await api(token, 'POST', '/edits', '{}', BASE, { 'Content-Type': 'application/json' });
console.log(`edit id: ${edit.id}`);

let vc = versionCode;
if (doUpload) {
  const aab = readFileSync(AAB);
  console.log(`uploading AAB (${(aab.length / 1e6).toFixed(1)} MB)...`);
  const bundle = await api(
    token, 'POST', `/edits/${edit.id}/bundles?uploadType=media`, aab,
    UPLOAD_BASE, { 'Content-Type': 'application/octet-stream' },
  );
  console.log('uploaded bundle:', JSON.stringify(bundle));
  vc = bundle.versionCode;
}
if (!vc) throw new Error('versionCode unknown: pass --versionCode or --upload');

for (const track of tracks) {
  const updated = await api(token, 'PUT', `/edits/${edit.id}/tracks/${track}`, JSON.stringify({
    track,
    releases: [{ status, versionCodes: [String(vc)] }],
  }), BASE, { 'Content-Type': 'application/json' });
  console.log(`track ${track} (pre-commit):`, JSON.stringify(updated, null, 2));
}

const committed = await api(token, 'POST', `/edits/${edit.id}:commit`, undefined);
console.log('commit result:', JSON.stringify(committed));
