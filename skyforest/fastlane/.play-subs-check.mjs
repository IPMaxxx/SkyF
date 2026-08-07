#!/usr/bin/env node
/**
 * Подписки в Google Play совпадают с тем, что записано в репозитории.
 *
 * Проверка сетевая — и другой быть не может. Она отвечает ровно на тот вопрос,
 * на который нельзя ответить, читая одни файлы: «а что там на самом деле в
 * консоли?». Соседние проверки (`.wayback-locales-check.mjs` и прочие) умышленно
 * офлайновые, потому что сверяют файлы с файлами; здесь второй стороной
 * сравнения выступает площадка. Поэтому это отдельная команда, а не часть
 * офлайнового набора: ей нужен ключ сервисного аккаунта, которого в CI нет, и
 * падать она обязана от расхождения с Play, а не от отсутствия сети.
 *
 * Что сверяется, по всем трём приложениям сразу:
 *
 *  1. ЦЕНА. Цена базового плана в США и цена «для остальных регионов» равны
 *     той, что записана в репозитории. Для Checker и WayBack записана она в
 *     `src/flavors/<id>/config.ts` — том же конфиге, из которого цену берёт
 *     пейволл; для SkyForest — в `fallbackPrice` каталога
 *     `src/lib/native/iapProducts.ts`. Ровно это расхождение и стоило нам
 *     скрипта: годовой Checker лежал в коде за 14.99 при 39.99 в консоли.
 *  2. ПЛАНЫ. Расчётный период, льготный период и состояние базового плана. У
 *     снятых с продажи планов состояние обязано остаться выключенным: прогон,
 *     который воскресит закрытый тариф, — тот же откат, только в состояниях.
 *  3. ОФФЕРЫ. Каждый объявленный триал существует, находится в объявленном
 *     состоянии и имеет объявленную длительность бесплатной фазы. Оффер,
 *     активный в консоли, но не объявленный в репозитории, — ошибка: два
 *     активных предложения на одном плане превращают выбор в жребий.
 *  4. СТРАНЫ. Все базовые планы приложения покрывают один и тот же набор
 *     регионов, оффер покрывает регионы своего плана, и во всех регионах
 *     активного плана открыта продажа новым подписчикам. Подрезанный набор
 *     стран не виден ни в одной цене и обнаруживается только выручкой.
 *  5. ПОЛНОТА. В консоли нет товаров, о которых репозиторий не знает.
 *
 * НЕГАТИВНОЕ ПЛЕЧО. Правило, которое ничего не ловит, хуже отсутствующего.
 * Здесь оно берётся из истории самих файлов, а не из `HEAD`: в `HEAD` прежнего
 * общего скрипта уже нет вовсе, и проверка, привязанная к нему, хвалила бы
 * себя. Ищется последний коммит, в котором блоб
 * `fastlane/play-subs-create.mjs` ещё существует, из него разбирается таблица
 * цен — и по ней запускается ТА ЖЕ САМАЯ сверка (`play-subs/audit.mjs`), что и
 * по сегодняшним объявлениям. На этих данных она обязана упасть: годовой
 * Checker там за 14.99 при 39.99 в консоли, годовой WayBack — за 3.99 при
 * 19.99, а месячные планы обоих приложений объявлены действующими, хотя сняты
 * с продажи. Если сверка на них молчит, сломалась сверка.
 *
 * Запуск из каталога skyforest: node fastlane/.play-subs-check.mjs
 */
import { execFileSync } from "node:child_process";

import { auditPackage } from "./play-subs/audit.mjs";
import { CHECKER_PLAY } from "./play-subs/checker.mjs";
import { SKYFOREST_PLAY } from "./play-subs/skyforest.mjs";
import { WAYBACK_PLAY } from "./play-subs/wayback.mjs";
import { makeApi, playToken } from "./play-subs/engine.mjs";

const PLANS = [SKYFOREST_PLAY, CHECKER_PLAY, WAYBACK_PLAY];
/** Прежний общий скрипт — источник данных для негативного плеча. */
const LEGACY_PATH = "skyforest/fastlane/play-subs-create.mjs";

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
};

