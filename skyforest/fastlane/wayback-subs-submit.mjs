#!/usr/bin/env node
// Подача недельного тарифа WayBack на ревью в App Store.
//
// Подписка — отдельный предмет ревью: у неё своя подача, не привязанная к
// версии приложения. Это и позволяет подать недельный товар сейчас, когда 1.1
// уже вышла (READY_FOR_SALE), а прежняя подача закрыта (COMPLETE).
//
// Порядок ровно такой и другого нет:
//   1) у товара должна быть ВЕРСИЯ (POST /v1/subscriptionVersions) — черновик,
//      в который сложены локализации и кадр для ревьюера. На ревью уходит
//      именно версия, а не товар: положить в подачу `subscription` нельзя,
//      ASC отвечает «'subscription' is not a relationship»;
//   2) нужна подача в состоянии READY_FOR_REVIEW — либо уже открытая, либо
//      новая (POST /v1/reviewSubmissions);
//   3) в неё кладётся предмет — версия (POST /v1/reviewSubmissionItems);
//   4) подача отправляется (PATCH submitted: true).
//
// Версию группы «Premium» подавать не нужно: группа уже одобрена, а её
// локализации не менялись. Она требуется только с первой подпиской в группе
// или когда меняется её собственный текст.
//
// Скрипт НИЧЕГО НЕ ОТМЕНЯЕТ. Открытую чужую подачу он не трогает и не
// пересобирает: если такая найдётся, он положит товар в неё и скажет об этом,
// потому что двух одновременных подач у приложения быть не может.
//
// Запуск из каталога skyforest:
//   node fastlane/wayback-subs-submit.mjs [--apply]
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const APPLY = process.argv.includes('--apply');

const KEY_ID = 'TRS8NZAGX5';
const ISSUER_ID = '31303d35-0acc-4d1a-89d4-872e31f2b28f';
const P8_PATH = new URL('./AuthKey_TRS8NZAGX5.p8', import.meta.url);
const BASE = 'https://api.appstoreconnect.apple.com';

const APP_ID = '6795223337';
const SUBSCRIPTION_ID = '6798998819'; // ai.skyforest.wayback.sub.weekly

const b64url = (s) =>
  Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(
    JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }),
  )}`;
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

const fail = (step, res) => {
  console.error(`ОШИБКА ${step}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 700)}`);
  process.exit(1);
};

/* --- товар готов? --- */

const sub = await api('GET', `/v1/subscriptions/${SUBSCRIPTION_ID}`);
if (!sub.ok) fail('чтение товара', sub);
const state = sub.data?.attributes?.state ?? sub.json.data.attributes.state;
console.log(`товар ${sub.json.data.attributes.productId}: состояние ${state}`);
if (state === 'WAITING_FOR_REVIEW' || state === 'IN_REVIEW') {
  console.log('товар уже на ревью — подавать нечего');
  process.exit(0);
}
if (state === 'APPROVED') {
  console.log('товар уже одобрен — подавать нечего');
  process.exit(0);
}
if (state !== 'READY_TO_SUBMIT') {
  console.error(`товар не готов к подаче (${state}): не хватает метаданных, цены или кадра для ревью`);
  process.exit(1);
}

/* --- версия товара --- */

if (!APPLY) {
  console.log('(без --apply: версия не создаётся, подача не отправляется)');
  process.exit(0);
}

// Версия могла остаться от прошлой попытки: ASC не даёт создать вторую
// незакрытую, и создавать её повторно нечего.
let version = null;
const created = await api('POST', '/v1/subscriptionVersions', {
  data: {
    type: 'subscriptionVersions',
    relationships: {
      subscription: { data: { type: 'subscriptions', id: SUBSCRIPTION_ID } },
    },
  },
});
if (created.ok) {
  version = created.json.data;
  console.log(`создана версия ${version.id} [${version.attributes?.state}]`);
} else {
  const detail = JSON.stringify(created.json);
  const inflight = detail.match(/inflight version with id:?\s*'?([0-9a-f-]{36})'?/i);
  if (!inflight) fail('создание версии товара', created);
  version = { id: inflight[1] };
  const read = await api('GET', `/v1/subscriptionVersions/${version.id}`);
  console.log(
    `версия уже есть: ${version.id} [${read.json.data?.attributes?.state ?? 'состояние неизвестно'}]`,
  );
}

/* --- подача --- */

const existing = await api(
  'GET',
  `/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[state]=READY_FOR_REVIEW&limit=10`,
);
if (!existing.ok) fail('поиск открытых подач', existing);

let submission = (existing.json.data || [])[0];
if (submission) {
  console.log(`есть открытая подача ${submission.id} — товар уйдёт в неё`);
} else {
  console.log('открытых подач нет, нужна новая');
  const madeSubmission = await api('POST', '/v1/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  if (!madeSubmission.ok) fail('создание подачи', madeSubmission);
  submission = madeSubmission.json.data;
  console.log(`создана подача ${submission.id}`);
}

/* --- предмет подачи --- */

const items = await api('GET', `/v1/reviewSubmissions/${submission.id}/items?limit=50&include=subscriptionVersion`);
const already = (items.json.data || []).some(
  (i) => i.relationships?.subscriptionVersion?.data?.id === version.id,
);
if (already) {
  console.log('версия уже лежит в этой подаче');
} else {
  const item = await api('POST', '/v1/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.id } },
        subscriptionVersion: { data: { type: 'subscriptionVersions', id: version.id } },
      },
    },
  });
  if (!item.ok) fail('добавление версии в подачу', item);
  console.log(`версия добавлена предметом ${item.json.data.id}`);
}

/* --- отправка --- */

const sent = await api('PATCH', `/v1/reviewSubmissions/${submission.id}`, {
  data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } },
});
if (!sent.ok) fail('отправка подачи', sent);
console.log(`подача ${submission.id} отправлена: состояние ${sent.json.data.attributes.state}`);
