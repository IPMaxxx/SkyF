#!/usr/bin/env node
/**
 * Листинги WayBack (локаль en-US) в App Store Connect и Google Play из файлов
 * `fastlane/metadata/wayback/**` — чтобы тексты жили в репозитории, а не только
 * в веб-консолях.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/wayback-listings.mjs            — показать, что в сторах сейчас
 *   node fastlane/wayback-listings.mjs --apply    — записать и перечитать
 *   … --apply --play-only                         — только Google Play
 *
 * `--play-only` нужен, когда версия в App Store уже ушла на ревью: в состоянии
 * WAITING_FOR_REVIEW Apple отвечает на PATCH локализации 409 STATE_ERROR, и
 * из-за этого не должна стоять работа по Play.
 *
 * Аутентификация та же, что в соседних скриптах: для ASC — JWT ES256 с
 * `aud: appstoreconnect-v1` (App Store Server API здесь не при чём, он отвечает
 * 401 и это нормально), для Play — сервисный аккаунт из
 * `play-service-account.json`.
 *
 * Чего скрипт не делает и не может: ссылку на политику конфиденциальности для
 * Play (раздел App content) в Android Publisher API v3 выставить нельзя, это
 * ручной шаг в консоли.
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const PLAY_ONLY = process.argv.includes("--play-only");

const HERE = new URL("./", import.meta.url);
const META = new URL("./metadata/wayback/", HERE);
const read = (rel) => readFileSync(new URL(rel, META), "utf8").trim();

const BUNDLE = "ai.skyforest.wayback";
const PKG = "ai.skyforest.wayback";
const LOCALE = "en-US";

/** Лимиты сторов — проверяем до сети, чтобы не ловить 400 на длине. */
const TEXTS = {
  subtitle: { value: read("en-US/subtitle.txt"), limit: 30 },
  keywords: { value: read("en-US/keywords.txt"), limit: 100 },
  promotionalText: { value: read("en-US/promotional_text.txt"), limit: 170 },
  description: { value: read("en-US/description.txt"), limit: 4000 },
  whatsNew: { value: read("en-US/release_notes.txt"), limit: 4000 },
  supportUrl: { value: read("en-US/support_url.txt"), limit: 255 },
  marketingUrl: { value: read("en-US/marketing_url.txt"), limit: 255 },
  privacyPolicyUrl: { value: read("en-US/privacy_url.txt"), limit: 255 },
  title: { value: read("android/en-US/title.txt"), limit: 30 },
  shortDescription: {
    value: read("android/en-US/short_description.txt"),
    limit: 80,
  },
  fullDescription: {
    value: read("android/en-US/full_description.txt"),
    limit: 4000,
  },
};

let tooLong = false;
for (const [key, { value, limit }] of Object.entries(TEXTS)) {
  const len = [...value].length;
  const bad = len > limit;
  if (bad) tooLong = true;
  console.log(`${bad ? "ДЛИННО" : "ok"}  ${key}: ${len} / ${limit}`);
  if (/[А-Яа-яЁё]/.test(value)) {
    tooLong = true;
    console.log(`КИРИЛЛИЦА в ${key} — листинг en-US должен быть английским`);
  }
}
if (tooLong) process.exit(1);

/* ------------------------------- App Store ------------------------------- */

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

console.log("\n===== APP STORE CONNECT =====");
const apps = await asc("GET", `/v1/apps?filter[bundleId]=${BUNDLE}`);
const app = apps.data?.[0];
if (!app) throw new Error(`нет приложения ${BUNDLE} в ASC`);
console.log(`приложение ${app.attributes.name} (id=${app.id})`);

const infos = await asc("GET", `/v1/apps/${app.id}/appInfos`);
const info = infos.data.find((i) => i.attributes.state === "PREPARE_FOR_SUBMISSION") || infos.data[0];
const infoLocs = await asc("GET", `/v1/appInfos/${info.id}/appInfoLocalizations`);
const infoLoc = infoLocs.data.find((l) => l.attributes.locale === LOCALE);
if (!infoLoc) throw new Error(`нет локали ${LOCALE} в appInfo ${info.id}`);

const versions = await asc("GET", `/v1/apps/${app.id}/appStoreVersions?limit=5`);
const version =
  versions.data.find((v) => (v.attributes.appVersionState || v.attributes.appStoreState) === "PREPARE_FOR_SUBMISSION") ||
  versions.data[0];
