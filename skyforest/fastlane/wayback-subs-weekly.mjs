#!/usr/bin/env node
// Недельный тариф WayBack в App Store Connect и новая цена годового.
//
// Что делает:
//   1) заводит ai.skyforest.wayback.sub.weekly в существующей группе «Premium»
//      (локализации, цена 1.99 USD, бесплатный триал 3 дня, заметка ревьюеру);
//   2) переводит ai.skyforest.wayback.sub.yearly на 19.99 USD.
//
// Оба товара стоят на groupLevel 1 — так же, как пары monthly/yearly в
// SkyForest Premium. Уровень задаёт не выгодность тарифа, а объём прав, а он у
// недели и года одинаковый: приложение открывается целиком. Один уровень
// означает crossgrade — смена тарифа применяется в конце оплаченного периода,
// без пересчётов и возвратов, и originalTransactionId при этом сохраняется,
// поэтому verify-subscription обновляет ту же строку user_subscriptions, а не
// заводит вторую.
//
// Цена годового поднимается с `preserveCurrentPrice: true`. Это не деталь
// вежливости: повышение цены Apple обязана согласовать с каждым действующим
// подписчиком (письмо, уведомление в приложении, и без явного согласия
// подписка просто не продлевается). Флаг оставляет уже подписанных на прежней
// цене — согласовывать нечего, никто ничего не теряет, — а 19.99 получают
// только новые. Поднять цену действующим можно потом и осознанно, из консоли.
// Что флаг сработал, видно по чтению: у территории появляется вторая запись
// со старой ценой и `preserved: true` — это и есть «дедушкина» цена.
//
// Две тонкости ASC, каждая стоила по 409-й ошибке:
//   • Цену нельзя записать товару, у которого ещё нет ДОСТУПНОСТИ территорий:
//     POST падает с ENTITY_ERROR.RELATIONSHIP.INVALID на ценовой точке, хотя
//     точка правильная. Поэтому доступность создаётся первой, и список
//     территорий копируется у годового — недельный продаётся ровно там же.
//   • Одобренному товару нельзя переписать цену «на месте»: это initial price,
//     и второй раз он не создаётся («Initial price cannot be created again
//     after subscription is approved»). Новая цена планируется на дату:
//     Apple принимает начиная с завтрашнего дня. Отсюда START_DATE.
//
// Триал новому товару не нужен «отдельно от группы»: вводное предложение Apple
// считает по ГРУППЕ, поэтому 3 дня даются один раз — на недельном или на
// годовом, что человек выберет первым. Записи всё равно заводятся на оба
// товара и на все территории: без записи товар просто продаётся без триала.
//
// Скрипт идемпотентен и без --apply ничего не пишет.
// Запуск из каталога skyforest:
//   node fastlane/wayback-subs-weekly.mjs [--apply]
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const APPLY = process.argv.includes('--apply');

const KEY_ID = 'TRS8NZAGX5';
const ISSUER_ID = '31303d35-0acc-4d1a-89d4-872e31f2b28f';
const P8_PATH = new URL('./AuthKey_TRS8NZAGX5.p8', import.meta.url);
const BASE = 'https://api.appstoreconnect.apple.com';

const APP_ID = '6795223337'; // ai.skyforest.wayback
const GROUP_REFERENCE_NAME = 'Premium';

const WEEKLY = {
  productId: 'ai.skyforest.wayback.sub.weekly',
  name: 'Premium Weekly',
  period: 'ONE_WEEK',
  usd: '1.99',
  localizations: [
    // ASC ограничивает описание 55 символами.
    {
      locale: 'en-US',
      name: 'Premium Weekly',
      description: 'Offline areas, satellite imagery and device sync',
    },
    {
      locale: 'ru',
      name: 'Премиум (неделя)',
      description: 'Офлайн-области, спутниковые снимки и синхронизация',
    },
  ],
  reviewNote:
    'Same full access as the yearly plan, billed weekly. Unlocks offline area downloads, satellite imagery and cross-device sync. 3-day free trial, then weekly billing.',
};

