#!/usr/bin/env node
/**
 * Сверка Data safety с тем, что приложение на самом деле делает.
 *
 * Проверка появилась после отказа Google по WayBack: в декларации стояло только
 * точное местоположение, а `ACCESS_COARSE_LOCATION` в манифесте есть — и Play
 * ответил «Invalid Data safety form … Approximate Location». Ошибка тихая:
 * скрипт отправки декларацию не читает, а Google валидирует её на согласованность
 * внутри CSV, но не с бандлом.
 *
 * Правило простое: разрешение в бандле есть — соответствующий тип данных обязан
 * стоять в декларации. Обратное не проверяем: данные можно получать и без
 * разрешения (координаты из браузерного API, аналитика в вебвью).
 *
 * Проверяются все три приложения. Пакет без декларации — тоже ошибка: именно так
 * SkyForest много месяцев жил с формой «не собираем ничего», заполненной руками в
 * консоли, при том что приложение просит местоположение, камеру и аккаунт.
 *
 * Разрешения читаются **из собранного бандла**, а не из манифеста оболочки: до
 * половины строк доливают плагины при слиянии. У Mushroom Checker в исходном
 * манифесте нет ни слова про рекламу, а в бандле лежит
 * `com.google.android.gms.permission.AD_ID` — его приносит facebook-core из
 * `@capgo/capacitor-social-login`. Если бандла нет (или нет bundletool), берём
 * манифест оболочки, отбрасывая строки с `tools:node="remove"`, и говорим об этом
 * вслух: такая проверка слабее.
 *
 * Запуск из каталога skyforest: node fastlane/play-data-safety-check.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { DECLARATIONS, buildCsv } from "./play-data-safety.mjs";

const HERE = new URL("./", import.meta.url);
const repo = (path) => new URL(`../${path}`, HERE);

/** Оболочки: пакет → манифест-исходник и релизный бандл, оба от каталога skyforest. */
const SHELLS = {
  "ai.skyforest.app": {
    manifest: "android/app/src/main/AndroidManifest.xml",
    bundle: "android/app/build/outputs/bundle/release/app-release.aab",
  },
  "ai.skyforest.mushroomchecker": {
    manifest: "apps/mushroom-checker/android/app/src/main/AndroidManifest.xml",
    bundle: "apps/mushroom-checker/android/app/build/outputs/bundle/release/app-release.aab",
  },
  "ai.skyforest.wayback": {
    manifest: "apps/wayback/android/app/src/main/AndroidManifest.xml",
    bundle: "apps/wayback/android/app/build/outputs/bundle/release/app-release.aab",
  },
};

/** Разрешение → тип данных Data safety, который оно делает обязательным. */
const REQUIRES = {
  "android.permission.ACCESS_COARSE_LOCATION": "PSL_APPROX_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION": "PSL_PRECISE_LOCATION",
  "android.permission.CAMERA": "PSL_PHOTOS",
  // «Device or other IDs» в таксономии Google — это в том числе рекламный
  // идентификатор и токен пуш-уведомлений, а не только серийники железа.
  "com.google.android.gms.permission.AD_ID": "PSL_DEVICE_ID",
  "android.permission.ACCESS_ADSERVICES_AD_ID": "PSL_DEVICE_ID",
  "com.google.android.c2dm.permission.RECEIVE": "PSL_DEVICE_ID",
  // Покупка в сторе означает запись о ней на нашей стороне.
  "com.android.vending.BILLING": "PSL_PURCHASE_HISTORY",
};

/**
 * Что видно не в манифесте, а в общем коде сайта. Нативные оболочки грузят живой
 * сайт (`server.url` в capacitor.config), поэтому всё, что стоит в общем layout,
 * работает и внутри приложений — разрешений для этого не нужно, и по манифесту
 * такую утечку не поймать.
 */
const CODE_FACTS = [
  {
    file: "src/app/layout.tsx",
    probe: /mc\.yandex\.ru\/metrika|googletagmanager\.com\/gtag/,
    types: ["PSL_USER_INTERACTION", "PSL_DEVICE_ID"],
    why: "Яндекс.Метрика и Google Analytics в общем layout — они грузятся и в вебвью нативной сборки",
  },
  {
    file: "src/lib/native/iap.ts",
    probe: /\/api\/native\/iap\/log/,
    types: ["PSL_PERFORMANCE_DIAGNOSTICS"],
    why: "клиент сам отправляет на сервер стадию, код и текст ошибки покупки",
  },
];

/** Разрешения из бандла: единственный источник, где видны добавки плагинов. */
function bundlePermissions(bundlePath) {
  const file = repo(bundlePath);
  if (!existsSync(file)) return null;
  let xml;
  try {
    xml = execFileSync("bundletool", ["dump", "manifest", "--bundle", file.pathname], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null; // bundletool не установлен — откатываемся на манифест
  }
  return new Set(
    [...xml.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]),
  );
}

