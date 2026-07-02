// Копирует бета-тестеров TestFlight из приложения EyesTalk в SkyForest AI
// через App Store Connect API. Секретов не содержит (ключ .p8 читается с диска).
//
// Запуск: node fastlane/copy-testers.mjs
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = "fastlane/AuthKey_TRS8NZAGX5.p8";
const BASE = "https://api.appstoreconnect.apple.com";

const SOURCE_APP = "6781209791"; // EyesTalk
const TARGET_APP = "6786255697"; // SkyForest AI
const TARGET_GROUP_NAME = "External Testers";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 600,
    aud: "appstoreconnect-v1",
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = readFileSync(P8_PATH, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(signature)}`;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${makeToken()}`,
      "Content-Type": "application/json",
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
  return { status: res.status, json };
}

function errStr(json) {
  if (json?.errors?.length) {
    return json.errors
      .map((e) => `${e.status || ""} ${e.code || ""} ${e.title || ""}${e.detail ? " — " + e.detail : ""}`.trim())
      .join(" | ");
  }
  return JSON.stringify(json);
}

// --- 1. Собрать всех тестеров EyesTalk (с пагинацией) ---
async function fetchSourceTesters() {
  const testers = [];
  let path =
    `/v1/betaTesters?filter[apps]=${SOURCE_APP}` +
    `&fields[betaTesters]=firstName,lastName,email,inviteType&limit=200`;
  while (path) {
    const { status, json } = await api("GET", path);
    if (status !== 200) throw new Error(`list betaTesters(source) failed: ${status} ${errStr(json)}`);
    for (const t of json.data || []) {
      testers.push({
        id: t.id,
        email: t.attributes?.email || "",
        firstName: t.attributes?.firstName || "",
        lastName: t.attributes?.lastName || "",
        inviteType: t.attributes?.inviteType || "",
      });
    }
    const next = json.links?.next;
    if (next) {
      // links.next — абсолютный URL; оставляем только путь+query
      path = next.replace(BASE, "");
    } else {
      path = null;
    }
  }
  return testers;
}

// --- 2. Найти/создать бета-группу на SkyForest ---
async function ensureTargetGroup() {
  const { status, json } = await api("GET", `/v1/betaGroups?filter[app]=${TARGET_APP}&limit=200`);
  if (status !== 200) throw new Error(`list betaGroups(target) failed: ${status} ${errStr(json)}`);
  const existing = (json.data || []).find(
    (g) => (g.attributes?.name || "").trim() === TARGET_GROUP_NAME,
  );
  if (existing) {
    console.log(
      `Группа найдена: "${existing.attributes?.name}" (id=${existing.id}, ` +
        `isInternal=${existing.attributes?.isInternalGroup})`,
    );
    return { group: existing, created: false, internal: !!existing.attributes?.isInternalGroup };
  }

  // Попытка создать внешнюю группу.
  const ext = await api("POST", "/v1/betaGroups", {
    data: {
      type: "betaGroups",
      attributes: { name: TARGET_GROUP_NAME },
      relationships: { app: { data: { type: "apps", id: TARGET_APP } } },
    },
  });
  if (ext.status === 201) {
    console.log(`Создана ВНЕШНЯЯ группа "${TARGET_GROUP_NAME}" (id=${ext.data?.id || ext.json.data?.id})`);
    return { group: ext.json.data, created: true, internal: false };
  }
  console.warn(`Не удалось создать внешнюю группу: ${ext.status} ${errStr(ext.json)}`);

  // Фолбэк: внутренняя группа.
  const intName = `${TARGET_GROUP_NAME} (Internal)`;
  const int = await api("POST", "/v1/betaGroups", {
    data: {
      type: "betaGroups",
      attributes: { name: intName, isInternalGroup: true },
      relationships: { app: { data: { type: "apps", id: TARGET_APP } } },
    },
  });
  if (int.status === 201) {
    console.log(`Фолбэк: создана ВНУТРЕННЯЯ группа "${intName}" (id=${int.json.data?.id})`);
    return { group: int.json.data, created: true, internal: true };
  }
  throw new Error(
    `Не удалось создать ни внешнюю, ни внутреннюю группу. ` +
      `external: ${ext.status} ${errStr(ext.json)} ; internal: ${int.status} ${errStr(int.json)}`,
  );
}

// Найти существующего тестера в аккаунте по email.
async function findTesterByEmail(email) {
  const { status, json } = await api(
    "GET",
    `/v1/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=1`,
  );
  if (status !== 200) return null;
  return json.data?.[0] || null;
}

// Добавить существующего тестера в группу по id.
async function addExistingToGroup(groupId, testerId) {
  return api("POST", `/v1/betaGroups/${groupId}/relationships/betaTesters`, {
    data: [{ type: "betaTesters", id: testerId }],
  });
}

// --- 3. Добавить тестера на SkyForest ---
async function addTester(groupId, t) {
  // Попытка создать тестера сразу в группе.
  const create = await api("POST", "/v1/betaTesters", {
    data: {
      type: "betaTesters",
      attributes: { email: t.email, firstName: t.firstName, lastName: t.lastName },
      relationships: { betaGroups: { data: [{ type: "betaGroups", id: groupId }] } },
    },
  });
  if (create.status === 201) return { email: t.email, result: "created+added" };

  const conflictish =
    create.status === 409 ||
    create.status === 422 ||
    create.status === 400 ||
    (create.json?.errors || []).some((e) =>
      /already exists|ENTITY_ERROR|conflict|already a member|duplicate/i.test(
        `${e.code || ""} ${e.title || ""} ${e.detail || ""}`,
      ),
    );

  if (conflictish) {
    // Тестер уже есть в аккаунте — добавляем в группу.
    const existing = await findTesterByEmail(t.email);
    if (!existing) {
      return {
        email: t.email,
        result: "fail",
        error: `create=${create.status} ${errStr(create.json)}; lookup-by-email не нашёл тестера`,
      };
    }
    const add = await addExistingToGroup(groupId, existing.id);
    if (add.status === 204 || add.status === 201 || add.status === 200) {
      return { email: t.email, result: "added-existing" };
    }
    // Возможно, уже в группе.
    if (
      add.status === 409 ||
      (add.json?.errors || []).some((e) =>
        /already|member|exists/i.test(`${e.code || ""} ${e.title || ""} ${e.detail || ""}`),
      )
    ) {
      return { email: t.email, result: "already-in-group" };
    }
    return {
      email: t.email,
      result: "fail",
      error: `add-to-group=${add.status} ${errStr(add.json)}`,
    };
  }

  return { email: t.email, result: "fail", error: `create=${create.status} ${errStr(create.json)}` };
}

