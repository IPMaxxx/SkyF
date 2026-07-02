// Финализация внешнего беты TestFlight для SkyForest AI через App Store Connect API.
// Секретов не содержит: ключ .p8 и Supabase-ключи читаются с диска (.env.local).
//
// Запуск из каталога skyforest:  node fastlane/submit-beta.mjs
import { readFileSync, existsSync } from "node:fs";
import { createSign, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = resolve(__dirname, "..");

// --- ASC ---
const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = resolve(__dirname, "AuthKey_TRS8NZAGX5.p8");
const BASE = "https://api.appstoreconnect.apple.com";

const SKYFOREST_APP = "6786255697";
const EYESTALK_APP = "6781209791";
const LOCALE = "en-US";
const FEEDBACK_EMAIL = "support@skyforest.ai";
const DEMO_EMAIL = "appreview@skyforest.ai";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function makeToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
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
    headers: { Authorization: `Bearer ${makeToken()}`, "Content-Type": "application/json" },
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

// --- Загрузка env из .env.local (несколько кандидатов) ---
function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  const txt = readFileSync(file, "utf8");
  for (const raw of txt.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in out)) out[k] = v;
  }
  return out;
}

function loadEnv() {
  const candidates = [
    resolve(SKY_ROOT, ".env.local"),
    resolve(SKY_ROOT, ".env"),
    resolve(SKY_ROOT, "..", "SkyF", "skyforest", ".env.local"),
  ];
  const merged = {};
  for (const f of candidates) {
    const e = parseEnv(f);
    for (const [k, v] of Object.entries(e)) {
      if (!(k in merged) && v) merged[k] = v;
    }
  }
  return merged;
}

function metaText(rel) {
  const p = resolve(__dirname, "metadata", rel);
  return existsSync(p) ? readFileSync(p, "utf8").trim() : "";
}

function strongPassword() {
  // 24 симв., буквы/цифры + гарантированный спецсимвол
  const base = randomBytes(18).toString("base64").replace(/[+/=]/g, "");
  return `Sky#${base}9`;
}