/**
 * Разрешения, которые останутся в бандле по исходному манифесту. Строки с
 * `tools:node="remove"` объявлены ради вырезания того, что приезжает от плагинов,
 * — в бандл они не попадают, и декларировать по ним нечего.
 */
function manifestPermissions(manifestPath) {
  const kept = new Set();
  const xml = readFileSync(repo(manifestPath), "utf8");
  for (const tag of xml.match(/<uses-permission\b[^>]*\/?>/g) || []) {
    if (/tools:node\s*=\s*"remove"/.test(tag)) continue;
    const name = tag.match(/android:name\s*=\s*"([^"]+)"/);
    if (name) kept.add(name[1]);
  }
  return kept;
}

/** Разрешения, которые исходный манифест вырезает у плагинов. */
function removedPermissions(manifestPath) {
  const removed = new Set();
  const xml = readFileSync(repo(manifestPath), "utf8");
  for (const tag of xml.match(/<uses-permission\b[^>]*\/?>/g) || []) {
    if (!/tools:node\s*=\s*"remove"/.test(tag)) continue;
    const name = tag.match(/android:name\s*=\s*"([^"]+)"/);
    if (name) removed.add(name[1]);
  }
  return removed;
}

/**
 * Мало отметить тип в декларации: в CSV он должен и стоять галочкой в списке
 * типов, и иметь свои ответы «как используется» — иначе Google отвергнет файл.
 */
function csvCovers(csv, type) {
  // Категория («Location», «Photos and videos», …) у каждого типа своя, поэтому
  // берём любую: важно, что строка выбора типа отвечает true.
  const checked = new RegExp(`^PSL_DATA_TYPES_[A-Z_]+,${type},true,`, "m").test(csv);
  const used = csv.includes(`PSL_DATA_USAGE_RESPONSES:${type}:`);
  return { checked, used, ok: checked && used };
}

let failed = false;
for (const [pkg, shell] of Object.entries(SHELLS)) {
  const decl = DECLARATIONS[pkg];
  console.log(`\n===== ${decl?.name || pkg} (${pkg}) =====`);

  const fromBundle = bundlePermissions(shell.bundle);
  const perms = fromBundle ?? manifestPermissions(shell.manifest);
  console.log(`  ${fromBundle ? shell.bundle : `${shell.manifest} (бандла нет, проверка слабее)`}`);

  const required = new Map();
  for (const perm of perms) {
    if (REQUIRES[perm]) required.set(REQUIRES[perm], perm);
  }
  for (const fact of CODE_FACTS) {
    if (!fact.probe.test(readFileSync(repo(fact.file), "utf8"))) continue;
    for (const type of fact.types) if (!required.has(type)) required.set(type, fact.file);
  }

  if (!decl) {
    failed = true;
    console.log(
      `  ОШИБКА  декларации нет вовсе, а по бандлу и коду нужны:` +
        ` ${[...required.keys()].sort().join(", ")}`,
    );
    console.log("  Заведите пакет в DECLARATIONS (fastlane/play-data-safety.mjs).");
    continue;
  }

  const declared = new Set(decl.types.map((t) => t.type));
  const { csv } = buildCsv(decl);
  for (const [type, source] of [...required].sort()) {
    const { checked, used, ok } = csvCovers(csv, type);
    if (declared.has(type) && ok) {
      console.log(`  ок  ${type.padEnd(28)} ← ${source}`);
      continue;
    }
    failed = true;
    console.log(
      `  ОШИБКА  ${type} не заявлен, а он следует из ${source}` +
        `${declared.has(type) ? ` (в CSV: галочка ${checked}, ответы ${used})` : ""}`,
    );
  }

  // Отдельный вопрос Play Console «Advertising ID» задаётся не в Data safety, и
  // Google сверяет ответ именно с этим разрешением в бандле.
  if (perms.has("com.google.android.gms.permission.AD_ID")) {
    const pending = removedPermissions(shell.manifest).has(
      "com.google.android.gms.permission.AD_ID",
    );
    console.log(
      `  ВНИМАНИЕ  в бандле есть AD_ID${pending ? ", но манифест его уже вырезает" : ""}.` +
        ` App content → Advertising ID должен отвечать «Yes»${
          pending ? ", пока не выложена новая сборка" : " либо разрешение надо вырезать"
        }.`,
    );
  }
}

if (failed) {
  console.log(
    "\nДекларация не совпадает с приложением. Поправьте DECLARATIONS в" +
      " fastlane/play-data-safety.mjs и отправьте заново с --apply.",
  );
} else {
  console.log("\nвсе типы данных, следующие из бандлов и общего кода, заявлены");
}
process.exit(failed ? 1 : 0);
