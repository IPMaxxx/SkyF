#!/usr/bin/env node
// Годовая подписка WayBack в App Store Connect: группа → продукт →
// локализации → цена 3.99 USD (USA, остальные территории Apple считает сама)
// → бесплатный триал 3 дня.
//
// Скрипт идемпотентен: существующие сущности не пересоздаются, цена и оффер
// ставятся только если фактическое значение отличается от целевого.
//
// Длительность триала правит fastlane/wayback-trial-3d.mjs: `duration` у
// готового оффера иммутабельна, и сменить её можно только удалив записи.
//
// Запуск из каталога skyforest: node fastlane/wayback-subs-create.mjs
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const KEY_ID = 'TRS8NZAGX5';
const ISSUER_ID = '31303d35-0acc-4d1a-89d4-872e31f2b28f';
const P8_PATH = new URL('./AuthKey_TRS8NZAGX5.p8', import.meta.url);
const BASE = 'https://api.appstoreconnect.apple.com';

const APP_ID = '6795223337'; // ai.skyforest.wayback
const GROUP_REFERENCE_NAME = 'Premium';
const PRODUCT_ID = 'ai.skyforest.wayback.sub.yearly';
const TARGET_USD = '3.99';
const PRICE_TERRITORY = 'USA';

const GROUP_LOCALIZATIONS = [
  { locale: 'en-US', name: 'Premium', customAppName: 'WayBack' },
  { locale: 'ru', name: 'Премиум', customAppName: 'WayBack' },
];

const SUB_LOCALIZATIONS = [
  {
    locale: 'en-US',
    // ASC ограничивает описание 55 символами.
    name: 'Premium Yearly',
    description: 'Offline areas, satellite imagery and device sync',
  },
  {
    locale: 'ru',
    name: 'Премиум (год)',
    description: 'Офлайн-области, спутниковые снимки и синхронизация',
  },
];

