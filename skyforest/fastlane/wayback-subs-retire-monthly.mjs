#!/usr/bin/env node
// Снятие с продажи месячной подписки WayBack: у приложения один тариф —
// годовой (ai.skyforest.wayback.sub.yearly), месячный продукт остался от
// прежней модели монетизации и в приложении больше не запрашивается.
//
// Деактивация обратима (базовый план можно снова активировать), поэтому
// делается через API. Сам продукт НЕ удаляется: удаление подписок в сторах
// необратимо, это ручное решение владельца аккаунта.
//
// Запуск из каталога skyforest: node fastlane/wayback-subs-retire-monthly.mjs
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = 'ai.skyforest.wayback';
const PRODUCT = 'ai.skyforest.wayback.sub.monthly';

const sa = JSON.parse(
  readFileSync(new URL('./play-service-account.json', import.meta.url), 'utf8'),
);
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

const token = await getAccessToken();
const BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

const cur = await api('GET', `/applications/${PKG}/subscriptions/${PRODUCT}`);
if (!cur.ok) {
  console.log(`${PRODUCT}: продукта нет (${cur.status}) — снимать нечего`);
  process.exit(0);
}

for (const bp of cur.json.basePlans ?? []) {
  console.log(`\n=== базовый план ${bp.basePlanId} [${bp.state}] ===`);

  // Офферы деактивируются первыми: активный оффер держит базовый план.
  const offers = await api(
    'GET',
    `/applications/${PKG}/subscriptions/${PRODUCT}/basePlans/${bp.basePlanId}/offers`,
  );
  for (const o of offers.json.subscriptionOffers ?? []) {
    if (o.state !== 'ACTIVE') {
      console.log(`  оффер ${o.offerId}: уже ${o.state}`);
      continue;
    }
    const r = await api(
      'POST',
      `/applications/${PKG}/subscriptions/${PRODUCT}/basePlans/${bp.basePlanId}/offers/${o.offerId}:deactivate`,
      {},
    );
    console.log(
      `  оффер ${o.offerId}: ${r.ok ? 'деактивирован' : `ОШИБКА ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`}`,
    );
  }

  if (bp.state !== 'ACTIVE') {
    console.log(`  базовый план: уже ${bp.state}`);
    continue;
  }
  const r = await api(
    'POST',
    `/applications/${PKG}/subscriptions/${PRODUCT}/basePlans/${bp.basePlanId}:deactivate`,
    {},
  );
  console.log(
    `  базовый план: ${r.ok ? 'деактивирован' : `ОШИБКА ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`}`,
  );
}

// Итоговое состояние обоих продуктов приложения.
const all = await api('GET', `/applications/${PKG}/subscriptions?pageSize=20`);
console.log('\n=== состояние подписок WayBack в Google Play ===');
for (const s of all.json.subscriptions ?? []) {
  for (const bp of s.basePlans ?? []) {
    const us = (bp.regionalConfigs ?? []).find((c) => c.regionCode === 'US')?.price;
    const price = us
      ? `${us.units || 0}.${String(Math.round((us.nanos || 0) / 1e7)).padStart(2, '0')} ${us.currencyCode}`
      : '—';
    console.log(`  ${s.productId} / ${bp.basePlanId} [${bp.state}] ${bp.autoRenewingBasePlanType?.billingPeriodDuration ?? '?'} US=${price}`);
  }
}
