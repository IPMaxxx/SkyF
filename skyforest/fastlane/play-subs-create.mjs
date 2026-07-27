#!/usr/bin/env node
// Создание подписок Mushroom Checker / WayBack в Google Play с базовым
// планом (месяц/год) и бесплатным триалом 7 дней.
//
// Для каждого продукта: pricing:convertRegionPrices (региональные цены из
// USD) → subscriptions.create → basePlans:activate → offers.create
// (фаза FREE P7D) → offers:activate. Скрипт идемпотентен: существующие
// продукты/офферы пропускаются.
//
// Запуск: node fastlane/play-subs-create.mjs
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

function usdPrice(amount) {
  const units = Math.trunc(amount);
  const nanos = Math.round((amount - units) * 100) * 10_000_000;
  return { currencyCode: 'USD', units: String(units), nanos };
}

const PRODUCTS = [
  {
    pkg: 'ai.skyforest.mushroomchecker',
    productId: 'ai.skyforest.mushroomchecker.sub.monthly',
    basePlanId: 'monthly',
    billingPeriod: 'P1M',
    usd: 4.99,
    listings: [
      { languageCode: 'en-US', title: 'Premium Monthly', description: '25 AI mushroom identifications per month with confidence scores.' },
      { languageCode: 'ru-RU', title: 'Премиум (месяц)', description: '25 ИИ-определений грибов в месяц с процентами уверенности.' },
    ],
  },
  {
    pkg: 'ai.skyforest.mushroomchecker',
    productId: 'ai.skyforest.mushroomchecker.sub.yearly',
    basePlanId: 'yearly',
    billingPeriod: 'P1Y',
    usd: 29.99,
    listings: [
      { languageCode: 'en-US', title: 'Premium Yearly', description: '25 AI mushroom identifications per month with confidence scores.' },
      { languageCode: 'ru-RU', title: 'Премиум (год)', description: '25 ИИ-определений грибов в месяц с процентами уверенности.' },
    ],
  },
  {
    pkg: 'ai.skyforest.wayback',
    productId: 'ai.skyforest.wayback.sub.monthly',
    basePlanId: 'monthly',
    billingPeriod: 'P1M',
    usd: 2.99,
    listings: [
      { languageCode: 'en-US', title: 'Premium Monthly', description: 'Offline maps, region downloads and way back to your entry point.' },
      { languageCode: 'ru-RU', title: 'Премиум (месяц)', description: 'Офлайн-карты, скачивание регионов и возврат к точке входа.' },
    ],
  },
  {
    pkg: 'ai.skyforest.wayback',
    productId: 'ai.skyforest.wayback.sub.yearly',
    basePlanId: 'yearly',
    billingPeriod: 'P1Y',
    usd: 19.99,
    listings: [
      { languageCode: 'en-US', title: 'Premium Yearly', description: 'Offline maps, region downloads and way back to your entry point.' },
      { languageCode: 'ru-RU', title: 'Премиум (год)', description: 'Офлайн-карты, скачивание регионов и возврат к точке входа.' },
    ],
  },
];

const OFFER_ID = 'free-trial-7d';

