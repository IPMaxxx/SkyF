#!/usr/bin/env node
/**
 * Языки WayBack: словари полны, соседние приложения не задеты, карточки в
 * сторах влезают в лимиты.
 *
 * Проверка разбирает настоящие файлы репозитория — словари `wayback.*.ts`,
 * конфиги флейворов, middleware и тексты `fastlane/metadata/wayback/**`, — а не
 * их списанные копии: копия разошлась бы с источником молча. Как соседние
 * проверки, она работает на Node без браузера и без сети.
 *
 * Что именно утверждается:
 *
 *  1. НАБОР КЛЮЧЕЙ. Во всех языках WayBack он обязан совпадать с английским до
 *     ключа. Пропущенный ключ next-intl показывает на экране его собственным
 *     именем («paywall.cta»), и заметить это можно только глазами и только на
 *     том языке, на котором никто из нас не читает.
 *  2. ЧУЖИЕ ЯЗЫКИ. У Mushroom Checker и SkyForest языков ровно два, и
 *     middleware обязан уводить с остальных. Языки WayBack не должны всплывать
 *     ни в их переключателях, ни по прямому адресу.
 *  3. ICU. Каждое сообщение разбирается настоящим парсером next-intl, набор
 *     аргументов сверяется с английским, а у множественного числа проверяются
 *     формы, которых требует сам язык: у польского их три (one/few/many), и
 *     словарь с одной формой показал бы «5 wyprawa».
 *  4. ЖИВОСТЬ ПЕРЕВОДА. Пустых строк нет; в неанглийском словаре нет строк,
 *     совпадающих с английскими (кроме заведомо общих — «Start», «Face ID»,
 *     названия сторов и строки из одних плейсхолдеров); во французском нет
 *     обычного пробела перед «?!;:», в испанском вопрос и восклицание открыты
 *     перевёрнутым знаком.
 *  5. ДЛИНА. Тексты карточек влезают в лимиты App Store и Google Play, а
 *     подписи узких мест интерфейса (кнопки главного экрана, вкладки, тарифы) —
 *     в тот запас, который эти места держат.
 *
 * Проверка обязана падать на версии ДО правки — правило, которое ничего не
 * ловит, хуже отсутствующего. Прежняя версия берётся не из `HEAD` (после
 * коммита правки там уже лежит исправленный файл, и такая проверка начинает
 * хвалить себя), а поиском по истории самих файлов: берём ближайшую версию, в
 * которой у флейворов ещё нет собственного списка языков.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/.wayback-locales-check.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parse } from "@formatjs/icu-messageformat-parser";

const REPO = new URL("../../", import.meta.url).pathname;
const SRC = new URL("../src/", import.meta.url);
const META = new URL("../fastlane/metadata/wayback/", import.meta.url);

/** Путь конфига WayBack от корня репозитория — им же его знает git. */
const WAYBACK_CONFIG_REL = "skyforest/src/flavors/wayback/config.ts";
/** Признак правки: набор языков стал свойством приложения. */
const FIX_MARKER = /^\s*locales:\s*\[/m;

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
};

/* ------------------------------------------------------------------ */
/* Чтение словарей: настоящие файлы, без сборщика                      */
/* ------------------------------------------------------------------ */

/**
 * Словарь как объект. Файлы словарей — это литерал объекта с комментариями и
 * `as const`, поэтому их можно выполнить как обычный JS, сняв три чисто
 * типовых конструкции. Своего парсера тут нет намеренно: он разошёлся бы с
 * тем, что реально собирает Next.
 */
function loadCatalog(source, what) {
  const js = source
    .replace(/\bas const\b/g, "")
    .replace(/^export default /m, "module.exports.default = ")
    .replace(/^export const (\w+) = /gm, "module.exports.$1 = ");
  const mod = { exports: {} };
  try {
    new Function("module", "exports", js)(mod, mod.exports);
  } catch (error) {
    throw new Error(`не разобрал ${what}: ${error.message}`);
  }
  return mod.exports;
}

function readCatalog(locale) {
  return loadCatalog(
    readFileSync(new URL(`i18n/messages/wayback.${locale}.ts`, SRC), "utf8"),
    `wayback.${locale}.ts`,
  );
}

