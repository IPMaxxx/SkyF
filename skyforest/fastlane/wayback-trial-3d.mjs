#!/usr/bin/env node
// Бесплатный триал годовой подписки WayBack — 3 дня в обоих сторах, плюс
// тексты, где длительность названа словами.
//
// App Store Connect. `duration` вводного оффера иммутабельна: PATCH отвечает
// 409 ENTITY_ERROR.ATTRIBUTE.NOT_ALLOWED. Поэтому старые записи удаляются и
// создаются заново. Создавать приходится ПОИМЕННО по территориям: POST без
// relationships.territory отклоняется (409 ENTITY_ERROR.RELATIONSHIP.REQUIRED),
// хотя когда-то Apple сам разворачивал глобальный оффер на все территории.
// Список территорий берём из цен подписки — оффер нужен там, где есть цена.
// Офферы перечисляются постранично и БЕЗ filter[territory]: с фильтром в ответе
// одна запись, и легко решить, что триал заведён только для США, поменять его
// там и не заметить остальные 174 территории.
//
// Google Play. У существующего оффера меняется длительность фазы (P7D → P3D),
// идентификатор `free-trial-7d` остаётся. Play не умеет переименовывать офферы,
// а завести `free-trial-3d` рядом — значит держать на базовом плане два оффера
// и надеяться, что пользователю подберётся нужный. Идентификатор пользователь
// не видит нигде, поэтому одна запись с верной длительностью честнее двух с
// красивыми именами.
//
// Месячный товар (`...sub.monthly`) не трогаем: приложением он не используется
// и удаляется вручную.
//
// Скрипт идемпотентен. Запуск из каталога skyforest:
//   node fastlane/wayback-trial-3d.mjs [--apply] [--play-only]
//
// `--play-only` оставляет App Store Connect нетронутым: пока версия на ревью,
// заметку для ревьюера правят руками под конкретную подачу, и перезаписывать её
// заготовкой из этого файла нельзя.
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const PLAY_ONLY = process.argv.includes('--play-only');
/** Почему запись пропущена — чтобы в выводе не было «запустите с --apply», когда --apply уже стоит. */
const SKIP = PLAY_ONLY ? '--play-only: App Store не трогаю' : 'запуск без --apply';

const KEY_ID = 'TRS8NZAGX5';
const ISSUER_ID = '31303d35-0acc-4d1a-89d4-872e31f2b28f';
const P8_PATH = new URL('./AuthKey_TRS8NZAGX5.p8', import.meta.url);
const ASC_BASE = 'https://api.appstoreconnect.apple.com';
const PLAY_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

const ASC_SUB_ID = '6795224725'; // ai.skyforest.wayback.sub.yearly
const DURATION = 'THREE_DAYS';
const ASC_REVIEW_NOTE =
  'Unlocks offline area downloads, satellite imagery and cross-device sync. 3-day free trial, then yearly billing.';

const PKG = 'ai.skyforest.wayback';
const PLAY_PRODUCT = 'ai.skyforest.wayback.sub.yearly';
const PLAY_BASE_PLAN = 'yearly';
const PLAY_OFFER = 'free-trial-7d';
const PLAY_TRIAL = 'P3D';
// `benefits` — до четырёх пунктов по 40 символов, Play показывает их в карточке
// подписки и при восстановлении покупки.
const PLAY_LISTINGS = [
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
];

const b64url = (s) =>
  Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function ascToken() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(input);
  return `${input}.${b64url(signer.sign({ key: readFileSync(P8_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' }))}`;
}

