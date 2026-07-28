#!/usr/bin/env node
/**
 * Пригласить тестировщика в TestFlight через App Store Connect API.
 *
 * Внутренняя группа выбрана намеренно: внешняя требует Beta App Review, а он
 * занимает до суток. Внутренним тестировщиком можно сделать только того, кто
 * уже есть в пользователях App Store Connect — скрипт это проверяет и говорит,
 * если условие не выполнено.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/tf-invite.mjs <bundle-id> <email> [имя] [фамилия]
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = "fastlane/AuthKey_TRS8NZAGX5.p8";
const BASE = "https://api.appstoreconnect.apple.com";
const GROUP_NAME = "Internal Testers";

const [, , BUNDLE, EMAIL, FIRST = "Maxim", LAST = "Gorbatsevich"] = process.argv;
if (!BUNDLE || !EMAIL) {
  console.error("нужно: node fastlane/tf-invite.mjs <bundle-id> <email>");
  process.exit(1);
}

const b64url = (i) =>
  Buffer.from(i).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
function tok() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" }),
  )}`;
  const s = createSign("SHA256");
  s.update(si);
  return `${si}.${b64url(s.sign({ key: readFileSync(P8_PATH, "utf8"), dsaEncoding: "ieee-p1363" }))}`;
}
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tok()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json };
}
const errText = (r) =>
  (r.json?.errors || [])
    .map((e) => `${e.title}: ${e.detail}`)
    .join(" | ") || JSON.stringify(r.json).slice(0, 300);

// 1. Приложение
const apps = await api("GET", `/v1/apps?filter[bundleId]=${BUNDLE}&fields[apps]=name`);
const app = apps.json.data?.[0];
if (!app) {
  console.error(`нет приложения с bundle id ${BUNDLE} в ASC`);
  process.exit(1);
}
console.log(`приложение: ${app.attributes.name} (${app.id})`);

// 2. Тестировщик обязан быть пользователем ASC — иначе внутренняя группа не примет
const users = await api("GET", "/v1/users?limit=200&fields[users]=username");
const isUser = (users.json.data || []).some(
  (u) => (u.attributes.username || "").toLowerCase() === EMAIL.toLowerCase(),
);
console.log(`${EMAIL} есть в пользователях ASC: ${isUser ? "да" : "НЕТ"}`);
if (!isUser) {
  console.error(
    "внутренним тестировщиком можно сделать только пользователя ASC; " +
      "либо пригласите его в аккаунт, либо ведите через внешнюю группу с Beta App Review",
  );
  process.exit(1);
}

// 3. Внутренняя группа
let group = null;
const groups = await api(
  "GET",
  `/v1/betaGroups?filter[app]=${app.id}&fields[betaGroups]=name,isInternalGroup&limit=50`,
);
group = (groups.json.data || []).find((g) => g.attributes.isInternalGroup);
if (group) {
  console.log(`внутренняя группа уже есть: ${group.attributes.name} (${group.id})`);
} else {
  const created = await api("POST", "/v1/betaGroups", {
    data: {
      type: "betaGroups",
      attributes: { name: GROUP_NAME, isInternalGroup: true, hasAccessToAllBuilds: true },
      relationships: { app: { data: { type: "apps", id: app.id } } },
    },
  });
  if (!created.ok) {
    console.error(`не создалась группа (${created.status}): ${errText(created)}`);
    process.exit(1);
  }
  group = created.json.data;
  console.log(`создана внутренняя группа: ${GROUP_NAME} (${group.id})`);
}

// 4. Тестировщик в группе.
// Именно созданием записи с relationships.betaGroups, а не привязкой
// существующей через /relationships/betaTesters: если тот же email уже есть
// в группе другого приложения, привязка отвечает «Tester(s) cannot be
// assigned», а создание в группе проходит и заводит запись для этого app.
let tester = (
  await api(
    "GET",
    `/v1/betaTesters?filter[apps]=${app.id}&filter[email]=${encodeURIComponent(EMAIL)}&fields[betaTesters]=email,state&limit=10`,
  )
).json.data?.[0];

if (tester) {
  console.log(`тестировщик уже привязан к приложению (${tester.id})`);
} else {
  const created = await api("POST", "/v1/betaTesters", {
    data: {
      type: "betaTesters",
      attributes: { email: EMAIL, firstName: FIRST, lastName: LAST },
      relationships: { betaGroups: { data: [{ type: "betaGroups", id: group.id }] } },
    },
  });
  if (!created.ok) {
    console.error(`не создался тестировщик (${created.status}): ${errText(created)}`);
    process.exit(1);
  }
  tester = created.json.data;
  console.log(`тестировщик добавлен в группу: ${EMAIL} (${tester.id})`);
}

// 5. Билды в группу не привязываем: группа создана с hasAccessToAllBuilds,
// и явная привязка отвечает «Cannot add internal group to a build».
const builds = await api(
  "GET",
  `/v1/builds?filter[app]=${app.id}&fields[builds]=version,processingState&sort=-uploadedDate&limit=5`,
);
for (const b of builds.json.data || []) {
  console.log(`  билд ${b.attributes.version} [${b.attributes.processingState}]`);
}

// 6. Письмо с приглашением. Само по факту появления билда оно не всегда
// уходит, поэтому дёргаем явно.
const inv = await api("POST", "/v1/betaTesterInvitations", {
  data: {
    type: "betaTesterInvitations",
    relationships: {
      app: { data: { type: "apps", id: app.id } },
      betaTester: { data: { type: "betaTesters", id: tester.id } },
    },
  },
});
console.log(inv.ok ? `приглашение отправлено на ${EMAIL}` : `приглашение не ушло: ${errText(inv)}`);
