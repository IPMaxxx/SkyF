#!/usr/bin/env node
// Создание подписок Mushroom Checker / WayBack в Google Play с базовым
// планом (месяц/год) и бесплатным триалом (Checker — 3 дня, WayBack — 7).
//
// Для каждого продукта: pricing:convertRegionPrices (региональные цены из
// USD) → subscriptions.create → basePlans:activate → offers.create
// (фаза FREE, длительность из продукта) → offers:activate. Скрипт
// идемпотентен: существующие продукты/офферы пропускаются, а если цена в
// конфиге разошлась с той, что в консоли, базовый план патчится новой ценой.
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

const priceAmount = (price) =>
  price ? Number(price.units || 0) + Number(price.nanos || 0) / 1e9 : null;

// Региональные цены из USD: массив regionalConfigs + цена для «остальных».
async function convertPrices(pkg, usd) {
  const conv = await api('POST', `/applications/${pkg}/pricing:convertRegionPrices`, { price: usdPrice(usd) });
  if (!conv.ok) return { error: conv };
  return {
    regionalConfigs: Object.values(conv.json.convertedRegionPrices || {}).map((r) => ({
      regionCode: r.regionCode,
      newSubscriberAvailability: true,
      price: r.price,
    })),
    other: conv.json.convertedOtherRegionsPrice || {},
  };
}

const PRODUCTS = [
  {
    pkg: 'ai.skyforest.mushroomchecker',
    productId: 'ai.skyforest.mushroomchecker.sub.monthly',
    basePlanId: 'monthly',
    billingPeriod: 'P1M',
    usd: 2,
    offerId: 'free-trial-3d',
    trialDuration: 'P3D',
    listings: [
      { languageCode: 'en-US', title: 'Premium Monthly', description: 'Unlimited AI mushroom identifications. 3-day free trial.' },
      { languageCode: 'ru-RU', title: 'Премиум (месяц)', description: 'Неограниченные ИИ-определения грибов. 3 дня бесплатно.' },
    ],
  },
  {
    pkg: 'ai.skyforest.mushroomchecker',
    productId: 'ai.skyforest.mushroomchecker.sub.yearly',
    basePlanId: 'yearly',
    billingPeriod: 'P1Y',
    usd: 14.99,
    offerId: 'free-trial-3d',
    trialDuration: 'P3D',
    listings: [
      { languageCode: 'en-US', title: 'Premium Yearly', description: 'Unlimited AI mushroom identifications. 3-day free trial.' },
      { languageCode: 'ru-RU', title: 'Премиум (год)', description: 'Неограниченные ИИ-определения грибов. 3 дня бесплатно.' },
    ],
  },
  {
    pkg: 'ai.skyforest.wayback',
    productId: 'ai.skyforest.wayback.sub.yearly',
    basePlanId: 'yearly',
    billingPeriod: 'P1Y',
    usd: 3.99,
    listings: [
      {
        languageCode: 'en-US',
        title: 'Premium Yearly',
        description: 'Offline areas, satellite imagery and sync across devices. 7-day free trial.',
      },
      {
        languageCode: 'ru-RU',
        title: 'Премиум (год)',
        description: 'Офлайн-области, спутниковые снимки и синхронизация. 7 дней бесплатно.',
      },
    ],
  },
];

// Триал по умолчанию — 7 дней; у продуктов Checker он свой (3 дня).
const DEFAULT_OFFER_ID = 'free-trial-7d';
const DEFAULT_TRIAL_DURATION = 'P7D';

for (const p of PRODUCTS) {
  console.log(`\n=== ${p.productId} ===`);
  const OFFER_ID = p.offerId ?? DEFAULT_OFFER_ID;
  const TRIAL_DURATION = p.trialDuration ?? DEFAULT_TRIAL_DURATION;

  // 0. Уже существует?
  const existing = await api('GET', `/applications/${p.pkg}/subscriptions/${p.productId}`);
  let sub = existing.ok ? existing.json : null;

  if (!sub) {
    // 1. Региональные цены из USD.
    const conv = await convertPrices(p.pkg, p.usd);
    if (conv.error) {
      console.error('convertRegionPrices failed:', conv.error.status, JSON.stringify(conv.error.json).slice(0, 500));
      continue;
    }
    const { regionalConfigs, other } = conv;

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

    // 2b. Догнать консоль до конфига: цена базового плана и листинги.
    // Новая цена применяется к новым подписчикам; уже подписанные остаются на
    // старой, пока их не мигрируют вручную в консоли.
    const bp = sub.basePlans?.find((b) => b.basePlanId === p.basePlanId);
    const currentUsd =
      bp?.regionalConfigs?.find((r) => r.regionCode === 'US')?.price ?? bp?.otherRegionsConfig?.usdPrice;
    const priceStale = bp && priceAmount(currentUsd) !== p.usd;
    const listingsStale = p.listings.some((l) => {
      const cur = (sub.listings || []).find((c) => c.languageCode === l.languageCode);
      return !cur || cur.title !== l.title || cur.description !== l.description;
    });

    if (!priceStale) console.log(`price already ${p.usd} USD`);
    if (priceStale || listingsStale) {
      const masks = [];
      const body = { packageName: p.pkg, productId: p.productId };

      if (priceStale) {
        console.log(`price differs: ${priceAmount(currentUsd)} → ${p.usd} USD, updating`);
        const conv = await convertPrices(p.pkg, p.usd);
        if (conv.error) {
          console.error('convertRegionPrices failed:', conv.error.status, JSON.stringify(conv.error.json).slice(0, 500));
          continue;
        }
        body.basePlans = sub.basePlans.map(({ state, ...rest }) =>
          rest.basePlanId === p.basePlanId
            ? {
                ...rest,
                regionalConfigs: conv.regionalConfigs,
                otherRegionsConfig: {
                  usdPrice: conv.other.usdPrice,
                  eurPrice: conv.other.eurPrice,
                  newSubscriberAvailability: true,
                },
              }
            : rest,
        );
        masks.push('basePlans');
      }

      if (listingsStale) {
        console.log('listings differ, updating');
        body.listings = p.listings;
        masks.push('listings');
      }

      const patched = await api(
        'PATCH',
        `/applications/${p.pkg}/subscriptions/${p.productId}` +
          `?updateMask=${masks.join(',')}&regionsVersion.version=2025%2F03`,
        body,
      );
      if (!patched.ok) {
        console.error('update failed:', patched.status, JSON.stringify(patched.json).slice(0, 800));
        continue;
      }
      sub = patched.json;
      console.log(`updated: ${masks.join(', ')}`);
    } else {
      console.log('listings already up to date');
    }
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

  // 4. Оффер: бесплатный триал для новых подписчиков.
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
          duration: TRIAL_DURATION,
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