// ---------- Шаг 1: демо-аккаунт в Supabase ----------
async function createDemoAccount(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, blocked: true, reason: "Не найдены NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env" };
  }
  const password = strongPassword();
  const adminUrl = `${url.replace(/\/$/, "")}/auth/v1/admin/users`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const create = await fetch(adminUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: DEMO_EMAIL, password, email_confirm: true }),
  });
  const createTxt = await create.text();
  let createJson = {};
  try {
    createJson = createTxt ? JSON.parse(createTxt) : {};
  } catch {
    createJson = { raw: createTxt };
  }

  if (create.status === 200 || create.status === 201) {
    return { ok: true, email: DEMO_EMAIL, password, mode: "created", id: createJson.id };
  }

  // Пользователь уже существует — найдём и сбросим пароль.
  const already = create.status === 422 || create.status === 400 || create.status === 409 ||
    /already|registered|exists/i.test(JSON.stringify(createJson));
  if (already) {
    const listRes = await fetch(`${adminUrl}?page=1&per_page=200`, { headers });
    const listJson = await listRes.json().catch(() => ({}));
    const users = listJson.users || listJson || [];
    const found = (Array.isArray(users) ? users : []).find(
      (u) => (u.email || "").toLowerCase() === DEMO_EMAIL.toLowerCase(),
    );
    if (found) {
      const upd = await fetch(`${adminUrl}/${found.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ password, email_confirm: true }),
      });
      if (upd.status === 200) {
        return { ok: true, email: DEMO_EMAIL, password, mode: "reused+password-reset", id: found.id };
      }
      const updTxt = await upd.text();
      return { ok: false, reason: `Пароль не сброшен: ${upd.status} ${updTxt}` };
    }
    return { ok: false, reason: `Уже существует, но не найден в списке. create=${create.status} ${JSON.stringify(createJson)}` };
  }

  return { ok: false, reason: `create=${create.status} ${JSON.stringify(createJson)}` };
}

// ---------- Шаг 2: контакт из EyesTalk ----------
async function getContactFromEyesTalk() {
  const { status, json } = await api(
    "GET",
    `/v1/apps/${EYESTALK_APP}/betaAppReviewDetail`,
  );
  if (status !== 200) throw new Error(`EyesTalk betaAppReviewDetail: ${status} ${errStr(json)}`);
  const a = json.data?.attributes || {};
  return {
    contactFirstName: a.contactFirstName || "",
    contactLastName: a.contactLastName || "",
    contactPhone: a.contactPhone || "",
    contactEmail: a.contactEmail || "",
  };
}

// ---------- Шаг 3a: betaAppLocalizations ----------
async function upsertBetaAppLocalization(description) {
  const { status, json } = await api(
    "GET",
    `/v1/apps/${SKYFOREST_APP}/betaAppLocalizations?limit=50`,
  );
  if (status !== 200) throw new Error(`list betaAppLocalizations: ${status} ${errStr(json)}`);
  const existing = (json.data || []).find((l) => l.attributes?.locale === LOCALE);
  const attrs = { feedbackEmail: FEEDBACK_EMAIL, description };
  if (existing) {
    const r = await api("PATCH", `/v1/betaAppLocalizations/${existing.id}`, {
      data: { type: "betaAppLocalizations", id: existing.id, attributes: attrs },
    });
    if (r.status !== 200) throw new Error(`PATCH betaAppLocalizations: ${r.status} ${errStr(r.json)}`);
    return { mode: "update", id: existing.id };
  }
  const r = await api("POST", `/v1/betaAppLocalizations`, {
    data: {
      type: "betaAppLocalizations",
      attributes: { ...attrs, locale: LOCALE },
      relationships: { app: { data: { type: "apps", id: SKYFOREST_APP } } },
    },
  });
  if (r.status !== 201) throw new Error(`POST betaAppLocalizations: ${r.status} ${errStr(r.json)}`);
  return { mode: "create", id: r.json.data?.id };
}

// ---------- Шаг 3b: betaBuildLocalizations (whatsNew) ----------
async function upsertBetaBuildLocalization(buildId, whatsNew) {
  const { status, json } = await api(
    "GET",
    `/v1/builds/${buildId}/betaBuildLocalizations?limit=50`,
  );
  if (status !== 200) throw new Error(`list betaBuildLocalizations: ${status} ${errStr(json)}`);
  const existing = (json.data || []).find((l) => l.attributes?.locale === LOCALE);
  if (existing) {
    const r = await api("PATCH", `/v1/betaBuildLocalizations/${existing.id}`, {
      data: { type: "betaBuildLocalizations", id: existing.id, attributes: { whatsNew } },
    });
    if (r.status !== 200) throw new Error(`PATCH betaBuildLocalizations: ${r.status} ${errStr(r.json)}`);
    return { mode: "update", id: existing.id };
  }
  const r = await api("POST", `/v1/betaBuildLocalizations`, {
    data: {
      type: "betaBuildLocalizations",
      attributes: { locale: LOCALE, whatsNew },
      relationships: { build: { data: { type: "builds", id: buildId } } },
    },
  });
  if (r.status !== 201) throw new Error(`POST betaBuildLocalizations: ${r.status} ${errStr(r.json)}`);
  return { mode: "create", id: r.json.data?.id };
}

// ---------- Шаг 4: betaAppReviewDetail ----------
async function upsertBetaAppReviewDetail(contact, demo) {
  const { status, json } = await api(
    "GET",
    `/v1/apps/${SKYFOREST_APP}/betaAppReviewDetail`,
  );
  const attrs = {
    contactFirstName: contact.contactFirstName,
    contactLastName: contact.contactLastName,
    contactPhone: contact.contactPhone,
    contactEmail: contact.contactEmail,
    demoAccountName: demo.email,
    demoAccountPassword: demo.password,
    demoAccountRequired: true,
  };
  const existing = status === 200 ? json.data : null;
  if (existing?.id) {
    const r = await api("PATCH", `/v1/betaAppReviewDetails/${existing.id}`, {
      data: { type: "betaAppReviewDetails", id: existing.id, attributes: attrs },
    });
    if (r.status !== 200) throw new Error(`PATCH betaAppReviewDetail: ${r.status} ${errStr(r.json)}`);
    return { mode: "update", id: existing.id };
  }
  const r = await api("POST", `/v1/betaAppReviewDetails`, {
    data: {
      type: "betaAppReviewDetails",
      attributes: attrs,
      relationships: { app: { data: { type: "apps", id: SKYFOREST_APP } } },
    },
  });
  if (r.status !== 201) throw new Error(`POST betaAppReviewDetail: ${r.status} ${errStr(r.json)}`);
  return { mode: "create", id: r.json.data?.id };
}

// ---------- Найти билд: конкретный номер из argv, иначе последний VALID ----------
// Использование: node fastlane/submit-beta.mjs [buildNumber]
async function findBuild() {
  const wanted = process.argv[2]; // напр. "3"; если не задан — берём последний VALID
  const { status, json } = await api(
    "GET",
    `/v1/builds?filter[app]=${SKYFOREST_APP}` +
      `&fields[builds]=version,processingState,expired&include=preReleaseVersion&sort=-uploadedDate&limit=50`,
  );
  if (status !== 200) throw new Error(`list builds: ${status} ${errStr(json)}`);
  const preReleaseById = {};
  for (const inc of json.included || []) {
    if (inc.type === "preReleaseVersions") preReleaseById[inc.id] = inc.attributes?.version;
  }
  const builds = (json.data || []).map((b) => ({
    id: b.id,
    version: b.attributes?.version,
    state: b.attributes?.processingState,
    expired: b.attributes?.expired,
    pre: preReleaseById[b.relationships?.preReleaseVersion?.data?.id],
  }));
  const summary = builds.map((b) => `${b.pre || "?"} (${b.version}) [${b.state}]`).join(", ");
  let match;
  if (wanted) {
    match =
      builds.find((b) => b.version === wanted && b.state === "VALID" && !b.expired) ||
      builds.find((b) => b.version === wanted);
  } else {
    match = builds.find((b) => b.state === "VALID" && !b.expired) || builds[0];
  }
  return { match, summary, builds };
}

// ---------- Шаг 5: отправка на Beta App Review ----------
async function submitForReview(buildId) {
  const r = await api("POST", `/v1/betaAppReviewSubmissions`, {
    data: {
      type: "betaAppReviewSubmissions",
      relationships: { build: { data: { type: "builds", id: buildId } } },
    },
  });
  return r;
}

async function main() {
  const report = {};
  const env = loadEnv();

  console.log("=== 1. Демо-аккаунт (Supabase) ===");
  const demo = await createDemoAccount(env);
  report.demo = demo;
  if (demo.ok) console.log(`  ✓ ${demo.mode}: ${demo.email} / ${demo.password}`);
  else console.log(`  ✗ ${demo.reason}`);

  if (!demo.ok) {
    console.log("\nДемо-аккаунт не создан, а логин обязателен → НЕ отправляю на ревью. Завершение.");
    console.log("\n===== JSON =====\n" + JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log("\n=== 2. Контакт из EyesTalk ===");
  const contact = await getContactFromEyesTalk();
  report.contact = contact;
  console.log(`  ${contact.contactFirstName} ${contact.contactLastName} | ${contact.contactEmail} | ${contact.contactPhone}`);

  const wantedBuild = process.argv[2];
  console.log(`\n=== Поиск билда ${wantedBuild ? `(${wantedBuild})` : "(последний VALID)"} ===`);
  const { match, summary } = await findBuild();
  report.builds = summary;
  console.log(`  Билды: ${summary}`);
  if (!match) throw new Error(`Не найден подходящий билд${wantedBuild ? ` (${wantedBuild})` : ""}.`);
  console.log(`  Выбран билд id=${match.id} pre=${match.pre} build=${match.version} state=${match.state}`);

  console.log("\n=== 3a. betaAppLocalizations ===");
  const description = metaText("en-US/description.txt");
  const loc = await upsertBetaAppLocalization(description);
  report.betaAppLocalization = { ...loc, feedbackEmail: FEEDBACK_EMAIL };
  console.log(`  ${loc.mode} id=${loc.id} feedbackEmail=${FEEDBACK_EMAIL}`);

  console.log("\n=== 3b. betaBuildLocalizations (whatsNew) ===");
  const whatsNew = metaText("en-US/release_notes.txt");
  const bloc = await upsertBetaBuildLocalization(match.id, whatsNew);
  report.betaBuildLocalization = { ...bloc, whatsNew };
  console.log(`  ${bloc.mode} id=${bloc.id}`);

  console.log("\n=== 4. betaAppReviewDetail ===");
  const detail = await upsertBetaAppReviewDetail(contact, demo);
  report.betaAppReviewDetail = detail;
  console.log(`  ${detail.mode} id=${detail.id} demoAccountRequired=true`);

  console.log("\n=== 5. Отправка на Beta App Review ===");
  const sub = await submitForReview(match.id);
  if (sub.status === 201) {
    const state = sub.json.data?.attributes?.betaReviewState;
    report.submission = { ok: true, id: sub.json.data?.id, state };
    console.log(`  ✓ Отправлено. id=${sub.json.data?.id} state=${state}`);
  } else {
    report.submission = { ok: false, status: sub.status, error: errStr(sub.json) };
    console.log(`  ✗ Ошибка отправки: ${sub.status} ${errStr(sub.json)}`);
  }

  console.log("\n===== JSON =====\n" + JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error("ФАТАЛЬНО:", e.message);
  process.exit(1);
});
