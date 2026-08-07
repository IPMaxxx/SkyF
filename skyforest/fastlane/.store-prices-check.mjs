#!/usr/bin/env node
/**
 * Карточки в сторах не обещают цен, которых нет в продаже.
 *
 * Проверка офлайновая: она сверяет файлы с файлами, и обе стороны сравнения —
 * настоящие. Цена берётся из `subscriptionPlan` конфига приложения
 * (`src/flavors/<id>/config.ts`) и из каталога товаров
 * (`src/lib/native/iapProducts.ts`) — тех самых мест, откуда её берут пейволл и
 * скрипты Google Play. Переписать числа сюда руками значило бы завести третью
 * копию цены, а именно расхождение копий эту проверку и породило.
 *
 * Что она ловит, в обе стороны:
 *
 *  1. ЧУЖАЯ ЦЕНА. Любая сумма в тексте карточки обязана быть ценой товара,
 *     который продаётся сейчас. Отдельно называется случай, когда сумма
 *     совпала с товаром, снятым с продажи: описание Mushroom Checker полгода
 *     обещало «USD 2.00 per month» по месячному тарифу, закрытому для новых
 *     покупок, — то есть предлагало купить то, чего покупатель купить не может.
 *  2. ЧУЖОЙ ПЕРИОД. Цена названа при своём расчётном периоде. «USD 5.00 per
 *     month» — такое же ложное обещание, как чужая сумма, но глазами оно не
 *     видно: число верное.
 *  3. МОЛЧАНИЕ. Каждый продающийся тариф и длина пробного периода названы в
 *     описании. Заведённый тариф, о котором карточка молчит, — это половина
 *     правки: так у WayBack недельный тариф появился в консоли раньше, чем в
 *     тексте.
 *
 * Проверка идёт по всем трём приложениям и по всем языкам их карточек: цена
 * пишется цифрами, и ошибка в польском описании стоит ровно столько же.
 *
 * НЕГАТИВНОЕ ПЛЕЧО. Правило, которое ничего не ловит, хуже отсутствующего.
 * Прежняя версия берётся не из `HEAD` — после коммита правки там уже лежит
 * исправленный текст, и проверка хвалила бы себя, — а поиском по истории самих
 * файлов: для каждого приложения ищется свежайшая версия описания, которая
 * называет цену, не продающуюся сегодня. На ней проверка обязана упасть. У
 * Mushroom Checker это «USD 2.00 per month or USD 14.99 per year», у WayBack —
 * «USD 3.99 per year».
 *
 * Запуск из каталога skyforest: node fastlane/.store-prices-check.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { catalogFallbackPrices, flavorPlan } from "./play-subs/repo-prices.mjs";

const REPO = new URL("../../", import.meta.url).pathname;
const SRC = new URL("../src/", import.meta.url);
const META = new URL("./metadata/", import.meta.url);

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
};

/* ------------------------------------------------------------------ */
/* Цены, которые репозиторий считает настоящими                        */
/* ------------------------------------------------------------------ */

/**
 * Цены токен-пакетов SkyForest. У основного приложения подписки нет, деньги
 * берутся за пакеты токенов, и цена живёт в `src/lib/tokens.ts`.
 */
function tokenPackPrices() {
  const source = readFileSync(new URL("lib/tokens.ts", SRC), "utf8");
  const from = source.indexOf("TOKEN_PACKAGES_USD");
  const to = source.indexOf("];", from);
  if (from < 0 || to < 0) throw new Error("не нашёл TOKEN_PACKAGES_USD в src/lib/tokens.ts");
  return [...source.slice(from, to).matchAll(/price:\s*([\d.]+)/g)].map((m) => Number(m[1]));
}

const CATALOG = catalogFallbackPrices();
const catalogFor = (prefix) =>
  [...CATALOG].filter(([productId]) => productId.startsWith(prefix));

/**
 * Приложение целиком: где лежат его тексты, что оно продаёт и по каким
 * периодам. Периоды выводятся из имени поля тарифа, а не записаны отдельно:
 * `priceWeeklyUsd` — это и есть «неделя».
 */
function flavorApp({ id, dir, only, title }) {
  const plan = flavorPlan(id);
  const onSale = [
    ["week", plan.priceWeeklyUsd],
    ["month", plan.priceMonthlyUsd],
    ["year", plan.priceYearlyUsd],
  ].filter(([, usd]) => usd != null);
  // Товары того же приложения, цена которых не совпала ни с одним из
  // продающихся тарифов, — это снятое с продажи. Их цена в тексте карточки
  // и есть та самая ловушка.
  const live = new Set(onSale.map(([, usd]) => usd));
  const retired = catalogFor(`ai.skyforest.${id === "checker" ? "mushroomchecker" : id}.sub.`)
    .filter(([, usd]) => !live.has(usd))
    .map(([productId, usd]) => ({ productId, usd }));
  return { id, dir, only, title, onSale, retired, trialDays: plan.trialDays };
}

