#!/usr/bin/env node
/**
 * Шапка на всех экранах, новый порядок нижнего меню и панель «Ещё» с
 * «поделиться» и иконками соседних приложений — в тёмной и светлой схеме.
 *
 * Отдельно проверяется, что меню не ездит: у панели снимается позиция до
 * прокрутки, в середине длинной истории и после отскока в конце списка. Все три
 * значения должны совпадать, иначе кадры не о чем.
 *
 * Прогресс приложение читает из Supabase прямо из браузера (RLS «только свои»),
 * поэтому подменяется не роут приложения, а ответ PostgREST на
 * `mushroom_identifications`; подписка — ответ /api/subscription. Экраны при
 * этом настоящие.
 *
 * Запуск: node scripts/capture-checker-chrome.mjs [origin]
 * Выход:  docs/checker-chrome/*.png
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-chrome");
const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

const SPECIES = [
  "Cantharellus cibarius",
  "Boletus reticulatus",
  "Armillaria mellea",
  "Suillus luteus",
  "Russula aeruginea",
  "Macrolepiota procera",
  "Leccinum scabrum",
  "Morchella esculenta",
  "Lactarius deliciosus",
  "Pleurotus ostreatus",
];

const swatch = async (r, g, b) =>
  `data:image/jpeg;base64,${(
    await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r, g, b } },
    })
      .jpeg()
      .toBuffer()
  ).toString("base64")}`;

const PHOTOS = [
  await swatch(196, 148, 60),
  await swatch(140, 104, 66),
  await swatch(168, 122, 74),
  await swatch(122, 96, 62),
  await swatch(104, 122, 78),
];

/** Двадцать находок: истории заведомо больше экрана — есть что прокручивать. */
const rows = Array.from({ length: 20 }, (_, i) => {
  const name = SPECIES[i % SPECIES.length];
  const day = String(28 - (i % 27)).padStart(2, "0");
  return {
    id: `demo-${i}`,
    photo_path: null,
    top_species: name,
    top_probability: 0.88 - i * 0.02,
    created_at: `2026-07-${day}T10:00:00.000Z`,
    result_json: {
      suggestions: [
        {
          rank: 1,
          scientific_name: name,
          common_name: null,
          probability: 0.88 - i * 0.02,
          reference_photo_url: PHOTOS[i % PHOTOS.length],
          wikipedia_url: `https://en.wikipedia.org/wiki/${name.replace(/ /g, "_")}`,
          gbif_url: null,
          toxic: null,
          toxic_source: null,
        },
      ],
      details: { scientific_name: name },
    },
  };
});

