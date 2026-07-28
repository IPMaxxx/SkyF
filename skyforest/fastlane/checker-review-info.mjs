#!/usr/bin/env node
/**
 * App Review Information версии Mushroom Checker в App Store Connect:
 * демо-аккаунт, контакт и заметки ревьюеру (`appStoreReviewDetails`).
 *
 * Зачем демо-аккаунт: распознавание закрыто подпиской, а сама съёмка идёт на
 * сервер. Без входа ревьюер увидит только экран авторизации и пейволл, то есть
 * не проверит основной сценарий вовсе. У учётки {email} уже есть активное
 * право Premium на нашей стороне, поэтому покупка ревьюеру не нужна;
 * sandbox-покупка описана в заметках как запасной путь.
 *
 * Текст заметок — `fastlane/metadata/checker/review-notes.txt`, почта и пароль
 * подставляются в него из констант ниже (или из переменных окружения
 * `CK_REVIEW_EMAIL` / `CK_REVIEW_PASSWORD`), чтобы пароль лежал в одном месте.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/checker-review-info.mjs           — показать, что сейчас в ASC
 *   node fastlane/checker-review-info.mjs --apply   — записать и перечитать
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const APPLY = process.argv.includes("--apply");

const HERE = new URL("./", import.meta.url);
const BUNDLE = "ai.skyforest.mushroomchecker";

/**
 * Демо-аккаунт ревью — общий для всех приложений SkyForest. Учётная запись
 * разрешена в серверной проверке чеков (`REVIEW_SANDBOX_EMAILS` в
 * src/app/api/native/iap/verify-subscription), поэтому sandbox-покупка
 * ревьюера принимается и в продакшене.
 */
const DEMO_EMAIL = process.env.CK_REVIEW_EMAIL || "appreview@skyforest.ai";
const DEMO_PASSWORD =
  process.env.CK_REVIEW_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

/** Контакт для ревью — тот же, что у остальных приложений SkyForest. */
const CONTACT = {
  contactFirstName: "Maksim",
  contactLastName: "Harbatsevich",
  contactPhone: "+48881049959",
  contactEmail: "hmakspt@gmail.com",
};

const NOTES = readFileSync(new URL("./metadata/checker/review-notes.txt", HERE), "utf8")
  .trim()
  .replaceAll("{email}", DEMO_EMAIL)
  .replaceAll("{password}", DEMO_PASSWORD);

if (/[А-Яа-яЁё]/.test(NOTES)) {
  console.error("КИРИЛЛИЦА в заметках — ревьюер читает по-английски");
  process.exit(1);
}
console.log(`заметки: ${[...NOTES].length} симв.`);

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8 = readFileSync(new URL("./AuthKey_TRS8NZAGX5.p8", HERE), "utf8");
const ASC = "https://api.appstoreconnect.apple.com";
const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function ascToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(input);
  return `${input}.${b64url(signer.sign({ key: P8, dsaEncoding: "ieee-p1363" }))}`;
}

async function asc(method, path, body) {
  const res = await fetch(`${ASC}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ascToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
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
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  return json;
}

const apps = await asc("GET", `/v1/apps?filter[bundleId]=${BUNDLE}`);
const app = apps.data?.[0];
if (!app) throw new Error(`нет приложения ${BUNDLE} в ASC`);
console.log(`приложение ${app.attributes.name} (id=${app.id})`);

const versions = await asc("GET", `/v1/apps/${app.id}/appStoreVersions?limit=5`);
const version =
  versions.data.find(
    (v) => (v.attributes.appVersionState || v.attributes.appStoreState) === "PREPARE_FOR_SUBMISSION",
  ) || versions.data[0];
const state = version.attributes.appVersionState || version.attributes.appStoreState;
console.log(`версия ${version.attributes.versionString} [${state}]`);

const existing = await asc("GET", `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`);
const detail = existing.data;
const show = (a) => {
  console.log(`  contact: ${a.contactFirstName ?? "-"} ${a.contactLastName ?? "-"} | ${a.contactEmail ?? "-"} | ${a.contactPhone ?? "-"}`);
  console.log(`  demoAccountRequired: ${a.demoAccountRequired}`);
  console.log(`  demoAccountName: ${a.demoAccountName ?? "(пусто)"}`);
  console.log(`  demoAccountPassword: ${a.demoAccountPassword ? "задан" : "(пусто)"}`);
  console.log(`  notes: ${a.notes == null ? "(пусто)" : `${[...a.notes].length} симв.`}`);
};
if (detail) {
  console.log(`appStoreReviewDetail ${detail.id} — что там сейчас:`);
  show(detail.attributes);
} else {
  console.log("appStoreReviewDetail ещё нет — будет создан");
}

const attributes = {
  ...CONTACT,
  demoAccountName: DEMO_EMAIL,
  demoAccountPassword: DEMO_PASSWORD,
  demoAccountRequired: true,
  notes: NOTES,
};

if (!APPLY) {
  console.log("\n(сухой прогон — запустите с --apply)");
  process.exit(0);
}

let id = detail?.id;
if (id) {
  await asc("PATCH", `/v1/appStoreReviewDetails/${id}`, {
    data: { type: "appStoreReviewDetails", id, attributes },
  });
  console.log("обновил appStoreReviewDetail");
} else {
  const created = await asc("POST", "/v1/appStoreReviewDetails", {
    data: {
      type: "appStoreReviewDetails",
      attributes,
      relationships: {
        appStoreVersion: { data: { type: "appStoreVersions", id: version.id } },
      },
    },
  });
  id = created.data.id;
  console.log(`создал appStoreReviewDetail ${id}`);
}

console.log("\n===== ПЕРЕЧИТЫВАЮ ИЗ API =====");
let mismatch = false;
// Каждое поле — отдельный запрос: так видно, что значение действительно лежит
// в ASC, а не осталось в ответе на запись.
for (const [field, want] of Object.entries(attributes)) {
  const r = await asc("GET", `/v1/appStoreReviewDetails/${id}?fields[appStoreReviewDetails]=${field}`);
  const got = r.data.attributes[field];
  const ok = got === want;
  if (!ok) mismatch = true;
  console.log(
    `${ok ? "OK  " : "РАЗЪЕХАЛОСЬ "} ${field}: ${
      typeof got === "string" ? `${[...got].length} симв.` : String(got)
    }`,
  );
}
console.log(
  mismatch
    ? "\nЕСТЬ РАСХОЖДЕНИЯ — смотрите строки выше"
    : "\nвсё сошлось: в App Store Connect лежит то же, что в файлах",
);
process.exit(mismatch ? 1 : 0);