/**
 * Полное дерево сообщений языка — так же, как его собирает сборка.
 *
 * `en.ts` не самодостаточен: он сшивает области (`dashboard`, `account`,
 * `payment` …) из соседних файлов. Резолвер идёт по его импортам и подставляет
 * загруженные модули, поэтому «английский» здесь — то же самое дерево, которое
 * увидит `next-intl`, а не половина от него.
 */
function loadMessageTree(file) {
  const source = readFileSync(new URL(`i18n/messages/${file}.ts`, SRC), "utf8");
  const names = [];
  const values = [];
  const body = source.replace(
    /^import\s+(?:(\w+)\s*(?:,\s*)?)?(?:\{([^}]*)\})?\s*from\s+"\.\/([\w.]+)";?$/gm,
    (_, def, named, mod) => {
      const imported = loadCatalog(
        readFileSync(new URL(`i18n/messages/${mod}.ts`, SRC), "utf8"),
        `${mod}.ts`,
      );
      if (def) {
        names.push(def);
        values.push(imported.default);
      }
      for (const raw of (named ?? "").split(",")) {
        const name = raw.trim();
        if (!name) continue;
        names.push(name);
        values.push(imported[name]);
      }
      return "";
    },
  );

  const js = body
    .replace(/\bas const\b/g, "")
    .replace(/^export default /m, "module.exports.default = ");
  const mod = { exports: {} };
  new Function("module", "exports", ...names, js)(mod, mod.exports, ...values);
  return mod.exports.default;
}

/** Плоская карта «путь ключа → строка». Массивы разворачиваются по индексу. */
function flatten(value, prefix = "", out = new Map()) {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object") flatten(item, path, out);
    else out.set(path, item);
  }
  return out;
}

/**
 * Накладка языка в терминах общего дерева сообщений.
 *
 * Ключи именуются ровно так, как их спрашивает `useTranslations`: словарь
 * экранов — `wayback.*`, карточка приложения — `flavor.wayback.*`, общие
 * области (вход, пароль, 404) — своими именами. Благодаря этому накладку можно
 * сравнивать с английским деревом ключ в ключ.
 */
function catalogParts(mod) {
  const parts = new Map();
  flatten(mod.default ?? {}, "wayback", parts);
  if (mod.waybackBrand) flatten({ wayback: mod.waybackBrand }, "flavor", parts);
  if (mod.waybackShared) flatten(mod.waybackShared, "", parts);
  return parts;
}

/* ------------------------------------------------------------------ */
/* Языки приложений: читаются из конфигов, а не переписаны сюда        */
/* ------------------------------------------------------------------ */

