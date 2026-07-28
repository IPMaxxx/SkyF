#!/usr/bin/env node
// Инвентаризация подписок WayBack в обоих сторах (read-only).
// App Store Connect: группы, продукты, состояние, цены (число территорий и
// цена в USA), локализации, вводные офферы, скриншот для ревью, доступность.
// Google Play: продукты, базовые планы, цена в US, офферы, листинги.
//
// У приложения должен быть ровно один активный товар —
// ai.skyforest.wayback.sub.yearly за 3.99 USD с триалом 3 дня.
//
// Запуск из каталога skyforest: node fastlane/wayback-subs-status.mjs
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const APP_ID = '6795223337';
const PKG = 'ai.skyforest.wayback';
const KEY_ID = 'TRS8NZAGX5';
const ISSUER_ID = '31303d35-0acc-4d1a-89d4-872e31f2b28f';
const P8_PATH = new URL('./AuthKey_TRS8NZAGX5.p8', import.meta.url);
const ASC_BASE = 'https://api.appstoreconnect.apple.com';
const PLAY_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

const b64urlStr = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function ascToken() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' };
  const signingInput = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(signingInput);
  const signature = signer.sign({ key: readFileSync(P8_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64urlStr(signature)}`;
}

async function asc(path) {
  const res = await fetch(`${ASC_BASE}${path}`, { headers: { Authorization: `Bearer ${ascToken()}` } });
  return { status: res.status, ok: res.ok, json: await res.json().catch(() => ({})) };
}

/**
 * Все страницы отношения. Нужно именно так: цены и вводные офферы Apple
 * хранит по одной записи на территорию (их 175), и запрос с filter[territory]
 * показал бы «всего 1» — по этому и легко ошибиться, решив, что триал заведён
 * только для США.
 */
async function ascAll(path) {
  let next = `${ASC_BASE}${path}`;
  const data = [];
  const included = [];
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${ascToken()}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: `HTTP ${res.status} ${JSON.stringify(json).slice(0, 200)}`, data, included };
    data.push(...(json.data || []));
    included.push(...(json.included || []));
    next = json.links?.next ?? null;
  }
  return { data, included };
}

async function playToken() {
  const sa = JSON.parse(readFileSync(new URL('./play-service-account.json', import.meta.url), 'utf8'));
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'RS256', typ: 'JWT' });
  const claims = b64({
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

console.log(`===== APP STORE CONNECT (app ${APP_ID}) =====`);
const groups = await asc(`/v1/apps/${APP_ID}/subscriptionGroups?limit=50&include=subscriptions`);
if (!groups.ok) {
  console.log(`  ошибка: HTTP ${groups.status} ${JSON.stringify(groups.json).slice(0, 400)}`);
} else if (!(groups.json.data || []).length) {
  console.log('  групп подписок нет');
}
for (const g of groups.json.data || []) {
  console.log(`\nгруппа "${g.attributes.referenceName}" id=${g.id}`);
  const locs = await asc(`/v1/subscriptionGroups/${g.id}/subscriptionGroupLocalizations?limit=20`);
  for (const l of locs.json.data || []) {
    console.log(`  локаль ${l.attributes.locale}: "${l.attributes.name}" / app "${l.attributes.customAppName}" [${l.attributes.state}]`);
  }
  const subs = await asc(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`);
  for (const s of subs.json.data || []) {
    const a = s.attributes;
    console.log(`\n  продукт ${a.productId} id=${s.id}`);
    console.log(`    имя: ${a.name} | период: ${a.subscriptionPeriod} | состояние: ${a.state}`);

    const prices = await ascAll(
      `/v1/subscriptions/${s.id}/prices?include=territory,subscriptionPricePoint&limit=200`,
    );
    if (prices.error) {
      console.log(`    цены: ошибка ${prices.error}`);
    } else {
      const points = new Map(
        prices.included.filter((i) => i.type === 'subscriptionPricePoints').map((i) => [i.id, i.attributes]),
      );
      const priceIn = (code) => {
        const row = prices.data.find((p) => p.relationships?.territory?.data?.id === code);
        return row ? points.get(row.relationships?.subscriptionPricePoint?.data?.id) : null;
      };
      const usa = priceIn('USA');
      console.log(
        `    цены: территорий ${prices.data.length} | USA ${usa ? `${usa.customerPrice} USD (proceeds ${usa.proceeds})` : 'НЕ ЗАДАНА'}`,
      );
      const spot = ['DEU', 'GBR', 'JPN', 'RUS', 'BLR']
        .map((c) => `${c} ${priceIn(c)?.customerPrice ?? '—'}`)
        .join(', ');
      console.log(`      выборочно: ${spot}`);
    }

    const subLocs = await asc(`/v1/subscriptions/${s.id}/subscriptionLocalizations?limit=20`);
    for (const l of subLocs.json.data || []) {
      console.log(`    локаль ${l.attributes.locale}: "${l.attributes.name}" — "${l.attributes.description}" [${l.attributes.state}]`);
    }

    const offers = await ascAll(`/v1/subscriptions/${s.id}/introductoryOffers?limit=200`);
    if (offers.error) {
      console.log(`    вводные офферы: ошибка ${offers.error}`);
    } else if (!offers.data.length) {
      console.log('    вводных офферов нет');
    } else {
      const kinds = [
        ...new Set(
          offers.data.map((o) => `${o.attributes.offerMode} ${o.attributes.duration} x${o.attributes.numberOfPeriods}`),
        ),
      ];
      const ends = [...new Set(offers.data.map((o) => o.attributes.endDate ?? 'бессрочно'))];
      console.log(`    триал: ${kinds.join(', ')} на территориях: ${offers.data.length}, окончание: ${ends.join(', ')}`);
    }

    // Скриншот подписки обязателен для ревью Apple, загружается только вручную.
    const shot = await asc(`/v1/subscriptions/${s.id}/appStoreReviewScreenshot`);
    const shotAttrs = shot.json.data?.attributes;
    console.log(
      `    review-скриншот: ${shotAttrs ? `${shotAttrs.fileName} [${shotAttrs.assetDeliveryState?.state}]` : 'НЕТ'}`,
    );

    const av = await asc(`/v1/subscriptions/${s.id}/subscriptionAvailability`);
    console.log(
      `    availability: ${av.json.data ? `availableInNewTerritories=${av.json.data.attributes.availableInNewTerritories}` : `нет данных (HTTP ${av.status})`}`,
    );
  }
}