const APPS = [
  {
    id: "skyforest",
    dir: "",
    // В корне metadata/ лежат ещё и карточки соседей — их каталоги перечислены
    // явно, чтобы чужой текст не проверялся ценами SkyForest.
    only: ["en-US", "android"],
    title: "SkyForest",
    onSale: [
      ...tokenPackPrices().map((usd) => [null, usd]),
      ...catalogFor("ai.skyforest.sub.").map(([, usd]) => [null, usd]),
      ...catalogFor("ai.skyforest.tokens.").map(([, usd]) => [null, usd]),
    ],
    retired: [],
    trialDays: null,
  },
  flavorApp({ id: "checker", dir: "checker", title: "Mushroom Checker" }),
  flavorApp({ id: "wayback", dir: "wayback", title: "WayBack" }),
];

/* ------------------------------------------------------------------ */
/* Разбор текста карточки                                              */
/* ------------------------------------------------------------------ */

/**
 * Сумма денег в тексте: «USD 5.00», «$39.99», «19,99 USD», «€3.99».
 *
 * Запятая как разделитель дробной части — это язык, а не другая цена: в
 * испанском, польском и французском описаниях та же цена пишется «19,99».
 */
const MONEY = /(?:USD|EUR|\$|€)\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(?:USD|EUR|\$|€)/g;

/**
 * Слова расчётного периода на всех языках карточек. Список ведётся по словам,
 * которые реально стоят рядом с ценой; предлог включён там, где само слово
 * иначе всплывало бы в обычной фразе («par an» против английского «an»).
 */
const PERIOD_WORDS = {
  week: [/week(ly)?\b/i, /semanal\b/i, /semana\b/i, /tygodni/i, /hebdomadaire\b/i, /semaine\b/i, /недел/i],
  month: [/month(ly)?\b/i, /mensual\b/i, /\bmes\b/i, /miesi/i, /mensuel\b/i, /\bmois\b/i, /месяц/i],
  year: [/year(ly)?\b/i, /anual\b/i, /año\b/i, /\brok\b/i, /roczn/i, /annuel\b/i, /\ban\b/i, /год/i],
};

const periodsNear = (window) =>
  Object.entries(PERIOD_WORDS)
    .filter(([, patterns]) => patterns.some((re) => re.test(window)))
    .map(([period]) => period);

/**
 * Все суммы текста с их окружением.
 *
 * Окно берётся и до цены, и после: в английском период идёт следом («USD 1.99
 * per week»), а в испанском и польском он часто впереди («(semanal): una
 * semana, 1,99 USD»).
 */
function moneyMentions(text) {
  const out = [];
  for (const match of text.matchAll(MONEY)) {
    const raw = match[1] ?? match[2];
    out.push({
      usd: Number(String(raw).replace(",", ".")),
      text: match[0],
      window: text.slice(Math.max(0, match.index - 70), match.index + match[0].length + 45),
    });
  }
  return out;
}

/** Все `.txt` карточки; каталоги соседних приложений в выборку не попадают. */
function textFiles(app) {
  const base = new URL(`${app.dir ? `${app.dir}/` : ""}`, META);
  const out = [];
  const walk = (url, rel) => {
    for (const entry of readdirSync(url)) {
      const child = new URL(`${entry}${statSync(new URL(entry, url)).isDirectory() ? "/" : ""}`, url);
      const path = rel ? `${rel}/${entry}` : entry;
      if (statSync(new URL(entry, url)).isDirectory()) {
        if (!rel && app.only && !app.only.includes(entry)) continue;
        walk(child, path);
      } else if (entry.endsWith(".txt") && !entry.endsWith("_url.txt")) {
        out.push({ path, text: readFileSync(new URL(entry, url), "utf8") });
      }
    }
  };
  walk(base, "");
  return out;
}

/**
 * Претензии к одному тексту. Возвращается список строк — пустой означает, что
 * текст обещает ровно то, что продаётся.
 */