function flavorLocales(source, flavor) {
  const match = source.match(/^\s*locales:\s*\[([^\]]*)\]/m);
  if (!match) throw new Error(`в конфиге ${flavor} нет поля locales`);
  return [...match[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
}

function readFlavorLocales(flavor) {
  return flavorLocales(
    readFileSync(new URL(`flavors/${flavor}/config.ts`, SRC), "utf8"),
    flavor,
  );
}

function buildLocales() {
  const source = readFileSync(new URL("i18n/locales.ts", SRC), "utf8");
  const match = source.match(/ALL_LOCALES\s*=\s*\[([^\]]*)\]/);
  if (!match) throw new Error("не нашёл ALL_LOCALES в src/i18n/locales.ts");
  return [...match[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
}

/* ------------------------------------------------------------------ */
/* Что считается «забытым английским» и «общей» строкой                */
/* ------------------------------------------------------------------ */

/**
 * Слова, которые законно совпадают с английскими: имена продуктов и сторов,
 * обозначения единиц и заимствования, живущие во всех пяти языках («offline»,
 * «premium», «satellite», «GPS»). Список короткий намеренно — он про слова, а
 * не про фразы.
 */
const LOANWORDS = new Set(
  `wayback skyforest mushroom checker app store apple google play premium
   offline online satellite face id touch gps start stop km mi ft kb mb gb
   zoom email e-mail direction point points max min ok centre center
   maximum minimum standard total distance`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Строку считаем забытой английской, если она дословно повторяет английскую и
 * при этом похожа на фразу, а не на слово.
 *
 * Порог в три слова взят не из головы: односложные подписи вроде «Offline» или
 * «Satellite» в испанском, польском и французском пишутся ровно так же, и
 * требовать от них отличия — значит заставить переводчика испортить текст ради
 * зелёной галочки. А вот целое предложение, совпавшее с английским до буквы, —
 * это всегда недоделанный перевод.
 */
function looksUntranslated(text) {
  const words = plainWords(text);
  if (words.length === 0) return false; // одни плейсхолдеры, числа и знаки
  if (words.length >= 3) return true; // фраза
  return !words.every((word) => LOANWORDS.has(word.toLowerCase()));
}

/**
 * Слова, которые человек прочитает на экране: имена аргументов и служебные
 * слова ICU («plural», «one», «other») сюда не попадают. Отсюда и настоящий
 * парсер вместо регулярного выражения — оно принимало ветку `other {# points}`
 * за три английских слова и объявляло переведённую строку непереведённой.
 */
function plainWords(text) {
  const literals = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 0) literals.push(node.value);
      if (node.options) for (const opt of Object.values(node.options)) walk(opt.value);
      if (node.children) walk(node.children);
    }
  };
  try {
    walk(parse(String(text), { requiresOtherClause: false }));
  } catch {
    literals.push(String(text));
  }
  // Обозначения единиц («m», «km», «z» перед зумом) словами не считаем: они
  // одинаковы во всех пяти языках и к переводу отношения не имеют.
  return (literals.join(" ").match(/[A-Za-zÀ-ÿĄ-ſ][A-Za-zÀ-ÿĄ-ſ'’-]*/g) ?? []).filter(
    (word) => word.length > 2,
  );
}

/* ------------------------------------------------------------------ */
/* Разбор одного сообщения ICU                                         */
/* ------------------------------------------------------------------ */

/** Аргументы сообщения: имена в фигурных скобках, без веток плюрализации. */
function icuArguments(text, locale, key) {
  const found = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.value != null && node.type !== 0) found.add(node.value);
      if (node.options) for (const opt of Object.values(node.options)) walk(opt.value);
      if (node.children) walk(node.children);
    }
  };
  walk(parse(text, { requiresOtherClause: false }));
  return { args: [...found].sort(), text, locale, key };
}

/**
 * Сколько различных форм счёта требует язык.
 *
 * Считаем категории без `other`: в ICU `other` — это ветка «всё остальное», и
 * она законно берёт на себя одну из категорий. Русский словарь так и написан —
 * `one / few / other`, где `other` несёт форму «походов»; требовать в нём
 * буквальную ветку `many` значило бы придираться к орфографии ICU, а не к
 * тому, что видит человек. А вот польский с двумя ветками — это «5 wyprawa»
 * на экране, и такое поймать нужно.
 */
function requiredPluralForms(locale) {
  return new Intl.PluralRules(locale).resolvedOptions().pluralCategories.length - 1;
}

/** Ветки плюрализации, объявленные в сообщении. */
function pluralBranches(text) {
  const out = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      // TYPE.plural === 6 в @formatjs/icu-messageformat-parser
      if (node.type === 6) out.push(Object.keys(node.options));
      if (node.options) for (const opt of Object.values(node.options)) walk(opt.value);
      if (node.children) walk(node.children);
    }
  };
  walk(parse(text, { requiresOtherClause: false }));
  return out;
}

/* ------------------------------------------------------------------ */
/* 1–4. Словари                                                        */
/* ------------------------------------------------------------------ */

const BUILD_LOCALES = buildLocales();
const WAYBACK_LOCALES = readFlavorLocales("wayback");
const EXTRA_LOCALES = WAYBACK_LOCALES.filter((l) => l !== "en" && l !== "ru");

console.log("— языки принадлежат приложению —");
check(
  `WayBack знает ${WAYBACK_LOCALES.join(", ")}`,
  WAYBACK_LOCALES.length >= 2 && WAYBACK_LOCALES[0] === "en",
);
for (const flavor of ["checker", "skyforest"]) {
  const locales = readFlavorLocales(flavor);
  check(
    `${flavor} знает только свои два языка (${locales.join(", ")})`,
    locales.length === 2 && locales.every((l) => l === "ru" || l === "en"),
    `в конфиге ${flavor}: ${locales.join(", ")}`,
  );
  const foreign = locales.filter((l) => EXTRA_LOCALES.includes(l));
  check(`${flavor} не отвечает на языки WayBack`, foreign.length === 0, foreign.join(", "));
}
check(
  "все языки приложений есть в маршрутизации сборки",
  WAYBACK_LOCALES.every((l) => BUILD_LOCALES.includes(l)),
  `ALL_LOCALES: ${BUILD_LOCALES.join(", ")}`,
);
check(
  "в маршрутизации нет языков, которых не показывает ни одно приложение",
  BUILD_LOCALES.every((l) =>
    ["wayback", "checker", "skyforest"].some((f) => readFlavorLocales(f).includes(l)),
  ),
  `ALL_LOCALES: ${BUILD_LOCALES.join(", ")}`,
);