for (const p of PRODUCTS) {
  console.log(`\n=== ${p.productId} ===`);

  // 0. Уже существует?
  const existing = await api('GET', `/applications/${p.pkg}/subscriptions/${p.productId}`);
  let sub = existing.ok ? existing.json : null;

  if (!sub) {
    // 1. Региональные цены из USD.
    const conv = await api('POST', `/applications/${p.pkg}/pricing:convertRegionPrices`, {
      price: usdPrice(p.usd),
    });
    if (!conv.ok) {
      console.error('convertRegionPrices failed:', conv.status, JSON.stringify(conv.json).slice(0, 500));
      continue;
    }
    const regionalConfigs = Object.values(conv.json.convertedRegionPrices || {}).map((r) => ({
      regionCode: r.regionCode,
      newSubscriberAvailability: true,
      price: r.price,
    }));
    const other = conv.json.convertedOtherRegionsPrice || {};

    // 2. Создать подписку с базовым планом.
    const createBody = {
      productId: p.productId,
      listings: p.listings,
      taxAndComplianceSettings: { eeaWithdrawalRightType: 'WITHDRAWAL_RIGHT_SERVICE' },
      basePlans: [
        {
          basePlanId: p.basePlanId,
          autoRenewingBasePlanType: {
            billingPeriodDuration: p.billingPeriod,
            gracePeriodDuration: 'P30D',
            resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
            prorationMode: 'SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE',
            legacyCompatible: false,
          },
          regionalConfigs,
          otherRegionsConfig: {
            usdPrice: other.usdPrice,
            eurPrice: other.eurPrice,
            newSubscriberAvailability: true,
          },
        },
      ],
    };
    const created = await api(
      'POST',
      `/applications/${p.pkg}/subscriptions?productId=${encodeURIComponent(p.productId)}&regionsVersion.version=2025%2F03`,
      createBody,
    );
    if (!created.ok) {
      console.error('create failed:', created.status, JSON.stringify(created.json).slice(0, 800));
      continue;
    }
    sub = created.json;
    console.log('created subscription');
  } else {
    console.log('subscription already exists');
  }

  // 3. Активировать базовый план.
  const bpState = sub.basePlans?.find((b) => b.basePlanId === p.basePlanId)?.state;
  if (bpState !== 'ACTIVE') {
    const act = await api(
      'POST',
      `/applications/${p.pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}:activate`,
      {},
    );
    console.log(act.ok ? 'base plan activated' : `base plan activate failed: ${act.status} ${JSON.stringify(act.json).slice(0, 400)}`);
    if (!act.ok) continue;
  } else {
    console.log('base plan already active');
  }

  // 4. Оффер: бесплатный триал 7 дней для новых подписчиков.
  const offers = await api('GET', `/applications/${p.pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers`);
  let offer = (offers.json.subscriptionOffers || []).find((o) => o.offerId === OFFER_ID);
  if (!offer) {
    // Регионы оффера должны покрывать регионы базового плана.
    const cur = await api('GET', `/applications/${p.pkg}/subscriptions/${p.productId}`);
    const bp = cur.json.basePlans.find((b) => b.basePlanId === p.basePlanId);
    const offerBody = {
      packageName: p.pkg,
      productId: p.productId,
      basePlanId: p.basePlanId,
      offerId: OFFER_ID,
      // Доступность оффера по регионам (тем же, что у базового плана).
      regionalConfigs: bp.regionalConfigs.map((r) => ({
        regionCode: r.regionCode,
        newSubscriberAvailability: true,
      })),
      otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
      phases: [
        {
          recurrenceCount: 1,
          duration: 'P7D',
          regionalConfigs: bp.regionalConfigs.map((r) => ({ regionCode: r.regionCode, free: {} })),
          otherRegionsConfig: { free: {} },
        },
      ],
      targeting: { acquisitionRule: { scope: { thisSubscription: {} } } },
    };
    const createdOffer = await api(
      'POST',
      `/applications/${p.pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers?offerId=${OFFER_ID}&regionsVersion.version=2025%2F03`,
      offerBody,
    );
    if (!createdOffer.ok) {
      console.error('offer create failed:', createdOffer.status, JSON.stringify(createdOffer.json).slice(0, 800));
      continue;
    }
    offer = createdOffer.json;
    console.log('offer created');
  } else {
    console.log('offer already exists');
  }

  if (offer.state !== 'ACTIVE') {
    const actOffer = await api(
      'POST',
      `/applications/${p.pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers/${OFFER_ID}:activate`,
      {},
    );
    console.log(actOffer.ok ? 'offer activated' : `offer activate failed: ${actOffer.status} ${JSON.stringify(actOffer.json).slice(0, 400)}`);
  } else {
    console.log('offer already active');
  }
}

console.log('\nDone.');
