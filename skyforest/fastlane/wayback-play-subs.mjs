#!/usr/bin/env node
// Тарифы WayBack в Google Play: неделя 1.99 USD и год 19.99 USD, триал 3 дня.
//
// Почему отдельный скрипт, а не правка fastlane/play-subs-create.mjs. В том
// списке лежат ещё и товары Mushroom Checker, и лежат они устаревшими: годовой
// там записан за 14.99 USD, тогда как в консоли давно 39.99. Прогон общего
// скрипта ради WayBack откатил бы Checker на прежнюю цену — молча и по всем
// регионам. Товары каждого приложения обязаны заводиться из своего файла, как
// и всё остальное в этом репозитории (см. .cursor/rules/flavors.mdc).
//
// Цена. Google, как и Apple, применяет новую цену к НОВЫМ подписчикам:
// действующие остаются на своей, пока их не мигрируют вручную в консоли (это
// отдельная операция с согласием подписчика). Поэтому поднять годовой с 3.99
// до 19.99 можно прямо здесь и никого этим не задев.
//
// Триал. У обоих тарифов фаза P3D. Область действия оффера — `thisSubscription`,
// как у годового WayBack и у обоих тарифов Checker. Это отличается от App Store,
// где вводное предложение считается по ГРУППЕ и достаётся человеку один раз на
// всё приложение: в Play, взяв три дня на неделе, можно взять ещё три на годе.
// Оставлено сознательно — одинаковое правило на всех офферах аккаунта дороже,
// чем закрытая лазейка в шесть бесплатных дней; переключается сменой scope на
// `anySubscriptionInApp` у обоих офферов сразу.
//
// Скрипт идемпотентен: существующее пропускается, разошедшаяся цена патчится.
// Запуск из каталога skyforest:
//   node fastlane/wayback-play-subs.mjs [--apply]
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const PKG = 'ai.skyforest.wayback';
const BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const REGIONS_VERSION = '2025%2F03';

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
  if (!res.ok) throw new Error(`не получен токен: ${JSON.stringify(data)}`);
  return data.access_token;
}

const token = await getAccessToken();

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
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

const usdPrice = (amount) => ({
  currencyCode: 'USD',
  units: String(Math.trunc(amount)),
  nanos: Math.round((amount - Math.trunc(amount)) * 100) * 10_000_000,
});

const priceAmount = (price) =>
  price ? Number(price.units || 0) + Number(price.nanos || 0) / 1e9 : null;

/** Региональные цены, пересчитанные Google из доллара. */
async function convertPrices(usd) {
  const conv = await api('POST', `/applications/${PKG}/pricing:convertRegionPrices`, {
    price: usdPrice(usd),
  });
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
    productId: 'ai.skyforest.wayback.sub.weekly',
    basePlanId: 'weekly',
    billingPeriod: 'P1W',
    // Льготный период (списание не прошло, доступ пока сохраняется) Google
    // ограничивает длиной расчётного периода: недельному тарифу P30D не
    // положен, максимум — неделя.
    gracePeriod: 'P7D',
    usd: 1.99,
    offerId: 'free-trial-3d',
    trialDuration: 'P3D',
    listings: [
      {
        languageCode: 'en-US',
        title: 'Premium Weekly',
        description: 'Offline areas, satellite imagery and sync across devices. 3-day free trial.',
        benefits: [
          'Way back to your forest entry point',
          'Works with no signal, fully offline',
          'Offline maps: trails and satellite',
          'History of every walk, synced',
        ],
      },
      {
        languageCode: 'ru-RU',
        title: 'Премиум (неделя)',
        description: 'Офлайн-области, спутниковые снимки и синхронизация. 3 дня бесплатно.',
        benefits: [
          'Дорога назад к точке входа в лес',
          'Работает без сети и без сигнала',
          'Офлайн-карты: тропы и спутник',
          'История прогулок с синхронизацией',
        ],
      },
    ],
  },
  {
    productId: 'ai.skyforest.wayback.sub.yearly',
    basePlanId: 'yearly',
    billingPeriod: 'P1Y',
    gracePeriod: 'P30D',
    usd: 19.99,
    // Имя оффера осталось с «7d» с тех пор, когда триал был недельным: Play не
    // умеет переименовывать офферы, а второй оффер рядом с активным — это два
    // предложения на одном базовом плане и лотерея, какое достанется
    // покупателю. Человеку идентификатор не виден, длительность фазы — P3D.
    offerId: 'free-trial-7d',
    trialDuration: 'P3D',
    listings: [
      {
        languageCode: 'en-US',
        title: 'Premium Yearly',
        description: 'Offline areas, satellite imagery and sync across devices. 3-day free trial.',
        benefits: [
          'Way back to your forest entry point',
          'Works with no signal, fully offline',
          'Offline maps: trails and satellite',
          'History of every walk, synced',
        ],
      },
      {
        languageCode: 'ru-RU',
        title: 'Премиум (год)',
        description: 'Офлайн-области, спутниковые снимки и синхронизация. 3 дня бесплатно.',
        benefits: [
          'Дорога назад к точке входа в лес',
          'Работает без сети и без сигнала',
          'Офлайн-карты: тропы и спутник',
          'История прогулок с синхронизацией',
        ],
      },
    ],
  },
];

const say = (line) => console.log(`  ${line}`);
const fail = (step, res) =>
  console.error(`  ОШИБКА ${step}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 600)}`);