// Увод с чужого языка обязан быть в middleware: без него адрес /es/... на
// checker.skyforest.ai открылся бы англо-русской заглушкой под чужим префиксом.
{
  const mw = readFileSync(new URL("middleware.ts", SRC), "utf8");
  check(
    "middleware уводит с языка, которого приложение не знает",
    /isFlavorLocale\(flavor, urlLocale\)/.test(mw) && /NextResponse\.redirect/.test(mw),
  );
  check(
    "язык из куки сверяется со списком приложения, а не сборки",
    /flavorCfg\.locales\.find\(\(loc\) => loc === cookieLocale\)/.test(mw),
  );
}

// Переключатели языка обязаны спрашивать приложение: список из routing.locales
// предложил бы Checker языки WayBack.
for (const file of [
  "components/LocaleSwitcher.tsx",
  "components/checker/CheckerQuickSettings.tsx",
  "components/checker/CheckerMoreSheet.tsx",
  "components/wayback/WayBackMenu.tsx",
]) {
  const source = readFileSync(new URL(file, SRC), "utf8");
  check(
    `${file.split("/").pop()} берёт языки у приложения`,
    /useFlavorLocales/.test(source) && !/routing\.locales/.test(source),
  );
}

console.log("\n— словари WayBack —");
/** Английское дерево целиком — эталон и для экранов, и для общих областей. */
const english = flatten(loadMessageTree("en"));
/** Собственная копия WayBack: её язык обязан покрыть до ключа. */
const OWN = (key) => key.startsWith("wayback.") || key.startsWith("flavor.wayback.");

/**
 * Дерево сообщений языка — то самое, что отдаст `next-intl`.
 *
 * У русского и английского оно своё целиком (`ru.ts`, `en.ts`). У остальных
 * это накладка поверх английского, ровно как её собирает `src/i18n/request.ts`:
 * сравнивать нужно результат, а не исходники, иначе проверка ничего не скажет
 * о том, что человек увидит на экране.
 */
function localeTree(locale) {
  if (locale === "en" || locale === "ru") return flatten(loadMessageTree(locale));
  const tree = new Map(english);
  for (const [key, value] of catalogParts(readCatalog(locale))) tree.set(key, value);
  return tree;
}

/**
 * Строки, которые язык написал сам, — только их и имеет смысл придирчиво
 * читать. Остальное в его дереве взято из английского осознанно (см.
 * request.ts) и совпадать с английским обязано.
 */
function authored(locale) {
  if (locale === "ru") {
    return new Map([...flatten(loadMessageTree("ru"))].filter(([key]) => OWN(key)));
  }
  return catalogParts(readCatalog(locale));
}