const REVIEW_NOTE =
  'Unlocks offline area downloads, satellite imagery and cross-device sync. 3-day free trial, then yearly billing.';

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeToken() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(signingInput);
  const signature = signer.sign({ key: readFileSync(P8_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(signature)}`;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${makeToken()}`,
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

function fail(step, res) {
  console.error(`  ОШИБКА ${step}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 900)}`);
}

// 1. Группа подписок.
console.log('=== subscription group ===');
const groups = await api('GET', `/v1/apps/${APP_ID}/subscriptionGroups?limit=50`);
if (!groups.ok) {
  fail('получение групп', groups);
  process.exit(1);
}
let group = (groups.json.data || []).find((g) => g.attributes.referenceName === GROUP_REFERENCE_NAME);
if (!group) {
  const created = await api('POST', '/v1/subscriptionGroups', {
    data: {
      type: 'subscriptionGroups',
      attributes: { referenceName: GROUP_REFERENCE_NAME },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  if (!created.ok) {
    fail('создание группы', created);
    process.exit(1);
  }
  group = created.json.data;
  console.log(`  создана группа "${GROUP_REFERENCE_NAME}" id=${group.id}`);
} else {
  console.log(`  группа "${GROUP_REFERENCE_NAME}" уже есть, id=${group.id}`);
}

// 2. Локализации группы.
const groupLocs = await api('GET', `/v1/subscriptionGroups/${group.id}/subscriptionGroupLocalizations?limit=50`);
for (const loc of GROUP_LOCALIZATIONS) {
  const has = (groupLocs.json.data || []).some((l) => l.attributes.locale === loc.locale);
  if (has) {
    console.log(`  локализация группы ${loc.locale} уже есть`);
    continue;
  }
  const res = await api('POST', '/v1/subscriptionGroupLocalizations', {
    data: {
      type: 'subscriptionGroupLocalizations',
      attributes: { name: loc.name, customAppName: loc.customAppName, locale: loc.locale },
      relationships: { subscriptionGroup: { data: { type: 'subscriptionGroups', id: group.id } } },
    },
  });
  console.log(res.ok ? `  добавлена локализация группы ${loc.locale}` : '');
  if (!res.ok) fail(`локализация группы ${loc.locale}`, res);
}

// 3. Подписка.
console.log('\n=== subscription ===');
const subs = await api('GET', `/v1/subscriptionGroups/${group.id}/subscriptions?limit=50`);
let sub = (subs.json.data || []).find((s) => s.attributes.productId === PRODUCT_ID);
if (!sub) {
  const created = await api('POST', '/v1/subscriptions', {
    data: {
      type: 'subscriptions',
      attributes: {
        name: 'Premium Yearly',
        productId: PRODUCT_ID,
        subscriptionPeriod: 'ONE_YEAR',
        familySharable: false,
        groupLevel: 1,
        reviewNote: REVIEW_NOTE,
      },
      relationships: { group: { data: { type: 'subscriptionGroups', id: group.id } } },
    },
  });
  if (!created.ok) {
    fail('создание подписки', created);
    process.exit(1);
  }
  sub = created.json.data;
  console.log(`  создана подписка ${PRODUCT_ID} id=${sub.id}`);
} else {
  const a = sub.attributes;
  console.log(`  подписка ${PRODUCT_ID} уже есть, id=${sub.id} [${a.state}] период=${a.subscriptionPeriod}`);
  if (a.subscriptionPeriod !== 'ONE_YEAR') {
    console.error(`  ВНИМАНИЕ: период ${a.subscriptionPeriod}, ожидался ONE_YEAR`);
  }
}

// 4. Локализации подписки.
const subLocs = await api('GET', `/v1/subscriptions/${sub.id}/subscriptionLocalizations?limit=50`);
for (const loc of SUB_LOCALIZATIONS) {
  const existing = (subLocs.json.data || []).find((l) => l.attributes.locale === loc.locale);
  if (existing) {
    const a = existing.attributes;
    if (a.name === loc.name && a.description === loc.description) {
      console.log(`  локализация ${loc.locale} уже актуальна`);
      continue;
    }
    const res = await api('PATCH', `/v1/subscriptionLocalizations/${existing.id}`, {
      data: {
        type: 'subscriptionLocalizations',
        id: existing.id,
        attributes: { name: loc.name, description: loc.description },
      },
    });
    if (res.ok) console.log(`  обновлена локализация ${loc.locale}: "${loc.name}" — "${loc.description}"`);
    else fail(`обновление локализации ${loc.locale}`, res);
    continue;
  }
  const res = await api('POST', '/v1/subscriptionLocalizations', {
    data: {
      type: 'subscriptionLocalizations',
      attributes: { name: loc.name, description: loc.description, locale: loc.locale },
      relationships: { subscription: { data: { type: 'subscriptions', id: sub.id } } },
    },
  });
  if (res.ok) console.log(`  добавлена локализация ${loc.locale}`);
  else fail(`локализация ${loc.locale}`, res);
}

// 5. Цена. Базовая точка — ровно TARGET_USD в USA; остальные территории
// берём из её equalizations (рекомендованные Apple эквиваленты). Территории,
// у которых цена уже была выставлена раньше, сами не пересчитываются, поэтому
// проставляем их явно.
console.log('\n=== price ===');

async function setPrice(pricePointId, territoryId) {
  return api('POST', '/v1/subscriptionPrices', {
    data: {
      type: 'subscriptionPrices',
      attributes: { preserveCurrentPrice: false },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: sub.id } },
        subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pricePointId } },
        territory: { data: { type: 'territories', id: territoryId } },
      },
    },
  });
}

// Текущие цены по всем территориям: территория → id ценовой точки.
async function currentPricePoints() {
  const map = new Map();
  let cursor = null;
  for (let page = 0; page < 10; page += 1) {
    const res = await api(
      'GET',
      // Оба include обязательны: ASC отдаёт только перечисленные связи.
      `/v1/subscriptions/${sub.id}/prices?include=territory,subscriptionPricePoint&limit=200` +
        (cursor ? `&cursor=${cursor}` : ''),
    );
    if (!res.ok) {
      fail('получение текущих цен', res);
      break;
    }
    for (const p of res.json.data || []) {
      map.set(p.relationships?.territory?.data?.id, p.relationships?.subscriptionPricePoint?.data?.id);
    }
    cursor = res.json.meta?.paging?.nextCursor;
    if (!cursor) break;
  }
  return map;
}

// Ищем точку TARGET_USD в USA — список постраничный, идём по курсорам.
let basePoint = null;
let cursor = null;
for (let page = 0; page < 20 && !basePoint; page += 1) {
  const res = await api(
    'GET',
    `/v1/subscriptions/${sub.id}/pricePoints?filter[territory]=${PRICE_TERRITORY}&limit=200` +
      (cursor ? `&cursor=${cursor}` : ''),
  );
  if (!res.ok) {
    fail('получение pricePoints', res);
    break;
  }
  basePoint = (res.json.data || []).find((p) => p.attributes.customerPrice === TARGET_USD);
  cursor = res.json.meta?.paging?.nextCursor;
  if (!cursor) break;
}

