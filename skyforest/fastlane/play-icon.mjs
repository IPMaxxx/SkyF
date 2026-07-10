#!/usr/bin/env node
// Обновить иконку store listing в Google Play (512x512 PNG).
// Использование: node play-icon.mjs <путь-к-png>          — показать текущие иконки
//                node play-icon.mjs <путь-к-png> --apply  — загрузить и закоммитить
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

async function uploadIcon(token, editId, lang, pngBuffer) {
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}/edits/${editId}/listings/${lang}/icon`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
    body: pngBuffer,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`upload icon ${lang} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const [pngPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const apply = process.argv.includes('--apply');
if (!pngPath) { console.error('usage: node play-icon.mjs <icon-512.png> [--apply]'); process.exit(1); }
const png = readFileSync(pngPath);

const token = await getAccessToken();
const edit = await api(token, 'POST', '/edits', {});
try {
  const listings = await api(token, 'GET', `/edits/${edit.id}/listings`);
  const langs = (listings.listings || []).map((l) => l.language);
  console.log('listing languages:', langs.join(', ') || '(none)');
  for (const lang of langs) {
    const imgs = await api(token, 'GET', `/edits/${edit.id}/listings/${lang}/icon`);
    console.log(`${lang} current icon:`, JSON.stringify(imgs.images || []));
  }
  if (apply) {
    for (const lang of langs) {
      await api(token, 'DELETE', `/edits/${edit.id}/listings/${lang}/icon`);
      const up = await uploadIcon(token, edit.id, lang, png);
      console.log(`uploaded icon for ${lang}:`, JSON.stringify(up.image || up));
    }
    const committed = await api(token, 'POST', `/edits/${edit.id}:commit`, {});
    console.log('COMMITTED:', JSON.stringify(committed));
  } else {
    await api(token, 'DELETE', `/edits/${edit.id}`);
    console.log('(dry run — запустите с --apply для загрузки)');
  }
} catch (e) {
  try { await api(token, 'DELETE', `/edits/${edit.id}`); } catch {}
  throw e;
}