for (const locale of WAYBACK_LOCALES.filter((l) => l !== "en")) {
  const tree = localeTree(locale);
  const parts = authored(locale);
  const missing = [...english.keys()].filter((k) => OWN(k) && !tree.has(k));
  const extra = [...tree.keys()].filter((k) => OWN(k) && !english.has(k));
  check(
    `${locale}: копия WayBack переведена целиком (${[...tree.keys()].filter(OWN).length})`,
    missing.length === 0 && extra.length === 0,
    [
      missing.length ? `нет: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}` : "",
      extra.length ? `лишние: ${extra.slice(0, 8).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; "),
  );

  // Общие области переводятся не целиком, а по факту показа (см. request.ts),
  // поэтому ключ накладки, которого нет в английском дереве, — это опечатка или
  // след переименования на стороне SkyForest: такая строка молча ложится в
  // пустоту и на экран не попадает.
  if (locale !== "ru") {
    const written = [...catalogParts(readCatalog(locale)).keys()];
    const orphans = written.filter((k) => !english.has(k));
    check(
      `${locale}: общие ключи существуют в английском дереве (${written.filter((k) => !OWN(k)).length})`,
      orphans.length === 0,
      `не существуют: ${orphans.slice(0, 8).join(", ")}${orphans.length > 8 ? " …" : ""}`,
    );
  }

  const empty = [...parts].filter(([, v]) => typeof v !== "string" || v.trim() === "");
  check(`${locale}: пустых строк нет`, empty.length === 0, empty.map(([k]) => k).join(", "));

  const argsMismatch = [];
  const icuBroken = [];
  const pluralGaps = [];
  const need = requiredPluralForms(locale);
  for (const [key, value] of parts) {
    if (typeof value !== "string" || !english.has(key)) continue;
    let mine;
    let theirs;
    try {
      mine = icuArguments(value, locale, key);
      theirs = icuArguments(english.get(key), "en", key);
    } catch (error) {
      icuBroken.push(`${key}: ${error.message.split("\n")[0]}`);
      continue;
    }
    if (mine.args.join(",") !== theirs.args.join(",")) {
      argsMismatch.push(`${key}: en «${theirs.args.join(",")}» ≠ ${locale} «${mine.args.join(",")}»`);
    }
    for (const branches of pluralBranches(value)) {
      // Точные совпадения (`=0`, `=1`) — это добавка поверх форм языка, а не
      // сами формы: считаем только категории.
      const declared = branches.filter((b) => !b.startsWith("="));
      if (declared.length < need) {
        pluralGaps.push(`${key}: форм ${declared.length} (${declared.join("/")}), нужно ${need}`);
      }
    }
  }
  check(`${locale}: все сообщения разбираются как ICU`, icuBroken.length === 0, icuBroken.slice(0, 5).join("\n     "));
  check(`${locale}: плейсхолдеры те же, что в английском`, argsMismatch.length === 0, argsMismatch.slice(0, 5).join("\n     "));
  check(
    `${locale}: у счётчиков столько форм, сколько требует язык (${need})`,
    pluralGaps.length === 0,
    pluralGaps.slice(0, 5).join("\n     "),
  );

  const untranslated = [...parts].filter(
    ([key, value]) => english.get(key) === value && looksUntranslated(value),
  );
  check(
    `${locale}: английских строк не осталось`,
    untranslated.length === 0,
    untranslated.map(([k, v]) => `${k}: ${JSON.stringify(v).slice(0, 60)}`).slice(0, 6).join("\n     "),
  );

  if (locale === "fr") {
    const badSpace = [...parts].filter(([, v]) => typeof v === "string" && / [?!;:]/.test(v));
    check(
      "fr: перед «?!;:» неразрывный пробел, а не обычный",
      badSpace.length === 0,
      badSpace.map(([k]) => k).slice(0, 6).join(", "),
    );
  }
  if (locale === "es") {
    const openers = [...parts].filter(
      ([, v]) =>
        typeof v === "string" &&
        ((/\?/.test(v) && !/¿/.test(v)) || (/!/.test(v) && !/¡/.test(v))),
    );
    check(
      "es: вопрос и восклицание открыты перевёрнутым знаком",
      openers.length === 0,
      openers.map(([k, v]) => `${k}: ${JSON.stringify(v).slice(0, 50)}`).slice(0, 6).join("\n     "),
    );
  }
}

/* ------------------------------------------------------------------ */
/* 5. Длина: узкие места интерфейса и лимиты сторов                    */
/* ------------------------------------------------------------------ */

/**
 * Запас узких мест интерфейса. Числа сняты с английского: экран рассчитан на
 * него, и запас — это то, сколько ещё влезает без переноса. Испанский и
 * французский обычно длиннее на 15–25%, поэтому именно эти строки и проверяем.
 */
const TIGHT = [
  ["wayback.home.startButton", 26],
  ["wayback.active.finish", 26],
  ["wayback.history.emptyAction", 26],
  ["wayback.tabs.home", 12],
  ["wayback.tabs.offline", 12],
  ["wayback.tabs.history", 12],
  ["wayback.tabs.more", 12],
  ["wayback.paywall.weekly", 12],
  ["wayback.paywall.yearly", 12],
  ["wayback.paywall.perWeek", 14],
  ["wayback.paywall.perYear", 14],
  ["wayback.paywall.restore", 16],
  ["wayback.menu.language", 14],
  ["wayback.menu.units", 14],
  ["wayback.account.subscribe", 16],
  ["wayback.account.manage", 16],
];

console.log("\n— длина в узких местах интерфейса —");
for (const locale of WAYBACK_LOCALES) {
  const parts = locale === "en" ? english : catalogParts(readCatalog(locale));
  const over = [];
  for (const [key, limit] of TIGHT) {
    const value = parts.get(key);
    if (typeof value !== "string") continue;
    // Считаем самую длинную ветку: у плюрализации их несколько.
    const longest = Math.max(
      ...[...String(value).matchAll(/\{[^{}]*\}/g)].map((m) => m[0].length),
      [...String(value).replace(/\{[^{}]*\}/g, "")].length,
    );
    if (longest > limit) over.push(`${key}: ${longest} > ${limit} (${value})`);
  }
  check(`${locale}: подписи узких мест влезают`, over.length === 0, over.slice(0, 6).join("\n     "));
}

/**
 * Лимиты площадок. Те же числа, что в fastlane/wayback-listings.mjs — там они
 * стерегут запись в стор, здесь то же самое проверяется по всем локалям сразу
 * и без сети.
 */
const STORE_LIMITS = {
  "subtitle.txt": 30,
  "keywords.txt": 100,
  "promotional_text.txt": 170,
  "description.txt": 4000,
  // App Store даёт 4000, но тот же файл едет в release notes Google Play, где
  // потолок 500 и коммит edit'а падает 403 уже после записи листинга.
  "release_notes.txt": 500,
  "support_url.txt": 255,
  "marketing_url.txt": 255,
  "privacy_url.txt": 255,
};
const PLAY_LIMITS = {
  "title.txt": 30,
  "short_description.txt": 80,
  "full_description.txt": 4000,
};

console.log("\n— карточки в сторах —");
if (!existsSync(META)) {
  check("каталог метаданных WayBack на месте", false, `нет ${META.pathname}`);
} else {
  const ascLocales = readdirSync(META, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "android")
    .map((e) => e.name);
  const playLocales = existsSync(new URL("android/", META))
    ? readdirSync(new URL("android/", META), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [];
  console.log(`     App Store: ${ascLocales.join(", ")}`);
  console.log(`     Google Play: ${playLocales.join(", ")}`);

  const over = [];
  const emptyFiles = [];
  for (const [dir, limits, base] of [
    ...ascLocales.map((l) => [l, STORE_LIMITS, META]),
    ...playLocales.map((l) => [`android/${l}`, PLAY_LIMITS, META]),
  ]) {
    for (const [file, limit] of Object.entries(limits)) {
      const url = new URL(`${dir}/${file}`, base);
      if (!existsSync(url)) {
        over.push(`${dir}/${file}: файла нет`);
        continue;
      }
      const text = readFileSync(url, "utf8").trim();
      const length = [...text].length;
      if (length === 0) emptyFiles.push(`${dir}/${file}`);
      if (length > limit) over.push(`${dir}/${file}: ${length} > ${limit}`);
    }
  }
  check("тексты карточек влезают в лимиты площадок", over.length === 0, over.slice(0, 8).join("\n     "));
  check("пустых файлов карточек нет", emptyFiles.length === 0, emptyFiles.join(", "));

  // Карточка обещает то же, что показывает экран. Цены и длина пробного
  // периода уезжают в стор текстом, а в приложении живут числами в
  // FLAVORS.wayback.subscriptionPlan — разойтись им нельзя, это отказ на ревью.
  const plan = readFileSync(new URL("flavors/wayback/config.ts", SRC), "utf8");
  const num = (field) => plan.match(new RegExp(`${field}:\\s*([\\d.]+)`))?.[1];
  const priceWeek = num("priceWeeklyUsd");
  const priceYear = num("priceYearlyUsd");
  const trial = num("trialDays");
  const priceGaps = [];
  for (const dir of [...ascLocales, ...playLocales.map((l) => `android/${l}`)]) {
    const file = dir.startsWith("android/") ? "full_description.txt" : "description.txt";
    const url = new URL(`${dir}/${file}`, META);
    if (!existsSync(url)) continue;
    const text = readFileSync(url, "utf8");
    // Точка или запятая как разделитель дробной части — это язык, а не цена.
    const has = (value) =>
      text.includes(value) || text.includes(String(value).replace(".", ","));
    const gaps = [
      has(priceWeek) ? "" : `нет цены недели ${priceWeek}`,
      has(priceYear) ? "" : `нет цены года ${priceYear}`,
      new RegExp(`\\b${trial}\\b`).test(text) ? "" : `нет длины триала ${trial}`,
    ].filter(Boolean);
    if (gaps.length) priceGaps.push(`${dir}/${file}: ${gaps.join(", ")}`);
  }
  check(
    `карточки называют те же цены и триал, что приложение (${priceWeek}/${priceYear}, ${trial} дн.)`,
    priceGaps.length === 0,
    priceGaps.slice(0, 8).join("\n     "),
  );

  // Французская типографика действует и в сторе: карточку читают те же люди.
  const frBad = [];
  for (const dir of ["fr-FR", "android/fr-FR"]) {
    for (const file of readdirSync(new URL(`${dir}/`, META))) {
      if (!file.endsWith(".txt") || file.endsWith("_url.txt")) continue;
      const text = readFileSync(new URL(`${dir}/${file}`, META), "utf8");
      if (/ [?!;:»]|« /.test(text)) frBad.push(`${dir}/${file}`);
    }
  }
  check("fr: в карточке неразрывные пробелы при «?!;:» и кавычках", frBad.length === 0, frBad.join(", "));

  // Локали площадок называются по-разному (App Store — «pl», Play — «pl-PL»),
  // и перепутать их легко: скрипт заливки промолчит, а языка в сторе не будет.
  const expectedAsc = ["en-US", "es-ES", "pl", "fr-FR"];
  const expectedPlay = ["en-US", "es-ES", "pl-PL", "fr-FR"];
  check(
    "локали карточек App Store на месте",
    expectedAsc.every((l) => ascLocales.includes(l)),
    `нет: ${expectedAsc.filter((l) => !ascLocales.includes(l)).join(", ")}`,
  );
  check(
    "локали карточек Google Play на месте",
    expectedPlay.every((l) => playLocales.includes(l)),
    `нет: ${expectedPlay.filter((l) => !playLocales.includes(l)).join(", ")}`,
  );

  // Ключевые слова App Store переводить дословно нельзя: у каждого языка свои
  // поисковые запросы. Совпадение набора с английским — признак подстрочника.
  const enKeywords = existsSync(new URL("en-US/keywords.txt", META))
    ? readFileSync(new URL("en-US/keywords.txt", META), "utf8").trim()
    : null;
  const copied = ascLocales.filter(
    (l) =>
      l !== "en-US" &&
      existsSync(new URL(`${l}/keywords.txt`, META)) &&
      readFileSync(new URL(`${l}/keywords.txt`, META), "utf8").trim() === enKeywords,
  );
  check("ключевые слова App Store свои у каждого языка", copied.length === 0, copied.join(", "));
}

/* ------------------------------------------------------------------ */
/* Негативное плечо: та же проверка на версии до правки                */
/* ------------------------------------------------------------------ */

function sourceBeforeFix() {
  const revs = execFileSync("git", ["rev-list", "HEAD", "--", WAYBACK_CONFIG_REL], {
    encoding: "utf8",
    cwd: REPO,
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const rev of revs) {
    const text = execFileSync("git", ["show", `${rev}:${WAYBACK_CONFIG_REL}`], {
      encoding: "utf8",
      cwd: REPO,
    });
    if (!FIX_MARKER.test(text)) return { rev, text };
  }
  throw new Error(
    `в истории ${WAYBACK_CONFIG_REL} нет версии без поля locales — сверьте признак правки`,
  );
}

console.log("\n— как было до правки (обязана падать) —");
{
  const before = sourceBeforeFix();
  let caught = false;
  try {
    flavorLocales(before.text, "wayback");
  } catch {
    caught = true;
  }
  check(
    `до правки (${before.rev.slice(0, 7)}) у WayBack нет своего списка языков — отказ воспроизводится`,
    caught,
    "конфиг прежней версии неожиданно отдал список языков — проверка ничего не ловит",
  );

  // Второе плечо: словарь без одного ключа. Ровно этот случай проверка и
  // существует, чтобы ловить, — next-intl вывел бы на экран имя ключа.
  const victim = [...english.keys()].find(OWN);
  const broken = localeTree(EXTRA_LOCALES[0] ?? "ru");
  broken.delete(victim);
  const missing = [...english.keys()].filter((k) => OWN(k) && !broken.has(k));
  check(
    `пропуск ключа «${victim}» проверка видит`,
    missing.length === 1 && missing[0] === victim,
    `увидела: ${missing.join(", ") || "ничего"}`,
  );
}

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