// --- Билды таргета: попробовать назначить обработанный билд группе ---
async function maybeAssignBuild(groupId) {
  const { status, json } = await api(
    "GET",
    `/v1/builds?filter[app]=${TARGET_APP}` +
      `&fields[builds]=version,processingState,expired&sort=-uploadedDate&limit=10`,
  );
  if (status !== 200) {
    return { assigned: false, note: `Не удалось получить билды: ${status} ${errStr(json)}` };
  }
  const builds = json.data || [];
  if (!builds.length) {
    return { assigned: false, note: "На SkyForest пока нет билдов." };
  }
  const valid = builds.find(
    (b) => b.attributes?.processingState === "VALID" && !b.attributes?.expired,
  );
  const summary = builds
    .map((b) => `v${b.attributes?.version} [${b.attributes?.processingState}]`)
    .join(", ");
  if (!valid) {
    return { assigned: false, note: `Нет обработанного (VALID) билда. Билды: ${summary}` };
  }
  const assign = await api("POST", `/v1/betaGroups/${groupId}/relationships/builds`, {
    data: [{ type: "builds", id: valid.id }],
  });
  if (assign.status === 204 || assign.status === 201 || assign.status === 200) {
    return {
      assigned: true,
      note: `Билд v${valid.attributes?.version} (id=${valid.id}) назначен группе. Билды: ${summary}`,
    };
  }
  return {
    assigned: false,
    note: `Назначение билда v${valid.attributes?.version} не удалось: ${assign.status} ${errStr(assign.json)}. Билды: ${summary}`,
  };
}

async function main() {
  console.log("=== 1. Тестеры EyesTalk ===");
  const source = await fetchSourceTesters();
  console.log(`Найдено тестеров на EyesTalk: ${source.length}`);
  for (const t of source) {
    console.log(`  - ${t.email}  [${t.inviteType}]`);
  }

  const external = source.filter((t) => t.inviteType === "EMAIL");
  const internal = source.filter((t) => t.inviteType !== "EMAIL");
  console.log(`\nПо типу: EMAIL(внешние)=${external.length}, прочие(внутренние/MANAGED)=${internal.length}`);
  if (external.length === 0) {
    console.log(
      "ВНИМАНИЕ: у EyesTalk нет внешних (EMAIL) тестеров. " +
        "Все найденные — внутренние/MANAGED (команда ASC). Всё равно добавим их по email в группу SkyForest.",
    );
  }

  if (source.length === 0) {
    console.log("\nНет тестеров для копирования. Завершение.");
    return;
  }

  console.log("\n=== 2. Группа на SkyForest ===");
  const { group, internal: groupInternal } = await ensureTargetGroup();
  const groupId = group.id;

  console.log("\n=== 3. Добавление тестеров в группу SkyForest ===");
  const results = [];
  for (const t of source) {
    try {
      const r = await addTester(groupId, t);
      results.push(r);
      console.log(`  ${r.result === "fail" ? "✗" : "✓"} ${t.email} → ${r.result}${r.error ? " (" + r.error + ")" : ""}`);
    } catch (e) {
      results.push({ email: t.email, result: "fail", error: e.message });
      console.log(`  ✗ ${t.email} → fail (${e.message})`);
    }
  }

  console.log("\n=== 4. Билд для группы ===");
  const build = await maybeAssignBuild(groupId);
  console.log(build.note);

  // --- Итог ---
  const ok = results.filter((r) => r.result !== "fail");
  const fail = results.filter((r) => r.result === "fail");
  console.log("\n=========== ИТОГ ===========");
  console.log(`EyesTalk тестеров найдено:      ${source.length}`);
  console.log(`  из них внешних (EMAIL):       ${external.length}`);
  console.log(`  из них внутренних/MANAGED:    ${internal.length}`);
  console.log(`Группа SkyForest:               "${group.attributes?.name}" (id=${groupId}, internal=${groupInternal})`);
  console.log(`Добавлено/уже в группе:         ${ok.length}`);
  console.log(`Ошибок:                         ${fail.length}`);
  if (fail.length) {
    console.log("Ошибки по тестерам:");
    for (const f of fail) console.log(`  - ${f.email}: ${f.error}`);
  }
  console.log(`Билд назначен группе:           ${build.assigned ? "да" : "нет"} — ${build.note}`);
  if (!groupInternal) {
    console.log(
      "\nПРИМЕЧАНИЕ: внешние тестеры получат приглашение/смогут установить сборку только после того, " +
        "как билду будет назначен группе И он пройдёт TestFlight Beta App Review. " +
        (build.assigned
          ? "Билд назначен — дождитесь одобрения бета-ревью."
          : "Билд НЕ назначен (см. выше) — назначьте валидный билд после обработки/ревью."),
    );
  }
}

main().catch((e) => {
  console.error("ФАТАЛЬНО:", e.message);
  process.exit(1);
});
