#!/usr/bin/env node
/**
 * Пригласить тестировщика в TestFlight через App Store Connect API.
 *
 * По умолчанию используется внутренняя группа: она не требует Beta App Review,
 * то есть тестировщик видит билд сразу. Плата за это — внутренним тестировщиком
 * можно сделать только того, кто уже принял приглашение в пользователи
 * App Store Connect; скрипт это проверяет и говорит, если условие не выполнено.
 *
 * Ключ --external ведёт через внешнюю группу: туда приглашают любую почту, но
 * установить билд тестировщик сможет только после Beta App Review сборки.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/tf-invite.mjs <bundle-id> <email> [имя] [фамилия] [--external] [--group=Название]
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = "fastlane/AuthKey_TRS8NZAGX5.p8";
const BASE = "https://api.appstoreconnect.apple.com";

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const positional = argv.filter((a) => !a.startsWith("--"));
const EXTERNAL = flags.includes("--external");
const GROUP_NAME =
  flags.find((f) => f.startsWith("--group="))?.slice("--group=".length) ||
  (EXTERNAL ? "External Testers" : "Internal Testers");

const [BUNDLE, EMAIL] = positional;
if (!BUNDLE || !EMAIL) {
  console.error(
    "нужно: node fastlane/tf-invite.mjs <bundle-id> <email> [имя] [фамилия] [--external]",
  );
  process.exit(1);
}
// Имя по умолчанию — из локальной части почты: «maxim.gorbatsevich» → «Maxim Gorbatsevich».
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const localParts = EMAIL.split("@")[0].split(/[._-]+/);
const FIRST = positional[2] || cap(localParts[0]);
const LAST = positional[3] || cap(localParts.slice(1).join(" "));

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
console.log(`группа: ${GROUP_NAME} (${EXTERNAL ? "внешняя" : "внутренняя"})`);

// 2. Внутренним тестировщиком можно сделать только пользователя ASC.
//    Приглашение в аккаунт, которое человек ещё не принял, не считается.
if (!EXTERNAL) {
  const users = await api("GET", "/v1/users?limit=200&fields[users]=username");
  const isUser = (users.json.data || []).some(
    (u) => (u.attributes.username || "").toLowerCase() === EMAIL.toLowerCase(),
  );
  console.log(`${EMAIL} есть в пользователях ASC: ${isUser ? "да" : "НЕТ"}`);
  if (!isUser) {
    const inv = await api("GET", "/v1/userInvitations?limit=200&fields[userInvitations]=email");
    const pending = (inv.json.data || []).some(
      (i) => (i.attributes.email || "").toLowerCase() === EMAIL.toLowerCase(),
    );
    console.error(
      pending
        ? "приглашение в аккаунт ASC отправлено, но ещё не принято — дождитесь принятия или ведите через --external"
        : "внутренним тестировщиком можно сделать только пользователя ASC; " +
            "либо пригласите его в аккаунт, либо ведите через --external с Beta App Review",
    );
    process.exit(1);
  }
}

// 3. Группа
const groups = await api(
  "GET",
  `/v1/betaGroups?filter[app]=${app.id}&fields[betaGroups]=name,isInternalGroup&limit=50`,
);
let group = (groups.json.data || []).find(
  (g) => g.attributes.isInternalGroup === !EXTERNAL && g.attributes.name === GROUP_NAME,
);
group ||= (groups.json.data || []).find((g) => g.attributes.isInternalGroup === !EXTERNAL);
if (group) {
  console.log(`группа уже есть: ${group.attributes.name} (${group.id})`);
} else {
  const created = await api("POST", "/v1/betaGroups", {
    data: {
      type: "betaGroups",
      attributes: EXTERNAL
        ? { name: GROUP_NAME, publicLinkEnabled: false, feedbackEnabled: true }
        : { name: GROUP_NAME, isInternalGroup: true, hasAccessToAllBuilds: true },
      relationships: { app: { data: { type: "apps", id: app.id } } },
    },
  });
  if (!created.ok) {
    console.error(`не создалась группа (${created.status}): ${errText(created)}`);
    process.exit(1);
  }
  group = created.json.data;
  console.log(`создана группа: ${GROUP_NAME} (${group.id})`);
}

// 4. Билды.
const builds = await api(
  "GET",
  `/v1/builds?filter[app]=${app.id}&fields[builds]=version,processingState,expired&sort=-uploadedDate&limit=10`,
);
const valid = (builds.json.data || []).filter(
  (b) => b.attributes.processingState === "VALID" && !b.attributes.expired,
);
for (const b of builds.json.data || []) {
  console.log(`  билд ${b.attributes.version} [${b.attributes.processingState}]`);
}
if (EXTERNAL) {
  // Внешняя группа не имеет hasAccessToAllBuilds: сборки привязываются явно.
  const inGroup = await api("GET", `/v1/betaGroups/${group.id}/builds?fields[builds]=version&limit=50`);
  const have = new Set((inGroup.json.data || []).map((b) => b.id));
  const latest = valid[0];
  if (latest && !have.has(latest.id)) {
    const add = await api("POST", `/v1/betaGroups/${group.id}/relationships/builds`, {
      data: [{ type: "builds", id: latest.id }],
    });
    console.log(
      add.ok
        ? `  билд ${latest.attributes.version} привязан к группе`
        : `  билд ${latest.attributes.version} не привязался: ${errText(add)}`,
    );
  } else if (latest) {
    console.log(`  билд ${latest.attributes.version} уже в группе`);
  }
} else {
  // Внутренняя группа создана с hasAccessToAllBuilds, и явная привязка
  // отвечает «Cannot add internal group to a build».
}

// 5. Тестировщик в группе.
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
  // Список группы перебираем целиком: filter[email] на этом под-ресурсе
  // чувствителен к регистру и на «Siarheiskrill@…» не находит «siarheiskrill@…».
  const inGroup = await api(
    "GET",
    `/v1/betaGroups/${group.id}/betaTesters?fields[betaTesters]=email&limit=200`,
  );
  const already = (inGroup.json.data || []).some(
    (t) => (t.attributes.email || "").toLowerCase() === EMAIL.toLowerCase(),
  );
  if (!already) {
    const add = await api("POST", `/v1/betaGroups/${group.id}/relationships/betaTesters`, {
      data: [{ type: "betaTesters", id: tester.id }],
    });
    console.log(add.ok ? "добавлен в группу" : `не добавился в группу: ${errText(add)}`);
  } else {
    console.log("уже состоит в этой группе");
  }
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

// 7. Перечитываем фактическое состояние — статус в группе, а не наши ожидания.
const after = await api(
  "GET",
  `/v1/betaGroups/${group.id}/betaTesters?fields[betaTesters]=email,state,inviteType&limit=200`,
);
for (const t of after.json.data || []) {
  if ((t.attributes.email || "").toLowerCase() !== EMAIL.toLowerCase()) continue;
  console.log(
    `итог: ${t.attributes.email} в «${group.attributes.name}» state=${t.attributes.state} invite=${t.attributes.inviteType}`,
  );
}