const YEARLY = {
  id: '6795224725',
  productId: 'ai.skyforest.wayback.sub.yearly',
  usd: '19.99',
};

const PRICE_TERRITORY = 'USA';
const TRIAL_DURATION = 'THREE_DAYS';

/** Ближайшая дата, которую принимает ASC для смены цены, — завтра. */
const START_DATE = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);

const b64url = (s) =>
  Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function token() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(input);
  return `${input}.${b64url(signer.sign({ key: readFileSync(P8_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' }))}`;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
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
async function all(path) {
  let next = `${BASE}${path}`;
  const data = [];
  const included = [];
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token()}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`GET ${next} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    data.push(...(json.data || []));
    included.push(...(json.included || []));
    next = json.links?.next ?? null;
  }
  return { data, included };
}

const fail = (step, res) =>
  console.error(`  ОШИБКА ${step}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 700)}`);

/**
 * Пул из 6 воркеров с отступлением на 429. ASC считает частоту записи по
 * приложению, и сотня территорий подряд её выбирает: без повторов треть
 * запросов просто теряется, а частично проставленная цена хуже непроставленной.
 */
async function pool(items, fn) {
  const queue = [...items];
  const failures = [];
  let done = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        let res;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          res = await fn(item);
          if (res.status !== 429) break;
          await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt + Math.random() * 500));
        }
        if (res.ok) done += 1;
        else failures.push({ item, status: res.status, body: JSON.stringify(res.json).slice(0, 250) });
      }
    }),
  );
  return { done, failures };
}

/** Ценовая точка ровно на нужную сумму в базовой территории. */
async function pricePointFor(subId, usd) {
  let cursor = null;
  for (let page = 0; page < 25; page += 1) {
    const res = await api(
      'GET',
      `/v1/subscriptions/${subId}/pricePoints?filter[territory]=${PRICE_TERRITORY}&limit=200` +
        (cursor ? `&cursor=${cursor}` : ''),
    );
    if (!res.ok) {
      fail('получение pricePoints', res);
      return null;
    }
    const found = (res.json.data || []).find((p) => p.attributes.customerPrice === usd);
    if (found) return found;
    cursor = res.json.meta?.paging?.nextCursor;
    if (!cursor) return null;
  }
  return null;
}

/**
 * Доступность территорий. Без неё цена не записывается (см. шапку). Список
 * копируется у товара-образца, чтобы оба тарифа продавались в одних странах;
 * доступность образца при этом не трогается.
 */
async function ensureAvailability(subId, sampleSubId) {
  const has = await api('GET', `/v1/subscriptions/${subId}/subscriptionAvailability?include=availableTerritories`);
  if (has.status === 200 && has.json.data) {
    console.log(`  доступность уже есть: ${(has.json.included || []).length} территорий`);
    return true;
  }
  const sample = await api(
    'GET',
    `/v1/subscriptions/${sampleSubId}/subscriptionAvailability?include=availableTerritories`,
  );
  const territories = (sample.json.included || []).map((t) => ({ type: 'territories', id: t.id }));
  if (!territories.length) {
    console.error('  ОШИБКА: у образца нет территорий, копировать нечего');
    return false;
  }
  console.log(`  доступности нет, будет создана по образцу: ${territories.map((t) => t.id).join(', ')}`);
  if (!APPLY) return true;
  const res = await api('POST', '/v1/subscriptionAvailabilities', {
    data: {
      type: 'subscriptionAvailabilities',
      attributes: {
        availableInNewTerritories: sample.json.data?.attributes?.availableInNewTerritories ?? true,
      },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subId } },
        availableTerritories: { data: territories },
      },
    },
  });
  if (!res.ok) fail('создание доступности', res);
  else console.log('  доступность создана');
  return res.ok;
}

/**
 * Цена на все территории: базовая точка плюс эквиваленты, рекомендованные
 * Apple. `preserveCurrentPrice` решает судьбу действующих подписчиков —
 * см. шапку файла. `startDate` обязателен для одобренного товара и должен
 * отсутствовать у нового: там это первая цена, а не смена.
 */
async function setPriceEverywhere(subId, usd, { preserveCurrentPrice, startDate }) {
  const base = await pricePointFor(subId, usd);
  if (!base) {
    console.error(`  ОШИБКА: ценовой точки ${usd} USD для ${PRICE_TERRITORY} нет`);
    return false;
  }
  console.log(
    `  базовая точка ${PRICE_TERRITORY}: ${base.attributes.customerPrice} USD (proceeds ${base.attributes.proceeds})`,
  );

  const targets = [{ pricePointId: base.id, territoryId: PRICE_TERRITORY }];
  const eq = await all(`/v1/subscriptionPricePoints/${base.id}/equalizations?include=territory&limit=200`);
  for (const p of eq.data) {
    const territoryId = p.relationships?.territory?.data?.id;
    if (territoryId) targets.push({ pricePointId: p.id, territoryId });
  }

  // Уже стоящая цена: у территории может быть несколько записей — «дедушкина»
  // (preserved) и запланированная. Нужную цену ищем среди тех, что не
  // preserved: preserved существует ради старых подписчиков и переписыванию
  // не подлежит.
  const cur = await all(`/v1/subscriptions/${subId}/prices?include=territory,subscriptionPricePoint&limit=200`);

  // Запланированные смены, не совпадающие с целью по дате или по цене,
  // снимаем: иначе у территории повиснут две будущие цены, и какая сработает —
  // вопрос к Apple, а не решение. Уже действующие цены (startDate: null) и
  // «дедушкины» (preserved) не трогаем — первые сменятся сами в START_DATE,
  // вторые существуют ради старых подписчиков.
  const wanted = new Map(targets.map((t) => [t.territoryId, t.pricePointId]));
  const outdated = cur.data.filter((p) => {
    if (p.attributes.preserved || !p.attributes.startDate) return false;
    const territory = p.relationships?.territory?.data?.id;
    const point = p.relationships?.subscriptionPricePoint?.data?.id;
    return p.attributes.startDate !== startDate || wanted.get(territory) !== point;
  });
  if (outdated.length) {
    console.log(`  запланированных смен, не совпадающих с целью: ${outdated.length}`);
    if (APPLY) {
      const del = await pool(outdated, (p) => api('DELETE', `/v1/subscriptionPrices/${p.id}`));
      console.log(`  снято: ${del.done} из ${outdated.length}`);
      for (const f of del.failures.slice(0, 3)) console.error(`    ОШИБКА снятия: HTTP ${f.status} ${f.body}`);
    }
  }

  const current = new Map();
  for (const p of cur.data) {
    if (p.attributes.preserved) continue;
    if (outdated.some((w) => w.id === p.id)) continue;
    const territory = p.relationships?.territory?.data?.id;
    const list = current.get(territory) ?? [];
    list.push(p.relationships?.subscriptionPricePoint?.data?.id);
    current.set(territory, list);
  }
  const stale = targets.filter((t) => !(current.get(t.territoryId) ?? []).includes(t.pricePointId));
  console.log(
    `  территорий всего ${targets.length}, требуют записи ${stale.length}` +
      (startDate ? ` (смена с ${startDate})` : ' (первая цена товара)'),
  );
  if (!stale.length) return true;
  if (!APPLY) {
    console.log('  (без --apply: ничего не записано)');
    return true;
  }

  const res = await pool(stale, (t) =>
    api('POST', '/v1/subscriptionPrices', {
      data: {
        type: 'subscriptionPrices',
        attributes: { preserveCurrentPrice, ...(startDate ? { startDate } : {}) },
        relationships: {
          subscription: { data: { type: 'subscriptions', id: subId } },
          subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: t.pricePointId } },
          territory: { data: { type: 'territories', id: t.territoryId } },
        },
      },
    }),
  );
  console.log(`  записано территорий: ${res.done} из ${stale.length}`);
  for (const f of res.failures.slice(0, 5)) {
    console.error(`    ОШИБКА ${f.item.territoryId}: HTTP ${f.status} ${f.body}`);
  }
  return res.failures.length === 0;
}

/** Бесплатный триал на всех территориях, где у товара есть цена. */
async function setTrialEverywhere(subId) {
  const prices = await all(`/v1/subscriptions/${subId}/prices?include=territory&limit=200`);
  const territories = [...new Set(prices.data.map((p) => p.relationships?.territory?.data?.id).filter(Boolean))];
  const offers = await all(`/v1/subscriptions/${subId}/introductoryOffers?include=territory&limit=200`);
  // `duration` у готового оффера иммутабельна (PATCH → 409), поэтому чужая
  // длительность лечится только удалением записи.
  const stale = offers.data.filter((o) => o.attributes.duration !== TRIAL_DURATION);
  const covered = new Set(
    offers.data
      .filter((o) => o.attributes.duration === TRIAL_DURATION)
      .map((o) => o.relationships?.territory?.data?.id),
  );
  const missing = territories.filter((t) => !covered.has(t));
  console.log(`  триал: территорий с ценой ${territories.length}, лишних записей ${stale.length}, не хватает ${missing.length}`);
  if (!stale.length && !missing.length) return true;
  if (!APPLY) {
    console.log('  (без --apply: ничего не записано)');
    return true;
  }

  if (stale.length) {
    const del = await pool(stale, (o) => api('DELETE', `/v1/subscriptionIntroductoryOffers/${o.id}`));
    console.log(`  удалено записей: ${del.done} из ${stale.length}`);
  }
  const made = await pool(missing, (territory) =>
    api('POST', '/v1/subscriptionIntroductoryOffers', {
      data: {
        type: 'subscriptionIntroductoryOffers',
        attributes: { offerMode: 'FREE_TRIAL', duration: TRIAL_DURATION, numberOfPeriods: 1 },
        relationships: {
          subscription: { data: { type: 'subscriptions', id: subId } },
          territory: { data: { type: 'territories', id: territory } },
        },
      },
    }),
  );
  console.log(`  создано записей: ${made.done} из ${missing.length}`);
  for (const f of made.failures.slice(0, 5)) {
    console.error(`    ОШИБКА ${f.item}: HTTP ${f.status} ${f.body}`);
  }
  return made.failures.length === 0;
}

/* ================================================================== */

console.log(`===== НЕДЕЛЬНЫЙ ТАРИФ ${WEEKLY.productId} =====${APPLY ? '' : '  (сухой прогон)'}`);

const groups = await api('GET', `/v1/apps/${APP_ID}/subscriptionGroups?limit=50`);
if (!groups.ok) {
  fail('получение групп', groups);
  process.exit(1);
}
const group = (groups.json.data || []).find((g) => g.attributes.referenceName === GROUP_REFERENCE_NAME);
if (!group) {
  console.error(`  ОШИБКА: группы "${GROUP_REFERENCE_NAME}" нет — сначала node fastlane/wayback-subs-create.mjs`);
  process.exit(1);
}
console.log(`группа "${GROUP_REFERENCE_NAME}" id=${group.id}`);

const subs = await api('GET', `/v1/subscriptionGroups/${group.id}/subscriptions?limit=50`);
let weekly = (subs.json.data || []).find((s) => s.attributes.productId === WEEKLY.productId);

if (!weekly) {
  if (!APPLY) {
    console.log(`  товара нет, был бы создан (${WEEKLY.period}, groupLevel 1) — запуск без --apply`);
  } else {
    const created = await api('POST', '/v1/subscriptions', {
      data: {
        type: 'subscriptions',
        attributes: {
          name: WEEKLY.name,
          productId: WEEKLY.productId,
          subscriptionPeriod: WEEKLY.period,
          familySharable: false,
          // Тот же уровень, что у годового: объём прав одинаковый (см. шапку).
          groupLevel: 1,
          reviewNote: WEEKLY.reviewNote,
        },
        relationships: { group: { data: { type: 'subscriptionGroups', id: group.id } } },
      },
    });
    if (!created.ok) {
      fail('создание недельного товара', created);
      process.exit(1);
    }
    weekly = created.json.data;
    console.log(`  создан ${WEEKLY.productId} id=${weekly.id}`);
  }
} else {
  const a = weekly.attributes;
  console.log(`  уже есть, id=${weekly.id} [${a.state}] период=${a.subscriptionPeriod} level=${a.groupLevel}`);
  if (a.subscriptionPeriod !== WEEKLY.period) {
    console.error(`  ВНИМАНИЕ: период ${a.subscriptionPeriod}, ожидался ${WEEKLY.period}`);
  }
  if (a.reviewNote !== WEEKLY.reviewNote && APPLY) {
    const patched = await api('PATCH', `/v1/subscriptions/${weekly.id}`, {
      data: { type: 'subscriptions', id: weekly.id, attributes: { reviewNote: WEEKLY.reviewNote } },
    });
    console.log(patched.ok ? '  заметка ревьюеру обновлена' : '');
    if (!patched.ok) fail('заметка ревьюеру', patched);
  }
}

if (weekly) {
  console.log('\n--- локализации ---');
  const locs = await api('GET', `/v1/subscriptions/${weekly.id}/subscriptionLocalizations?limit=20`);
  for (const loc of WEEKLY.localizations) {
    const existing = (locs.json.data || []).find((l) => l.attributes.locale === loc.locale);
    if (existing && existing.attributes.name === loc.name && existing.attributes.description === loc.description) {
      console.log(`  ${loc.locale}: уже актуальна`);
      continue;
    }
    if (!APPLY) {
      console.log(`  ${loc.locale}: требует записи (без --apply)`);
      continue;
    }
    const res = existing
      ? await api('PATCH', `/v1/subscriptionLocalizations/${existing.id}`, {
          data: {
            type: 'subscriptionLocalizations',
            id: existing.id,
            attributes: { name: loc.name, description: loc.description },
          },
        })
      : await api('POST', '/v1/subscriptionLocalizations', {
          data: {
            type: 'subscriptionLocalizations',
            attributes: { name: loc.name, description: loc.description, locale: loc.locale },
            relationships: { subscription: { data: { type: 'subscriptions', id: weekly.id } } },
          },
        });
    console.log(res.ok ? `  ${loc.locale}: записана` : '');
    if (!res.ok) fail(`локализация ${loc.locale}`, res);
  }

  console.log('\n--- доступность территорий ---');
  await ensureAvailability(weekly.id, YEARLY.id);

  console.log('\n--- цена 1.99 USD ---');
  // Товар новый: это первая цена (без startDate), и сохранять нечего —
  // действующих подписчиков у него быть не может.
  await setPriceEverywhere(weekly.id, WEEKLY.usd, {
    preserveCurrentPrice: false,
    startDate: null,
  });

  console.log('\n--- бесплатный триал 3 дня ---');
  await setTrialEverywhere(weekly.id);
}

console.log(`\n===== ГОДОВОЙ ТАРИФ ${YEARLY.productId} → ${YEARLY.usd} USD =====`);
console.log(`  смена цены с ${START_DATE}; действующие подписчики остаются на своей (preserveCurrentPrice)`);
await setPriceEverywhere(YEARLY.id, YEARLY.usd, {
  preserveCurrentPrice: true,
  startDate: START_DATE,
});

console.log('\nГотово.');
