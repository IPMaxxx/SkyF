#!/usr/bin/env node
/**
 * Листинги WayBack в App Store Connect и Google Play из файлов
 * `fastlane/metadata/wayback/**` — чтобы тексты жили в репозитории, а не только
 * в веб-консолях.
 *
 * Языков четыре: английский, испанский, польский и французский. Приложение
 * переведено на них целиком (src/flavors/wayback/config.ts), и карточка обязана
 * говорить на том же языке, что и первый экран, — иначе человек ставит
 * приложение по английскому описанию и открывает испанский интерфейс.
 *
 * Локали площадок называются по-разному: в App Store польский — `pl`, в Google
 * Play — `pl-PL`. Соответствие живёт в LOCALES, и придумывать его на месте
 * нельзя: Play на неизвестный код отвечает 400, а ASC молча ничего не находит.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/wayback-listings.mjs            — показать, что в сторах сейчас
 *   node fastlane/wayback-listings.mjs --apply    — записать и перечитать
 *   … --apply --play-only                         — только Google Play
 *   … --only=es-ES                                — один язык (код App Store)
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
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

const HERE = new URL("./", import.meta.url);
const META = new URL("./metadata/wayback/", HERE);
const read = (rel) => readFileSync(new URL(rel, META), "utf8").trim();

const BUNDLE = "ai.skyforest.wayback";
const PKG = "ai.skyforest.wayback";

/**
 * Языки карточки: код App Store, код Google Play и каталог с текстами.
 * Каталог назван по коду App Store — их всего один набор файлов на оба стора.
 */
const ALL_LOCALES = [
  { asc: "en-US", play: "en-US" },
  { asc: "es-ES", play: "es-ES" },
  { asc: "pl", play: "pl-PL" },
  { asc: "fr-FR", play: "fr-FR" },
];
const LOCALES = ONLY ? ALL_LOCALES.filter((l) => l.asc === ONLY) : ALL_LOCALES;
if (!LOCALES.length) {
  console.error(`--only=${ONLY}: такого языка нет. Есть: ${ALL_LOCALES.map((l) => l.asc).join(", ")}`);
  process.exit(2);
}

/** Лимиты сторов — проверяем до сети, чтобы не ловить 400 на длине. */
function textsFor({ asc: locale, play }) {
  return {
    subtitle: { value: read(`${locale}/subtitle.txt`), limit: 30 },
    keywords: { value: read(`${locale}/keywords.txt`), limit: 100 },
    promotionalText: { value: read(`${locale}/promotional_text.txt`), limit: 170 },
    description: { value: read(`${locale}/description.txt`), limit: 4000 },
    // App Store даёт 4000, но тот же файл едет в release notes Google Play, где
    // потолок 500 и коммит edit'а падает 403 уже после записи листинга.
    whatsNew: { value: read(`${locale}/release_notes.txt`), limit: 500 },
    supportUrl: { value: read(`${locale}/support_url.txt`), limit: 255 },
    marketingUrl: { value: read(`${locale}/marketing_url.txt`), limit: 255 },
    privacyPolicyUrl: { value: read(`${locale}/privacy_url.txt`), limit: 255 },
    title: { value: read(`android/${play}/title.txt`), limit: 30 },
    shortDescription: { value: read(`android/${play}/short_description.txt`), limit: 80 },
    fullDescription: { value: read(`android/${play}/full_description.txt`), limit: 4000 },
  };
}

const TEXTS = new Map(LOCALES.map((loc) => [loc.asc, textsFor(loc)]));