const api = makeApi(await playToken());

/* ------------------------------------------------------------------ */
/* Основное плечо: репозиторий против консоли                          */
/* ------------------------------------------------------------------ */

/** Строки итоговой таблицы — печатаются в конце одним блоком. */
const table = [];

for (const plan of PLANS) {
  console.log(`\n===== ${plan.pkg} =====`);
  await auditPackage({ api, plan, check, table });
}

/* ------------------------------------------------------------------ */
/* Негативное плечо: та же сверка по данным из истории                 */
/* ------------------------------------------------------------------ */

console.log("\n===== негативное плечо: прежний fastlane/play-subs-create.mjs =====");

/** Последний коммит, в котором файл ещё существует. */
function lastRevisionWithFile(path) {
  const commits = execFileSync("git", ["rev-list", "HEAD", "--", path], { encoding: "utf8", cwd: ".." })
    .split("\n")
    .filter(Boolean);
  for (const sha of commits) {
    try {
      execFileSync("git", ["cat-file", "-e", `${sha}:${path}`], { cwd: "..", stdio: "ignore" });
      return sha;
    } catch {
      /* в этом коммите файла нет — идём глубже */
    }
  }
  return null;
}

/**
 * Таблица `PRODUCTS` того скрипта, разложенная в объявления по приложениям.
 * Известны только пакет, товар, план и цена — остального в сверку и не
 * попадёт: `audit.mjs` проверяет лишь заданные поля.
 */
function legacyPlans(source) {
  const byPkg = new Map();
  for (const match of source.matchAll(/pkg:\s*'([^']+)'/g)) {
    const entry = source.slice(match.index, source.indexOf("listings:", match.index));
    const productId = entry.match(/productId:\s*'([^']+)'/)?.[1];
    const basePlanId = entry.match(/basePlanId:\s*'([^']+)'/)?.[1];
    const usd = entry.match(/usd:\s*([\d.]+)/)?.[1];
    if (!productId || !basePlanId || !usd) continue;
    const pkg = match[1];
    if (!byPkg.has(pkg)) byPkg.set(pkg, { pkg, products: [], retired: [], exhaustive: false });
    byPkg.get(pkg).products.push({ productId, basePlanId, usd: Number(usd) });
  }
  return [...byPkg.values()];
}

const sha = lastRevisionWithFile(LEGACY_PATH);
if (!sha) {
  check("негативное плечо: нашлась версия скрипта в истории", false, `нет ни одного коммита с ${LEGACY_PATH}`);
} else {
  const source = execFileSync("git", ["show", `${sha}:${LEGACY_PATH}`], { encoding: "utf8", cwd: ".." });
  const plans = legacyPlans(source);
  check(
    `негативное плечо: разобрал таблицу цен из ${sha.slice(0, 7)}`,
    plans.length > 0 && plans.some((p) => p.products.length),
    "PRODUCTS не разобрался",
  );

  let caught = 0;
  const record = (name, ok, detail) => {
    if (!ok) caught += 1;
    console.log(`     ${ok ? "прошло " : "поймано"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  };
  for (const plan of plans) await auditPackage({ api, plan, check: record });

  check(
    "негативное плечо: сверка падает на данных прежнего скрипта",
    caught > 0,
    "прежний скрипт вдруг совпал с консолью — сломалась сверка, а не он исправился",
  );
}

/* ------------------------------------------------------------------ */

console.log("\n===== в репозитории / в консоли / что сделал =====");
const width = table.reduce((max, row) => Math.max(max, row[0].length), 0);
for (const [id, repo, live, action] of table) {
  console.log(`${id.padEnd(width)}  ${repo.padEnd(18)}  ${live.padEnd(14)}  ${action}`);
}

console.log(failures ? `\nПРОВАЛОВ: ${failures}` : "\nВсё сходится.");
process.exit(failures ? 1 : 0);