async function asc(method, path, body) {
  const res = await fetch(`${ASC_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ascToken()}`,
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

/** Все страницы отношения: цены и офферы Apple хранит по записи на территорию. */
async function ascAll(path) {
  let next = `${ASC_BASE}${path}`;
  const data = [];
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${ascToken()}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    data.push(...(json.data || []));
    next = json.links?.next ?? null;
  }
  return data;
}

function summarize(offers) {
  const kinds = new Map();
  for (const o of offers) {
    const a = o.attributes;
    const key = `${a.offerMode} ${a.duration} x${a.numberOfPeriods}`;
    kinds.set(key, (kinds.get(key) || 0) + 1);
  }
  return [...kinds].map(([k, n]) => `${k} — ${n} территорий`).join('; ') || 'офферов нет';
}

/** Пул из 6 воркеров: ASC ограничивает частоту записи. */
async function pool(items, fn) {
  const queue = [...items];
  const failures = [];
  let done = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const res = await fn(item);
        if (res.ok) done += 1;
        else failures.push({ item, status: res.status, body: JSON.stringify(res.json).slice(0, 250) });
      }
    }),
  );
  return { done, failures };
}

console.log('===== APP STORE CONNECT =====');

const prices = await ascAll(`/v1/subscriptions/${ASC_SUB_ID}/prices?include=territory&limit=200`);
const territories = [
  ...new Set(prices.map((p) => p.relationships?.territory?.data?.id).filter(Boolean)),
];
let offers = await ascAll(
  `/v1/subscriptions/${ASC_SUB_ID}/introductoryOffers?include=territory&limit=200`,
);
console.log(`территорий с ценой: ${territories.length}`);
console.log(`триал сейчас: ${summarize(offers)}`);

const stale = offers.filter((o) => o.attributes.duration !== DURATION);
const covered = new Set(
  offers.filter((o) => o.attributes.duration === DURATION).map((o) => o.relationships?.territory?.data?.id),
);
const missing = territories.filter((t) => !covered.has(t));

if (!stale.length && !missing.length) {
  console.log(`уже FREE_TRIAL ${DURATION} на всех ${territories.length} территориях — менять нечего`);
} else if (!APPLY || PLAY_ONLY) {
  console.log(
    `нужно удалить ${stale.length} записей и создать ${missing.length} новых (${DURATION})\n` +
      `(${SKIP}: ничего не изменено)`,
  );
} else {
  if (stale.length) {
    const del = await pool(stale, (o) =>
      asc('DELETE', `/v1/subscriptionIntroductoryOffers/${o.id}`),
    );
    console.log(`удалено записей: ${del.done} из ${stale.length}`);
    for (const f of del.failures.slice(0, 5)) {
      console.error(
        `  ОШИБКА удаления ${f.item.relationships?.territory?.data?.id}: HTTP ${f.status} ${f.body}`,
      );
    }
  }

  const created = await pool(missing, (territory) =>
    asc('POST', '/v1/subscriptionIntroductoryOffers', {
      data: {
        type: 'subscriptionIntroductoryOffers',
        attributes: { offerMode: 'FREE_TRIAL', duration: DURATION, numberOfPeriods: 1 },
        relationships: {
          subscription: { data: { type: 'subscriptions', id: ASC_SUB_ID } },
          territory: { data: { type: 'territories', id: territory } },
        },
      },
    }),
  );
  console.log(`создано записей: ${created.done} из ${missing.length}`);
  for (const f of created.failures.slice(0, 10)) {
    console.error(`  ОШИБКА создания ${f.item}: HTTP ${f.status} ${f.body}`);
  }

  offers = await ascAll(
    `/v1/subscriptions/${ASC_SUB_ID}/introductoryOffers?include=territory&limit=200`,
  );
  console.log(`триал после правки: ${summarize(offers)}`);
}

// Заметка для ревьюера называет длительность словами — её тоже надо догнать.
const sub = await asc('GET', `/v1/subscriptions/${ASC_SUB_ID}`);
const note = sub.json.data?.attributes?.reviewNote;
if (note === ASC_REVIEW_NOTE) {
  console.log('review note уже актуальна');
} else if (!APPLY || PLAY_ONLY) {
  console.log(`review note требует правки (${SKIP}): "${String(note).slice(0, 90)}"`);
} else {
  const patched = await asc('PATCH', `/v1/subscriptions/${ASC_SUB_ID}`, {
    data: {
      type: 'subscriptions',
      id: ASC_SUB_ID,
      attributes: { reviewNote: ASC_REVIEW_NOTE },
    },
  });
  console.log(
    patched.ok
      ? 'review note обновлена'
      : `ОШИБКА review note: HTTP ${patched.status} ${JSON.stringify(patched.json).slice(0, 400)}`,
  );
}

