#!/usr/bin/env node
/**
 * Сверка Data safety с манифестами Android.
 *
 * Проверка появилась после отказа Google по WayBack: в декларации стояло только
 * точное местоположение, а `ACCESS_COARSE_LOCATION` в манифесте есть — и Play
 * ответил «Invalid Data safety form … Approximate Location». Ошибка тихая:
 * скрипт отправки декларацию не читает, а Google валидирует её на согласованность
 * внутри CSV, но не с бандлом.
 *
 * Правило простое: разрешение в манифесте есть — соответствующий тип данных
 * обязан стоять в декларации. Обратное не проверяем: данные можно получать и
 * без разрешения (координаты из браузерного API в PWA, например).
 *
 * Запуск из каталога skyforest: node fastlane/play-data-safety-check.mjs
 *
 * Манифест из `src/main` — не последнее слово: плагины доливают свои разрешения
 * при слиянии. Итог смотреть в собранном бандле:
 *   bundletool dump manifest --bundle apps/wayback/android/app/build/outputs/bundle/release/app-release.aab
 */
import { readFileSync } from "node:fs";
import { DECLARATIONS, buildCsv } from "./play-data-safety.mjs";

const HERE = new URL("./", import.meta.url);

/** Манифесты оболочек: пакет → путь относительно каталога skyforest. */
const MANIFESTS = {
  "ai.skyforest.wayback": "apps/wayback/android/app/src/main/AndroidManifest.xml",
  "ai.skyforest.mushroomchecker": "apps/mushroom-checker/android/app/src/main/AndroidManifest.xml",
  "ai.skyforest.app": "android/app/src/main/AndroidManifest.xml",
};

/** Разрешение → тип данных Data safety, который оно делает обязательным. */
const REQUIRES = {
  "android.permission.ACCESS_COARSE_LOCATION": "PSL_APPROX_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION": "PSL_PRECISE_LOCATION",
  "android.permission.CAMERA": "PSL_PHOTOS",
};

/**
 * Разрешения, которые останутся в бандле. Строки с `tools:node="remove"`
 * объявлены ради вырезания того, что приезжает от плагинов, — в бандл они не
 * попадают, и декларировать по ним нечего.
 */
function keptPermissions(xml) {
  const kept = new Set();
  for (const tag of xml.match(/<uses-permission\b[^>]*\/?>/g) || []) {
    if (/tools:node\s*=\s*"remove"/.test(tag)) continue;
    const name = tag.match(/android:name\s*=\s*"([^"]+)"/);
    if (name) kept.add(name[1]);
  }
  return kept;
}

let failed = false;
for (const [pkg, manifestPath] of Object.entries(MANIFESTS)) {
  const decl = DECLARATIONS[pkg];
  const perms = keptPermissions(readFileSync(new URL(`../${manifestPath}`, HERE), "utf8"));
  const expected = [...perms].map((p) => REQUIRES[p]).filter(Boolean);

  console.log(`\n===== ${decl?.name || pkg} (${pkg}) =====`);
  console.log(`  ${manifestPath}`);

  if (!decl) {
    // SkyForest сюда не заведён: его форма заполнена руками в Play Console, и
    // подменить её сгенерированной значит потерять то, чего в скрипте нет.
    console.log(
      `  НЕ УПРАВЛЯЕТСЯ скриптом. По манифесту ожидаются типы: ${expected.join(", ") || "нет"}.`,
    );
    console.log("  Сверить руками: Play Console → Policy → App content → Data safety.");
    continue;
  }

  const declared = new Set(decl.types.map((t) => t.type));
  const { csv } = buildCsv(decl);
  for (const type of expected) {
    // Мало отметить тип в декларации: в CSV он должен и стоять галочкой в
    // списке типов, и иметь свои ответы «как используется».
    const checked = csv.includes(`PSL_DATA_TYPES_LOCATION,${type},true`) ||
      csv.includes(`PSL_DATA_TYPES_PHOTOS_AND_VIDEOS,${type},true`);
    const used = csv.includes(`PSL_DATA_USAGE_RESPONSES:${type}:`);
    if (declared.has(type) && checked && used) {
      console.log(`  ок  ${type}`);
      continue;
    }
    failed = true;
    console.log(
      `  ОШИБКА  ${type} не заявлен` +
        `${declared.has(type) ? ` (в CSV: галочка ${checked}, ответы ${used})` : ""}`,
    );
  }
}

if (failed) {
  console.log(
    "\nДекларация не совпадает с манифестом. Поправьте DECLARATIONS в" +
      " fastlane/play-data-safety.mjs и отправьте заново с --apply.",
  );
} else {
  console.log("\nвсе типы данных, следующие из разрешений, заявлены");
}
process.exit(failed ? 1 : 0);