let tooLong = false;
for (const loc of LOCALES) {
  console.log(`\n— ${loc.asc} —`);
  for (const [key, { value, limit }] of Object.entries(TEXTS.get(loc.asc))) {
    const len = [...value].length;
    const bad = len > limit;
    if (bad) tooLong = true;
    console.log(`${bad ? "ДЛИННО" : "ok"}  ${key}: ${len} / ${limit}`);
    // Ни один из четырёх языков не пишется кириллицей: буква оттуда — это
    // забытый русский текст, скопированный из соседнего словаря.
    if (/[А-Яа-яЁё]/.test(value)) {
      tooLong = true;
      console.log(`КИРИЛЛИЦА в ${loc.asc}/${key}`);
    }
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
const infoLocs = await asc("GET", `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`);

const versions = await asc("GET", `/v1/apps/${app.id}/appStoreVersions?limit=5`);
const version =
  versions.data.find((v) => (v.attributes.appVersionState || v.attributes.appStoreState) === "PREPARE_FOR_SUBMISSION") ||
  versions.data[0];
const versionState = version.attributes.appVersionState || version.attributes.appStoreState;
console.log(`версия ${version.attributes.versionString} [${versionState}]`);
const verLocs = await asc("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`);

/**
 * Состояния, в которых Apple разрешает править метаданные версии. В остальных
 * (`READY_FOR_DISTRIBUTION` у вышедшей версии, `WAITING_FOR_REVIEW` у поданной)
 * и PATCH, и POST локализации отвечают 409 STATE_ERROR. Новый язык в такой
 * ситуации добавить нельзя ничем, кроме следующей версии с бинарником, —
 * скрипт это говорит вслух и не делает вид, что записал.
 */
const EDITABLE = new Set([
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
]);
const versionEditable = EDITABLE.has(versionState);

const brief = (v) => (v == null ? "(пусто)" : `${[...String(v)].length} симв.`);

const ascPlan = [];
for (const loc of LOCALES) {
  const infoLoc = infoLocs.data.find((l) => l.attributes.locale === loc.asc);
  const verLoc = verLocs.data.find((l) => l.attributes.locale === loc.asc);
  ascPlan.push({ loc, infoLoc, verLoc });
  console.log(`\n  [${loc.asc}] ${verLoc ? "локализация есть" : "локализации НЕТ"}`);
  if (infoLoc) {
    console.log(`    subtitle: ${brief(infoLoc.attributes.subtitle)}`);
    console.log(`    privacyPolicyUrl: ${infoLoc.attributes.privacyPolicyUrl ?? "(пусто)"}`);
  }
  if (verLoc) {
    for (const k of ["description", "keywords", "promotionalText", "whatsNew"]) {
      console.log(`    ${k}: ${brief(verLoc.attributes[k])}`);
    }
    console.log(`    supportUrl: ${verLoc.attributes.supportUrl ?? "(пусто)"}`);
    console.log(`    marketingUrl: ${verLoc.attributes.marketingUrl ?? "(пусто)"}`);
  }
}

const ascMissing = ascPlan.filter((p) => !p.verLoc).map((p) => p.loc.asc);
if (ascMissing.length && !versionEditable) {
  console.log(
    `\n  ВНИМАНИЕ: языков ${ascMissing.join(", ")} у версии нет, а версия в состоянии` +
      ` ${versionState} — Apple не примет ни PATCH, ни POST локализации.` +
      "\n  Добавить их можно только следующей версией: она заводится вместе со" +
      "\n  сборкой и уходит на ревью. Тексты лежат в metadata/wayback/<локаль>/ и" +
      "\n  ждут; заливка в Google Play от этого не зависит (--play-only).",
  );
}

if (APPLY && PLAY_ONLY) {
  console.log("  (--play-only: в App Store ничего не пишу)");
}
if (APPLY && !PLAY_ONLY) {
  for (const { loc, infoLoc, verLoc } of ascPlan) {
    const texts = TEXTS.get(loc.asc);
    if (!verLoc && !versionEditable) {
      console.log(`  [${loc.asc}] пропускаю: версия ${versionState} новых языков не принимает`);
      continue;
    }

    if (infoLoc) {
      await asc("PATCH", `/v1/appInfoLocalizations/${infoLoc.id}`, {
        data: {
          type: "appInfoLocalizations",
          id: infoLoc.id,
          attributes: {
            subtitle: texts.subtitle.value,
            privacyPolicyUrl: texts.privacyPolicyUrl.value,
          },
        },
      });
      console.log(`  [${loc.asc}] записал subtitle + privacyPolicyUrl`);
    } else {
      await asc("POST", "/v1/appInfoLocalizations", {
        data: {
          type: "appInfoLocalizations",
          attributes: {
            locale: loc.asc,
            subtitle: texts.subtitle.value,
            privacyPolicyUrl: texts.privacyPolicyUrl.value,
          },
          relationships: { appInfo: { data: { type: "appInfos", id: info.id } } },
        },
      });
      console.log(`  [${loc.asc}] завёл локализацию App Information`);
    }

    const verAttrs = {
      description: texts.description.value,
      keywords: texts.keywords.value,
      promotionalText: texts.promotionalText.value,
      supportUrl: texts.supportUrl.value,
      marketingUrl: texts.marketingUrl.value,
      whatsNew: texts.whatsNew.value,
    };
    const write = async (attrs) =>
      verLoc
        ? asc("PATCH", `/v1/appStoreVersionLocalizations/${verLoc.id}`, {
            data: { type: "appStoreVersionLocalizations", id: verLoc.id, attributes: attrs },
          })
        : asc("POST", "/v1/appStoreVersionLocalizations", {
            data: {
              type: "appStoreVersionLocalizations",
              attributes: { locale: loc.asc, ...attrs },
              relationships: {
                appStoreVersion: { data: { type: "appStoreVersions", id: version.id } },
              },
            },
          });
    try {
      await write(verAttrs);
      console.log(`  [${loc.asc}] записал description/keywords/promotionalText/whatsNew/URL`);
    } catch (e) {
      // Для первой версии Apple обычно не принимает whatsNew — тогда пишем без него.
      console.log(`  [${loc.asc}] с whatsNew не прошло: ${String(e).slice(0, 200)}`);
      delete verAttrs.whatsNew;
      await write(verAttrs);
      console.log(`  [${loc.asc}] записал без whatsNew (у первой версии поля нет)`);
    }
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
  for (const loc of LOCALES) {
    const current = (listings.listings || []).find((l) => l.language === loc.play) || {};
    console.log(`\n  [${loc.play}] ${current.title ? "листинг есть" : "листинга НЕТ"}`);
    console.log(`    title: ${current.title ?? "(пусто)"}`);
    console.log(`    shortDescription: ${brief(current.shortDescription)}`);
    console.log(`    fullDescription: ${brief(current.fullDescription)}`);
  }
  // Графика листинга общая на все языки: скриншоты и feature graphic остаются
  // английскими намеренно — переснимать их на четырёх языках значит держать
  // четыре набора картинок в актуальном состоянии при каждой правке экрана.
  const graphic = await play("GET", `/edits/${edit.id}/listings/en-US/featureGraphic`);
  console.log(`\n  featureGraphic (en-US): ${(graphic.images || []).length} шт.`);

  if (APPLY) {
    for (const loc of LOCALES) {
      const current = (listings.listings || []).find((l) => l.language === loc.play) || {};
      const texts = TEXTS.get(loc.asc);
      await play("PUT", `/edits/${edit.id}/listings/${loc.play}`, {
        ...current,
        language: loc.play,
        title: texts.title.value,
        shortDescription: texts.shortDescription.value,
        fullDescription: texts.fullDescription.value,
      });
      console.log(`  [${loc.play}] записал листинг`);
    }
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
        const mine = LOCALES.map((loc) => ({
          language: loc.play,
          text: TEXTS.get(loc.asc).whatsNew.value,
        }));
        const same = mine.every(
          (n) => notes.find((x) => x.language === n.language)?.text === n.text,
        );
        if (same) return rel;
        changed = true;
        return {
          ...rel,
          releaseNotes: [
            ...notes.filter((n) => !mine.some((m) => m.language === n.language)),
            ...mine,
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
  // Перечитываем список заново: локализации, заведённые выше, в старом ответе
  // ещё не значатся.
  const infoLocs2 = await asc("GET", `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`);
  const verLocs2 = await asc(
    "GET",
    `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`,
  );

  for (const loc of LOCALES) {
    const texts = TEXTS.get(loc.asc);
    const infoLoc2 = infoLocs2.data.find((l) => l.attributes.locale === loc.asc);
    const verLoc2 = verLocs2.data.find((l) => l.attributes.locale === loc.asc);
    if (!verLoc2) {
      console.log(`     ASC [${loc.asc}]: локализации нет (версия ${versionState})`);
      continue;
    }
    if (infoLoc2) {
      cmp(`ASC [${loc.asc}] subtitle`, infoLoc2.attributes.subtitle, texts.subtitle.value);
      cmp(
        `ASC [${loc.asc}] privacyPolicyUrl`,
        infoLoc2.attributes.privacyPolicyUrl,
        texts.privacyPolicyUrl.value,
      );
    }
    const a = verLoc2.attributes;
    cmp(`ASC [${loc.asc}] description`, a.description, texts.description.value);
    cmp(`ASC [${loc.asc}] keywords`, a.keywords, texts.keywords.value);
    cmp(`ASC [${loc.asc}] promotionalText`, a.promotionalText, texts.promotionalText.value);
    if (a.whatsNew) {
      cmp(`ASC [${loc.asc}] whatsNew`, a.whatsNew, texts.whatsNew.value);
    } else {
      // У первой версии в App Store раздела «What's New» нет: API отвечает 409
      // STATE_ERROR «Attribute 'whatsNew' cannot be edited at this time».
      console.log(`     ASC [${loc.asc}] whatsNew: недоступно у первой версии`);
    }
    cmp(`ASC [${loc.asc}] supportUrl`, a.supportUrl, texts.supportUrl.value);
    cmp(`ASC [${loc.asc}] marketingUrl`, a.marketingUrl, texts.marketingUrl.value);
  }
}

const check = await play("POST", "/edits", {});
try {
  const listings = await play("GET", `/edits/${check.id}/listings`);
  for (const loc of LOCALES) {
    const texts = TEXTS.get(loc.asc);
    const l = (listings.listings || []).find((x) => x.language === loc.play) || {};
    cmp(`Play [${loc.play}] title`, l.title, texts.title.value);
    cmp(`Play [${loc.play}] shortDescription`, l.shortDescription, texts.shortDescription.value);
    cmp(`Play [${loc.play}] fullDescription`, l.fullDescription, texts.fullDescription.value);
  }
  const graphic = await play("GET", `/edits/${check.id}/listings/en-US/featureGraphic`);
  const count = (graphic.images || []).length;
  if (count !== 1) mismatch = true;
  console.log(`${count === 1 ? "OK  " : "НЕТ "} Play featureGraphic (en-US): ${count} шт.`);
  const details = await play("GET", `/edits/${check.id}/details`);
  console.log(`     Play contact: ${details.contactEmail || "-"} / ${details.contactWebsite || "-"}`);
  const tracks = await play("GET", `/edits/${check.id}/tracks`);
  for (const track of tracks.tracks || []) {
    for (const rel of track.releases || []) {
      for (const loc of LOCALES) {
        const note = (rel.releaseNotes || []).find((n) => n.language === loc.play);
        cmp(
          `Play release notes (${track.track} ${rel.name}) [${loc.play}]`,
          note?.text,
          TEXTS.get(loc.asc).whatsNew.value,
        );
      }
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
