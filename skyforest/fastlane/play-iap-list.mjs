#!/usr/bin/env node
// Показать все in-app продукты и их статусы (read-only).
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

const token = await getAccessToken();
// Приложение переведено на новый Play Monetization API — старый
// inappproducts возвращает 403 "migrate to the new publishing API".
const res = await fetch(
  `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/oneTimeProducts?pageSize=100`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const data = await res.json();
if (!res.ok) throw new Error(JSON.stringify(data));
console.log(JSON.stringify(data, null, 2));