console.log('\n===== GOOGLE PLAY =====');
const sa = JSON.parse(readFileSync(new URL('./play-service-account.json', import.meta.url), 'utf8'));

async function playToken() {
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

const token = await playToken();
async function play(method, path, body) {
  const res = await fetch(`${PLAY_BASE}${path}`, {
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
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

const offerPath = `/applications/${PKG}/subscriptions/${PLAY_PRODUCT}/basePlans/${PLAY_BASE_PLAN}/offers/${PLAY_OFFER}`;
const curOffer = await play('GET', offerPath);
if (!curOffer.ok) {
  console.error(
    `ОШИБКА чтения оффера: HTTP ${curOffer.status} ${JSON.stringify(curOffer.json).slice(0, 400)}`,
  );
} else {
  const phases = (curOffer.json.phases || []).map((p) => p.duration).join(', ');
  console.log(`оффер ${PLAY_OFFER} [${curOffer.json.state}] фазы: ${phases}`);

  if ((curOffer.json.phases || []).every((p) => p.duration === PLAY_TRIAL)) {
    console.log(`уже ${PLAY_TRIAL} — менять нечего`);
  } else if (!APPLY) {
    console.log(`нужно сменить фазу на ${PLAY_TRIAL} (запуск без --apply)`);
  } else {
    const body = {
      ...curOffer.json,
      phases: (curOffer.json.phases || []).map((p) => ({ ...p, duration: PLAY_TRIAL })),
    };
    delete body.state;
    const patched = await play(
      'PATCH',
      `${offerPath}?updateMask=phases&regionsVersion.version=2025%2F03`,
      body,
    );
    if (patched.ok) {
      console.log(
        `обновлено: фазы ${(patched.json.phases || []).map((p) => p.duration).join(', ')}, состояние ${patched.json.state}`,
      );
    } else {
      console.error(
        `ОШИБКА обновления оффера: HTTP ${patched.status} ${JSON.stringify(patched.json).slice(0, 700)}`,
      );
    }
  }
}

// Листинги товара в Play называют триал словами («7-day free trial»).
const curSub = await play('GET', `/applications/${PKG}/subscriptions/${PLAY_PRODUCT}`);
if (!curSub.ok) {
  console.error(`ОШИБКА чтения товара: HTTP ${curSub.status} ${JSON.stringify(curSub.json).slice(0, 300)}`);
} else {
  const staleListings = PLAY_LISTINGS.some((l) => {
    const cur = (curSub.json.listings || []).find((c) => c.languageCode === l.languageCode);
    if (!cur || cur.title !== l.title || cur.description !== l.description) return true;
    return (cur.benefits || []).join('\n') !== l.benefits.join('\n');
  });
  if (!staleListings) {
    console.log('листинги уже актуальны');
  } else if (!APPLY) {
    console.log('листинги требуют правки (запуск без --apply)');
  } else {
    const patched = await play(
      'PATCH',
      `/applications/${PKG}/subscriptions/${PLAY_PRODUCT}` +
        '?updateMask=listings&regionsVersion.version=2025%2F03',
      { packageName: PKG, productId: PLAY_PRODUCT, listings: PLAY_LISTINGS },
    );
    if (patched.ok) {
      for (const l of patched.json.listings || []) {
        console.log(`  листинг ${l.languageCode}: "${l.description}"`);
        for (const b of l.benefits || []) console.log(`    · ${b}`);
      }
    } else {
      console.error(
        `ОШИБКА листингов: HTTP ${patched.status} ${JSON.stringify(patched.json).slice(0, 600)}`,
      );
    }
  }
}

console.log('\nГотово.');