const SUBSCRIPTION = {
  subscription: {
    period: "yearly",
    is_trial: false,
    identify_limit: null,
    identify_used: 12,
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

/** Ответ распознавания: экран результата длиннее окна — его и прокручиваем. */
const IDENTIFY = {
  id: "result-1",
  suggestions: [
    {
      rank: 1,
      scientific_name: "Cantharellus cibarius",
      common_name: "Golden chanterelle",
      probability: 0.91,
      reference_photo_url: null,
      wikipedia_url: "https://en.wikipedia.org/wiki/Cantharellus_cibarius",
      gbif_url: null,
      toxic: false,
      toxic_source: "GBIF",
    },
  ],
  details: {
    scientific_name: "Cantharellus cibarius",
    common_name: "Golden chanterelle",
    family: "Cantharellaceae",
    genus: "Cantharellus",
    summary:
      "A golden, funnel-shaped mushroom with blunt folds instead of gills.",
    wikipedia_url: "https://en.wikipedia.org/wiki/Cantharellus_cibarius",
    gbif_url: null,
  },
  lookalikes: [],
  habitat: null,
  disclaimer: "Never eat a mushroom based on this result alone.",
  low_confidence: false,
  token_cost: 0,
  balance: 0,
};

const PHOTO = await sharp({
  create: {
    width: 900,
    height: 900,
    channels: 3,
    background: { r: 196, g: 148, b: 60 },
  },
})
  .jpeg()
  .toBuffer();

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function login(page, locale) {
  await page.goto(`${ORIGIN}/${locale}/login`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[form="ck-login"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
  await sleep(3500);
}

const snap = async (page, file) => {
  await page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {});
  await page.screenshot({ path: join(OUT, file) });
  console.log(`✓ ${file}`);
};

/** Верх панели меню в координатах окна: он и не должен меняться. */
const tabBarTop = (page) =>
  page.evaluate(() => {
    const nav = document.querySelector("nav[aria-label]");
    return nav ? Math.round(nav.getBoundingClientRect().top) : null;
  });

/** Прокрутка внутреннего скроллера — у документа её больше нет. */
const scrollBy = (page, dy) =>
  page.evaluate((dy) => {
    const el = document.querySelector(".ck-scroll");
    if (el) el.scrollBy({ top: dy });
    return el ? el.scrollTop : null;
  }, dy);

const report = [];

for (const [theme, locale] of [
  ["dark", "en"],
  ["light", "en"],
  ["dark", "ru"],
]) {
  const tag = `${theme}-${locale}`;
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: locale === "ru" ? "ru-RU" : "en-GB",
  });
  await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
  const page = await ctx.newPage();
  await page.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
  await page.route("**/rest/v1/mushroom_identifications*", (r) =>
    r.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows),
    }),
  );
  await login(page, locale);

  // 01 · Распознать: шапка + меню с «Распознать» по центру.
  await page.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);
  await snap(page, `${tag}-01-identify.png`);

  // 02–04 · История: верх, середина прокрутки, самый низ с отскоком.
  await page.goto(`${ORIGIN}/${locale}/dashboard/history`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);
  const top0 = await tabBarTop(page);
  await snap(page, `${tag}-02-history-top.png`);

  await scrollBy(page, 900);
  await sleep(700);
  const top1 = await tabBarTop(page);
  await snap(page, `${tag}-03-history-scrolled.png`);

  await scrollBy(page, 9000);
  await sleep(700);
  const top2 = await tabBarTop(page);
  await snap(page, `${tag}-04-history-bottom.png`);

  // Документ прокручиваться не должен вовсе — иначе меню опять поедет.
  const docScroll = await page.evaluate(() => ({
    scrollY: window.scrollY,
    docScrollable:
      document.documentElement.scrollHeight > document.documentElement.clientHeight,
  }));
  report.push(
    `${tag}: tabbar top ${top0}/${top1}/${top2} (до/середина/конец), ` +
      `window.scrollY=${docScroll.scrollY}, документ прокручивается: ${docScroll.docScrollable}`,
  );

  // 05 · Квесты, 06 · Аккаунт, 07 · Подписка — шапка и на вложенных экранах.
  await page.goto(`${ORIGIN}/${locale}/dashboard/quests`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);
  await snap(page, `${tag}-05-quests.png`);

  await page.goto(`${ORIGIN}/${locale}/account`, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await snap(page, `${tag}-06-account.png`);

  await page.goto(`${ORIGIN}/${locale}/payment`, { waitUntil: "domcontentloaded" });
  await sleep(3500);
  await snap(page, `${tag}-07-payment.png`);

  // 08 · Панель «Ещё»: «поделиться приложением» и иконки соседних приложений.
  await page.goto(`${ORIGIN}/${locale}/dashboard/history`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await page.click("nav[aria-label] button");
  await sleep(800);
  await snap(page, `${tag}-08-more.png`);
  await page.keyboard.press("Escape");
  await sleep(400);

  // 09 · Точка «есть непросмотренное» переехала на вкладку квестов.
  await page.evaluate(() => {
    window.localStorage.setItem("ck-quests-unseen", "1");
    window.dispatchEvent(new Event("ck-quests-unseen"));
  });
  await sleep(500);
  await snap(page, `${tag}-09-quests-badge.png`);

  // Прокрутка при переходе между разделами должна возвращаться к началу:
  // скроллер живёт в оболочке и переживает смену экрана.
  await scrollBy(page, 1200);
  await sleep(500);
  await page.click('nav[aria-label] a[href$="/dashboard/quests"]');
  await sleep(2500);
  await page.click('nav[aria-label] a[href$="/dashboard/history"]');
  await sleep(2500);
  const afterNav = await page.evaluate(
    () => document.querySelector(".ck-scroll")?.scrollTop ?? null,
  );
  report.push(`${tag}: прокрутка после перехода между разделами = ${afterNav}`);

  // 10–11 · Результат распознавания: экран выше окна, кнопки внизу должны
  // доскролливаться и не оказываться под меню.
  if (locale === "en") {
    const win = await ctx.newPage();
    await win.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
    await win.route("**/rest/v1/mushroom_identifications*", (r) =>
      r.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rows),
      }),
    );
    await win.route("**/api/mushrooms/identify", async (r) => {
      await sleep(600);
      await r.fulfill({ json: IDENTIFY });
    });
    await win.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(3000);
    const chooser = win.waitForEvent("filechooser");
    await win.click('#main-content button:has-text("From gallery")');
    await (await chooser).setFiles({
      name: "mushroom.jpg",
      mimeType: "image/jpeg",
      buffer: PHOTO,
    });
    await sleep(900);
    await win.click('#main-content button:has-text("Identify")').catch(() => {});
    await sleep(600);
    await win.click('[role="dialog"] button >> nth=0').catch(() => {});
    await sleep(4000);
    await snap(win, `${tag}-10-result-top.png`);
    await win.evaluate(() => {
      const el = document.querySelector(".ck-scroll");
      if (el) el.scrollTop = el.scrollHeight;
    });
    await sleep(700);
    await snap(win, `${tag}-11-result-bottom.png`);
    await win.close();
  }

  // 12 · Экран входа: шапка есть и до авторизации.
  const anon = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: locale === "ru" ? "ru-RU" : "en-GB",
  });
  await anon.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
  const anonPage = await anon.newPage();
  for (const [n, path] of [
    ["12-login", "/login"],
    ["13-register", "/register"],
    ["14-forgot-password", "/forgot-password"],
  ]) {
    await anonPage.goto(`${ORIGIN}/${locale}${path}`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(2500);
    await snap(anonPage, `${tag}-${n}.png`);
  }
  await anon.close();

  await ctx.close();
}

await browser.close();
console.log("\n" + report.join("\n"));