for (const p of PRODUCTS) {
  console.log(`\n=== ${p.productId} (${p.usd} USD / ${p.billingPeriod}) ===${APPLY ? '' : '  сухой прогон'}`);

  const existing = await api('GET', `/applications/${PKG}/subscriptions/${p.productId}`);
  let sub = existing.ok ? existing.json : null;

  if (!sub) {
    say('товара нет — будет создан вместе с базовым планом');
    if (!APPLY) continue;
    const conv = await convertPrices(p.usd);
    if (conv.error) {
      fail('пересчёт региональных цен', conv.error);
      continue;
    }
    const created = await api(
      'POST',
      `/applications/${PKG}/subscriptions?productId=${encodeURIComponent(p.productId)}&regionsVersion.version=${REGIONS_VERSION}`,
      {
        productId: p.productId,
        listings: p.listings,
        taxAndComplianceSettings: { eeaWithdrawalRightType: 'WITHDRAWAL_RIGHT_SERVICE' },
        basePlans: [
          {
            basePlanId: p.basePlanId,
            autoRenewingBasePlanType: {
              billingPeriodDuration: p.billingPeriod,
              gracePeriodDuration: p.gracePeriod,
              resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
              prorationMode: 'SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE',
              legacyCompatible: false,
            },
            regionalConfigs: conv.regionalConfigs,
            otherRegionsConfig: {
              usdPrice: conv.other.usdPrice,
              eurPrice: conv.other.eurPrice,
              newSubscriberAvailability: true,
            },
          },
        ],
      },
    );
    if (!created.ok) {
      fail('создание товара', created);
      continue;
    }
    sub = created.json;
    say('товар создан');
  } else {
    const bp = sub.basePlans?.find((b) => b.basePlanId === p.basePlanId);
    const currentUsd =
      bp?.regionalConfigs?.find((r) => r.regionCode === 'US')?.price ?? bp?.otherRegionsConfig?.usdPrice;
    const priceStale = bp && priceAmount(currentUsd) !== p.usd;
    const listingsStale = p.listings.some((l) => {
      const cur = (sub.listings || []).find((c) => c.languageCode === l.languageCode);
      return (
        !cur ||
        cur.title !== l.title ||
        cur.description !== l.description ||
        (cur.benefits || []).join('|') !== (l.benefits || []).join('|')
      );
    });

    say(
      `товар есть; цена ${priceAmount(currentUsd)} USD${priceStale ? ` → ${p.usd} USD` : ' (совпадает)'}` +
        `; витрины ${listingsStale ? 'требуют правки' : 'актуальны'}`,
    );

    if ((priceStale || listingsStale) && APPLY) {
      const masks = [];
      const body = { packageName: PKG, productId: p.productId };
      if (priceStale) {
        const conv = await convertPrices(p.usd);
        if (conv.error) {
          fail('пересчёт региональных цен', conv.error);
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
        body.listings = p.listings;
        masks.push('listings');
      }
      const patched = await api(
        'PATCH',
        `/applications/${PKG}/subscriptions/${p.productId}?updateMask=${masks.join(',')}&regionsVersion.version=${REGIONS_VERSION}`,
        body,
      );
      if (!patched.ok) {
        fail('обновление товара', patched);
        continue;
      }
      sub = patched.json;
      say(`обновлено: ${masks.join(', ')}`);
    }
  }

  if (!APPLY) continue;

  // Базовый план: без активации товар не продаётся вовсе.
  const bpState = sub.basePlans?.find((b) => b.basePlanId === p.basePlanId)?.state;
  if (bpState !== 'ACTIVE') {
    const act = await api(
      'POST',
      `/applications/${PKG}/subscriptions/${p.productId}/basePlans/${p.basePlanId}:activate`,
      {},
    );
    if (!act.ok) {
      fail('активация базового плана', act);
      continue;
    }
    say('базовый план активирован');
  } else {
    say('базовый план уже активен');
  }

  // Оффер с бесплатной фазой.
  const offers = await api(
    'GET',
    `/applications/${PKG}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers`,
  );
  let offer = (offers.json.subscriptionOffers || []).find((o) => o.offerId === p.offerId);
  if (!offer) {
    const cur = await api('GET', `/applications/${PKG}/subscriptions/${p.productId}`);
    const bp = cur.json.basePlans.find((b) => b.basePlanId === p.basePlanId);
    const createdOffer = await api(
      'POST',
      `/applications/${PKG}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers?offerId=${p.offerId}&regionsVersion.version=${REGIONS_VERSION}`,
      {
        packageName: PKG,
        productId: p.productId,
        basePlanId: p.basePlanId,
        offerId: p.offerId,
        // Регионы оффера обязаны покрывать регионы базового плана.
        regionalConfigs: bp.regionalConfigs.map((r) => ({
          regionCode: r.regionCode,
          newSubscriberAvailability: true,
        })),
        otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
        phases: [
          {
            recurrenceCount: 1,
            duration: p.trialDuration,
            regionalConfigs: bp.regionalConfigs.map((r) => ({ regionCode: r.regionCode, free: {} })),
            otherRegionsConfig: { free: {} },
          },
        ],
        targeting: { acquisitionRule: { scope: { thisSubscription: {} } } },
      },
    );
    if (!createdOffer.ok) {
      fail('создание оффера', createdOffer);
      continue;
    }
    offer = createdOffer.json;
    say(`оффер ${p.offerId} создан (${p.trialDuration} бесплатно)`);
  } else {
    say(`оффер ${p.offerId} уже есть`);
  }

  if (offer.state !== 'ACTIVE') {
    const actOffer = await api(
      'POST',
      `/applications/${PKG}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers/${p.offerId}:activate`,
      {},
    );
    if (!actOffer.ok) fail('активация оффера', actOffer);
    else say('оффер активирован');
  } else {
    say('оффер уже активен');
  }
}

console.log('\nГотово.');