console.log(`\n===== GOOGLE PLAY (${PKG}) =====`);
const token = await playToken();
const res = await fetch(`${PLAY_BASE}/applications/${PKG}/subscriptions?pageSize=50`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
if (!res.ok) {
  console.log(`  ошибка: HTTP ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
} else if (!(data.subscriptions || []).length) {
  console.log('  подписок нет');
}
for (const s of data.subscriptions || []) {
  console.log(`\nпродукт ${s.productId}`);
  for (const bp of s.basePlans || []) {
    const us = (bp.regionalConfigs || []).find((r) => r.regionCode === 'US');
    const price = us?.price ?? bp.otherRegionsConfig?.usdPrice;
    const amount = price ? `${price.currencyCode} ${Number(price.units) + (price.nanos || 0) / 1e9}` : 'н/д';
    console.log(
      `  базовый план ${bp.basePlanId} [${bp.state}] период ${bp.autoRenewingBasePlanType?.billingPeriodDuration ?? '—'} | цена US: ${amount}`,
    );
    const offRes = await fetch(
      `${PLAY_BASE}/applications/${PKG}/subscriptions/${s.productId}/basePlans/${bp.basePlanId}/offers`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const offJson = await offRes.json();
    for (const o of offJson.subscriptionOffers || []) {
      const phases = (o.phases || []).map((p) => `${p.duration}${p.regionalConfigs?.[0]?.free ? ' free' : ''}`).join(', ');
      console.log(`    оффер ${o.offerId} [${o.state}] фазы: ${phases}`);
    }
  }
  for (const l of s.listings || []) {
    console.log(`  листинг ${l.languageCode}: "${l.title}" — "${l.description}"`);
  }
}