function priceProblems(app, path, text) {
  const problems = [];
  const live = new Map(app.onSale.filter(([period]) => period).map(([period, usd]) => [usd, period]));
  const known = new Set(app.onSale.map(([, usd]) => usd));

  for (const mention of moneyMentions(text)) {
    if (!known.has(mention.usd)) {
      const dead = app.retired.find((r) => r.usd === mention.usd);
      problems.push(
        dead
          ? `${path}: «${mention.text}» — цена ${dead.productId}, снятого с продажи`
          : `${path}: «${mention.text}» — такого товара нет`,
      );
      continue;
    }
    const expected = live.get(mention.usd);
    if (!expected) continue; // товар без расчётного периода (пакет токенов)
    // Одна и та же сумма у двух тарифов сделала бы вывод о периоде гаданием.
    if ([...live.keys()].filter((usd) => usd === mention.usd).length > 1) continue;
    const near = periodsNear(mention.window);
    if (near.length && !near.includes(expected)) {
      problems.push(
        `${path}: «${mention.text}» названа при периоде «${near.join("/")}», а товар ${expected}`,
      );
    }
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/* Основное плечо: сегодняшние тексты                                  */
/* ------------------------------------------------------------------ */

for (const app of APPS) {
  console.log(`\n===== ${app.title} =====`);
  const sale = [
    ...new Set(app.onSale.map(([period, usd]) => `${usd}${period ? ` / ${period}` : ""}`)),
  ].join(", ");
  console.log(`     в продаже: ${sale}`);
  if (app.retired.length) {
    console.log(`     снято с продажи: ${app.retired.map((r) => `${r.usd} (${r.productId})`).join(", ")}`);
  }

  const files = textFiles(app);
  const problems = files.flatMap(({ path, text }) => priceProblems(app, path, text));
  check(
    `${app.title}: в текстах карточки нет цен, которых нет в продаже (${files.length} файлов)`,
    problems.length === 0,
    problems.slice(0, 10).join("\n     "),
  );

  // Обратная сторона: тариф заведён, а карточка о нём молчит.
  const periodic = app.onSale.filter(([period]) => period);
  if (periodic.length) {
    const silent = [];
    for (const { path, text } of files) {
      // Полное описание — единственное место, где обязаны быть названы все
      // тарифы: в короткое (80 символов) цена не влезает и не должна.
      if (!/(^|\/)(description|full_description)\.txt$/.test(path)) continue;
      const said = new Set(moneyMentions(text).map((m) => m.usd));
      const missing = periodic.filter(([, usd]) => !said.has(usd)).map(([, usd]) => usd);
      if (missing.length) silent.push(`${path}: не названы ${missing.join(", ")}`);
      if (app.trialDays != null && !new RegExp(`\\b${app.trialDays}\\b`).test(text)) {
        silent.push(`${path}: не названа длина пробного периода ${app.trialDays}`);
      }
    }
    check(
      `${app.title}: описание называет все продающиеся тарифы и триал`,
      silent.length === 0,
      silent.slice(0, 8).join("\n     "),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Негативное плечо: та же проверка по истории файлов                  */
/* ------------------------------------------------------------------ */

console.log("\n===== негативное плечо: как было до правки =====");

/** Свежайшая версия файла в истории, на которой проверка падает. */
function lastFailingRevision(app, rel) {
  const revs = execFileSync("git", ["rev-list", "HEAD", "--", rel], { encoding: "utf8", cwd: REPO })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const rev of revs) {
    let text;
    try {
      text = execFileSync("git", ["show", `${rev}:${rel}`], { encoding: "utf8", cwd: REPO });
    } catch {
      continue; // в этом коммите файла ещё нет
    }
    const problems = priceProblems(app, `${rev.slice(0, 7)}:${rel.split("/").pop()}`, text);
    if (problems.length) return { rev, problems };
  }
  return null;
}

for (const app of APPS) {
  if (!app.retired.length && app.id === "skyforest") {
    // У SkyForest цен в карточке нет вовсе: обещать нечего, ловить нечего.
    // Это утверждение, а не пропуск — если цена там заведётся, основное плечо
    // выше начнёт её проверять.
    const files = textFiles(app);
    const mentions = files.flatMap(({ text }) => moneyMentions(text));
    console.log(`     SkyForest: сумм в карточке ${mentions.length} — обещать нечего`);
    continue;
  }
  const rel = `skyforest/fastlane/metadata/${app.dir}/en-US/description.txt`;
  const found = lastFailingRevision(app, rel);
  check(
    `${app.title}: в истории описания есть версия с несуществующей ценой — и она ловится`,
    found != null,
    `по всей истории ${rel} проверка молчит — значит, ловить она разучилась`,
  );
  if (found) {
    console.log(`     ${found.rev.slice(0, 7)}: ${found.problems.join("\n     ")}`);
  }
}

/*
 * Чужой период в истории не встречался: цены всегда врали суммой. Значит,
 * второе плечо проверки ничем в истории не подтверждается, и его нужно
 * подтвердить прямо — подменив период у настоящего сегодняшнего описания.
 * Сумма при этом остаётся верной, и поймать подмену можно только периодом.
 */
{
  const app = APPS.find((a) => a.id === "checker");
  const weekly = app.onSale.find(([period]) => period === "week")?.[1];
  const text = readFileSync(new URL("checker/en-US/description.txt", META), "utf8").replace(
    new RegExp(`(USD ${weekly}\\.00) per week`),
    "$1 per month",
  );
  const problems = priceProblems(app, "описание с подменённым периодом", text);
  check(
    `подмена «${weekly} per week» на «per month» видна, хотя сумма верна`,
    problems.length > 0,
    "цена при чужом расчётном периоде прошла молча — второе плечо не работает",
  );
  if (problems.length) console.log(`     ${problems.join("\n     ")}`);
}

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