console.log(`версия ${version.attributes.versionString} [${version.attributes.appVersionState || version.attributes.appStoreState}]`);
const verLocs = await asc("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
const verLoc = verLocs.data.find((l) => l.attributes.locale === LOCALE);
if (!verLoc) throw new Error(`нет локали ${LOCALE} у версии ${version.id}`);

const brief = (v) => (v == null ? "(пусто)" : `${[...String(v)].length} симв.`);
console.log(`  subtitle: ${brief(infoLoc.attributes.subtitle)}`);
console.log(`  privacyPolicyUrl: ${infoLoc.attributes.privacyPolicyUrl ?? "(пусто)"}`);
for (const k of ["description", "keywords", "promotionalText", "whatsNew"]) {
  console.log(`  ${k}: ${brief(verLoc.attributes[k])}`);
}
console.log(`  supportUrl: ${verLoc.attributes.supportUrl ?? "(пусто)"}`);
console.log(`  marketingUrl: ${verLoc.attributes.marketingUrl ?? "(пусто)"}`);

if (APPLY && PLAY_ONLY) {
  console.log("  (--play-only: в App Store ничего не пишу)");
}
if (APPLY && !PLAY_ONLY) {
  await asc("PATCH", `/v1/appInfoLocalizations/${infoLoc.id}`, {
    data: {
      type: "appInfoLocalizations",
      id: infoLoc.id,
      attributes: {
        subtitle: TEXTS.subtitle.value,
        privacyPolicyUrl: TEXTS.privacyPolicyUrl.value,
      },
    },
  });
  console.log("записал subtitle + privacyPolicyUrl");

  const verAttrs = {
    description: TEXTS.description.value,
    keywords: TEXTS.keywords.value,
    promotionalText: TEXTS.promotionalText.value,
    supportUrl: TEXTS.supportUrl.value,
    marketingUrl: TEXTS.marketingUrl.value,
    whatsNew: TEXTS.whatsNew.value,
  };
  try {
    await asc("PATCH", `/v1/appStoreVersionLocalizations/${verLoc.id}`, {
      data: { type: "appStoreVersionLocalizations", id: verLoc.id, attributes: verAttrs },
    });
    console.log("записал description/keywords/promotionalText/whatsNew/URL");
  } catch (e) {
    // Для первой версии Apple обычно не принимает whatsNew — тогда пишем без него.
    console.log(`с whatsNew не прошло: ${String(e).slice(0, 200)}`);
    delete verAttrs.whatsNew;
    await asc("PATCH", `/v1/appStoreVersionLocalizations/${verLoc.id}`, {
      data: { type: "appStoreVersionLocalizations", id: verLoc.id, attributes: verAttrs },
    });
    console.log("записал без whatsNew (для версии 1.0 поле недоступно)");
  }
}

/* ------------------------------ Google Play ------------------------------ */

const sa = JSON.parse(readFileSync(new URL("./play-service-account.json", HERE), "utf8"));
const b64urlObj = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

async function playToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlObj({ alg: "RS256", typ: "JWT" });
  const claims = b64urlObj({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const PLAY = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const token = await playToken();
async function play(method, path, body) {
  const res = await fetch(`${PLAY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${String(text).slice(0, 500)}`);
  return data;
}

console.log("\n===== GOOGLE PLAY =====");
const edit = await play("POST", "/edits", {});
try {
  const listings = await play("GET", `/edits/${edit.id}/listings`);
  const current = (listings.listings || []).find((l) => l.language === LOCALE) || {};
  console.log(`  title: ${current.title ?? "(пусто)"}`);
  console.log(`  shortDescription: ${brief(current.shortDescription)}`);
  console.log(`  fullDescription: ${brief(current.fullDescription)}`);
  const graphic = await play("GET", `/edits/${edit.id}/listings/${LOCALE}/featureGraphic`);
  console.log(`  featureGraphic: ${(graphic.images || []).length} шт.`);

  if (APPLY) {
    await play("PUT", `/edits/${edit.id}/listings/${LOCALE}`, {
      ...current,
      language: LOCALE,
      title: TEXTS.title.value,
      shortDescription: TEXTS.shortDescription.value,
      fullDescription: TEXTS.fullDescription.value,
    });
    const details = await play("GET", `/edits/${edit.id}/details`);
    await play("PUT", `/edits/${edit.id}/details`, {
      ...details,
      contactEmail: "support@skyforest.ai",
      contactWebsite: "https://wayback.skyforest.ai",
    });
    // Release notes в Play живут не в листинге, а у релиза в треке. Текст из
    // файла перезаписывает то, что лежит у релиза: устаревшие заметки — такое
    // же расхождение с приложением, как устаревшее описание. При повышении
    // релиза до production Play переносит заметки вместе с ним.
    const tracks = await play("GET", `/edits/${edit.id}/tracks`);
    for (const track of tracks.tracks || []) {
      const releases = track.releases || [];
      if (!releases.length) continue;
      let changed = false;
      const next = releases.map((rel) => {
        const notes = rel.releaseNotes || [];
        const mine = notes.find((n) => n.language === LOCALE);
        if (mine?.text === TEXTS.whatsNew.value) return rel;
        changed = true;
        return {
          ...rel,
          releaseNotes: [
            ...notes.filter((n) => n.language !== LOCALE),
            { language: LOCALE, text: TEXTS.whatsNew.value },
          ],
        };
      });
      if (!changed) continue;
      await play("PUT", `/edits/${edit.id}/tracks/${track.track}`, {
        track: track.track,
        releases: next,
      });
      console.log(`записал release notes в трек ${track.track}`);
    }

    const committed = await play("POST", `/edits/${edit.id}:commit`, {});
    console.log(`закоммитил edit ${committed.id}`);
  } else {
    await play("DELETE", `/edits/${edit.id}`);
    console.log("(сухой прогон — запустите с --apply)");
  }
} catch (e) {
  try {
    await play("DELETE", `/edits/${edit.id}`);
  } catch {}
  throw e;
}

/* ------------------------------- Перечитать ------------------------------ */

if (!APPLY) process.exit(0);

console.log("\n===== ПЕРЕЧИТЫВАЮ ИЗ API =====");
let mismatch = false;
const cmp = (label, got, want) => {
  const ok = (got ?? "") === want;
  if (!ok) mismatch = true;
  console.log(`${ok ? "OK  " : "РАЗЪЕХАЛОСЬ "} ${label}: ${ok ? `${[...String(got ?? "")].length} симв.` : `в сторе ${JSON.stringify(String(got ?? "").slice(0, 80))}`}`);
};

if (!PLAY_ONLY) {
  const infoLoc2 = await asc("GET", `/v1/appInfoLocalizations/${infoLoc.id}`);
  cmp("ASC subtitle", infoLoc2.data.attributes.subtitle, TEXTS.subtitle.value);
  cmp("ASC privacyPolicyUrl", infoLoc2.data.attributes.privacyPolicyUrl, TEXTS.privacyPolicyUrl.value);

  const verLoc2 = await asc("GET", `/v1/appStoreVersionLocalizations/${verLoc.id}`);
  const a = verLoc2.data.attributes;
  cmp("ASC description", a.description, TEXTS.description.value);
  cmp("ASC keywords", a.keywords, TEXTS.keywords.value);
  cmp("ASC promotionalText", a.promotionalText, TEXTS.promotionalText.value);
  if (a.whatsNew) {
    cmp("ASC whatsNew", a.whatsNew, TEXTS.whatsNew.value);
  } else {
    // У первой версии в App Store раздела «What's New» нет: API отвечает 409
    // STATE_ERROR «Attribute 'whatsNew' cannot be edited at this time».
    console.log("     ASC whatsNew: недоступно у первой версии — так и должно быть");
  }
  cmp("ASC supportUrl", a.supportUrl, TEXTS.supportUrl.value);
  cmp("ASC marketingUrl", a.marketingUrl, TEXTS.marketingUrl.value);
}

const check = await play("POST", "/edits", {});
try {
  const listings = await play("GET", `/edits/${check.id}/listings`);
  const l = (listings.listings || []).find((x) => x.language === LOCALE) || {};
  cmp("Play title", l.title, TEXTS.title.value);
  cmp("Play shortDescription", l.shortDescription, TEXTS.shortDescription.value);
  cmp("Play fullDescription", l.fullDescription, TEXTS.fullDescription.value);
  const graphic = await play("GET", `/edits/${check.id}/listings/${LOCALE}/featureGraphic`);
  const count = (graphic.images || []).length;
  if (count !== 1) mismatch = true;
  console.log(`${count === 1 ? "OK  " : "НЕТ "} Play featureGraphic: ${count} шт.`);
  const details = await play("GET", `/edits/${check.id}/details`);
  console.log(`     Play contact: ${details.contactEmail || "-"} / ${details.contactWebsite || "-"}`);
  const tracks = await play("GET", `/edits/${check.id}/tracks`);
  for (const track of tracks.tracks || []) {
    for (const rel of track.releases || []) {
      const note = (rel.releaseNotes || []).find((n) => n.language === LOCALE);
      cmp(`Play release notes (${track.track} ${rel.name})`, note?.text, TEXTS.whatsNew.value);
    }
  }
} finally {
  try {
    await play("DELETE", `/edits/${check.id}`);
  } catch {}
}

console.log(
  mismatch
    ? "\nЕСТЬ РАСХОЖДЕНИЯ — смотрите строки выше"
    : "\nвсё сошлось: в сторах лежит то же, что в файлах",
);
process.exit(mismatch ? 1 : 0);