if (!basePoint) {
  console.error(`  ОШИБКА: ценовая точка ${TARGET_USD} USD для ${PRICE_TERRITORY} не найдена`);
} else {
  console.log(
    `  базовая точка ${PRICE_TERRITORY}: id=${basePoint.id} customerPrice=${basePoint.attributes.customerPrice} ` +
      `proceeds=${basePoint.attributes.proceeds}`,
  );

  // Эквиваленты Apple для остальных территорий.
  const targets = [{ pricePointId: basePoint.id, territoryId: PRICE_TERRITORY }];
  let eqCursor = null;
  for (let page = 0; page < 10; page += 1) {
    const res = await api(
      'GET',
      // Без include=territory Apple не отдаёт связь с территорией.
      `/v1/subscriptionPricePoints/${basePoint.id}/equalizations?include=territory&limit=200` +
        (eqCursor ? `&cursor=${eqCursor}` : ''),
    );
    if (!res.ok) {
      fail('получение equalizations', res);
      break;
    }
    for (const p of res.json.data || []) {
      const territoryId = p.relationships?.territory?.data?.id;
      if (territoryId) targets.push({ pricePointId: p.id, territoryId });
    }
    eqCursor = res.json.meta?.paging?.nextCursor;
    if (!eqCursor) break;
  }

  const current = await currentPricePoints();
  const stale = targets.filter((t) => current.get(t.territoryId) !== t.pricePointId);
  console.log(`  территорий всего: ${targets.length}, требуют обновления: ${stale.length}`);

  let done = 0;
  const failures = [];
  const queue = [...stale];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const res = await setPrice(item.pricePointId, item.territoryId);
        if (res.ok) done += 1;
        else failures.push({ territory: item.territoryId, status: res.status, body: JSON.stringify(res.json).slice(0, 300) });
      }
    }),
  );
  if (stale.length) console.log(`  обновлено территорий: ${done}`);
  else console.log(`  цены уже соответствуют ${TARGET_USD} USD`);
  for (const f of failures) console.error(`  ОШИБКА цены ${f.territory}: HTTP ${f.status} ${f.body}`);
}

// 6. Бесплатный триал 3 дня — здесь только отчёт о состоянии.
//
// Заводит и меняет оффер отдельный скрипт wayback-trial-3d.mjs, и вот почему
// не тут: Apple требует relationships.territory при создании (то есть запись на
// каждую из 175 территорий) и запрещает менять `duration` у готовой записи —
// её приходится удалять. Держать этот обход в двух скриптах — верный способ им
// разойтись. Перечисляем постранично и БЕЗ filter[territory]: с фильтром в
// ответе одна запись, и легко решить, что триал заведён только для США.
console.log('\n=== introductory offer ===');
const introOffers = [];
let offerCursor = null;
for (let page = 0; page < 10; page += 1) {
  const res = await api(
    'GET',
    `/v1/subscriptions/${sub.id}/introductoryOffers?limit=200` +
      (offerCursor ? `&cursor=${offerCursor}` : ''),
  );
  if (!res.ok) {
    fail('получение вводных офферов', res);
    break;
  }
  introOffers.push(...(res.json.data || []));
  offerCursor = res.json.meta?.paging?.nextCursor;
  if (!offerCursor) break;
}
if (!introOffers.length) {
  console.log('  триала нет — запустите node fastlane/wayback-trial-3d.mjs --apply');
} else {
  const kinds = new Map();
  for (const o of introOffers) {
    const a = o.attributes;
    const key = `${a.offerMode} ${a.duration} x${a.numberOfPeriods}`;
    kinds.set(key, (kinds.get(key) || 0) + 1);
  }
  for (const [kind, n] of kinds) console.log(`  триал: ${kind} на ${n} территориях`);
  if (kinds.size !== 1 || !kinds.has('FREE_TRIAL THREE_DAYS x1')) {
    console.log('  ВНИМАНИЕ: ожидался FREE_TRIAL THREE_DAYS x1 — запустите wayback-trial-3d.mjs --apply');
  }
}

console.log('\nГотово.');
