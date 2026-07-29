#!/usr/bin/env node
/**
 * Экраны коллекции квестов, достижений на аккаунте и карточки «квест закрыт».
 *
 * Прогресс приложение читает из Supabase прямо из браузера (RLS «только свои»),
 * поэтому подменяется не роут приложения, а ответ PostgREST на
 * `mushroom_identifications`. Экраны при этом настоящие: подставлены только
 * записи истории.
 *
 * Запуск: node scripts/capture-checker-quests.mjs [origin]
 * Выход:  docs/checker-quests/*.png
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-quests");
const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

/** Восемь закрытых квестов: первый уровень целиком, второй наполовину. */
const FOUND = [
  ["Cantharellus cibarius", "2026-07-27"],
  ["Boletus reticulatus", "2026-07-26"],
  ["Armillaria mellea", "2026-07-24"],
  ["Suillus luteus", "2026-07-18"],
  ["Russula aeruginea", "2026-07-12"],
  ["Macrolepiota procera", "2026-07-08"],
  ["Leccinum scabrum", "2026-07-02"],
  ["Morchella esculenta", "2026-05-04"],
];

/** Заглушки снимков: важен не сюжет, а что в плитке фотография, а не дырка. */
const swatch = async (r, g, b) =>
  `data:image/jpeg;base64,${(
    await sharp({ create: { width: 400, height: 400, channels: 3, background: { r, g, b } } })
      .jpeg()
      .toBuffer()
  ).toString("base64")}`;

const PHOTOS = [
  await swatch(196, 148, 60),
  await swatch(140, 104, 66),
  await swatch(168, 122, 74),
  await swatch(122, 96, 62),
  await swatch(104, 122, 78),
  await swatch(176, 160, 120),
  await swatch(128, 110, 88),
  await swatch(150, 128, 96),
];

const rows = FOUND.map(([name, date], i) => ({
  id: `demo-${i}`,
  photo_path: null,
  top_species: name,
  top_probability: 0.82 - i * 0.03,
  created_at: `${date}T10:00:00.000Z`,
  result_json: {
    suggestions: [
      {
        rank: 1,
        scientific_name: name,
        common_name: null,
        probability: 0.82 - i * 0.03,
        reference_photo_url: PHOTOS[i % PHOTOS.length],
        wikipedia_url: `https://en.wikipedia.org/wiki/${name.replace(/ /g, "_")}`,
        gbif_url: null,
        toxic: null,
        toxic_source: null,
      },
    ],
    details: { scientific_name: name },
  },
}));

/** Распознавание, которое закрывает квест: вид из первого уровня. */
const IDENTIFY = {
  id: "unlock-1",
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
    summary: "A golden, funnel-shaped mushroom with blunt folds instead of gills.",
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
  create: { width: 900, height: 900, channels: 3, background: { r: 196, g: 148, b: 60 } },
})
  .jpeg()
  .toBuffer();

const SUBSCRIPTION = {
  subscription: {
    period: "yearly",
    is_trial: false,
    identify_limit: null,
    identify_used: 12,
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function login(page, locale) {
  await page.goto(`${ORIGIN}/${locale}/login`, { waitUntil: "domcontentloaded" });
  await sleep(2000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[form="ck-login"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
  await sleep(3500);
}

/** История: отдаём свои записи (или пусто) вместо ответа PostgREST. */
async function mockHistory(page, data) {
  await page.route("**/rest/v1/mushroom_identifications*", (r) =>
    r.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

const snap = async (page, file) => {
  await page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {});
  await page.screenshot({ path: join(OUT, file) });
  console.log(`✓ ${file}`);
};

const ONLY = process.env.SHOT_ONLY || "";

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
  await login(page, locale);
  await page.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));

  if (!ONLY || ONLY === "quests") {
    await mockHistory(page, rows);
    await page.goto(`${ORIGIN}/${locale}/dashboard/quests`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(3000);
    await snap(page, `${tag}-01-quests-top.png`);
    await page.mouse.wheel(0, 700);
    await sleep(600);
    await snap(page, `${tag}-02-quests-levels.png`);
    await page.mouse.wheel(0, 700);
    await sleep(600);
    await snap(page, `${tag}-03-quests-bottom.png`);

    // Шит вида: сначала найденный, потом цель без фотографии.
    await page.mouse.wheel(0, -1400);
    await sleep(600);
    await page.click('#main-content [aria-label*="chanterelle"], #main-content [aria-label*="Лисичка"]');
    await sleep(700);
    await snap(page, `${tag}-04-species-found.png`);
    await page.keyboard.press("Escape");
    await sleep(500);
    await page.mouse.wheel(0, 900);
    await sleep(600);
    await page
      .click('#main-content [aria-label*="milkcap"], #main-content [aria-label*="Рыжик"]')
      .catch(() => {});
    await sleep(700);
    await snap(page, `${tag}-05-species-target.png`);
    await page.keyboard.press("Escape");
    await sleep(400);
  }

  // Пустая коллекция: так раздел выглядит у нового пользователя.
  if (!ONLY || ONLY === "empty") {
    const empty = await ctx.newPage();
    await empty.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
    await mockHistory(empty, []);
    await empty.goto(`${ORIGIN}/${locale}/dashboard/quests`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(3000);
    await snap(empty, `${tag}-06-quests-empty.png`);
    await empty.close();
  }

  // Достижения на аккаунте.
  if (!ONLY || ONLY === "account") {
    await mockHistory(page, rows);
    await page.goto(`${ORIGIN}/${locale}/account`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    await snap(page, `${tag}-07-account.png`);
  }

  // Карточка «квест закрыт» в результате распознавания.
  if (!ONLY || ONLY === "unlock") {
    const win = await ctx.newPage();
    await win.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
    await mockHistory(win, [
      {
        id: "unlock-1",
        photo_path: null,
        top_species: "Cantharellus cibarius",
        top_probability: 0.91,
        created_at: "2026-07-29T09:00:00.000Z",
        result_json: IDENTIFY,
      },
    ]);
    await win.route("**/api/mushrooms/identify", async (r) => {
      await sleep(900);
      await r.fulfill({ json: IDENTIFY });
    });
    await win.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(3000);
    const chooser = win.waitForEvent("filechooser");
    await win.click(
      '#main-content button:has-text("From gallery"), #main-content button:has-text("Из галереи")',
    );
    await (await chooser).setFiles({
      name: "mushroom.jpg",
      mimeType: "image/jpeg",
      buffer: PHOTO,
    });
    await sleep(900);
    await win
      .click(
        '#main-content button:has-text("Identify"), #main-content button:has-text("Определить"), #main-content button:has-text("Распознать")',
      )
      .catch(() => {});
    await sleep(700);
    await win.click('[role="dialog"] button >> nth=0');
    await sleep(3500);
    await snap(win, `${tag}-08-result-unlock.png`);
    await win.close();
  }

  await ctx.close();
}

await browser.close();
