#!/usr/bin/env node
/**
 * Замена уже выбранного снимка: экран превью и экран результата.
 *
 * Проверяется то, чего в приложении не было — из обоих состояний доступны и
 * съёмка, и выбор файла из галереи. Заодно снимается повторный выбор из
 * галереи поверх уже выбранного кадра (второй файл другого цвета — видно,
 * что превью действительно заменилось).
 *
 * Локально нет SUPABASE_SERVICE_ROLE_KEY, поэтому `/api/subscription` и
 * `/api/mushrooms/identify` подменяются; история распознаваний (PostgREST)
 * отдаётся пустой, чтобы карточка закрытого квеста не перекрывала результат.
 *
 * Запуск: node scripts/capture-checker-replace-photo.mjs [origin]
 * Выход:  docs/checker-replace-photo/*.png
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-replace-photo");
const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

const photo = async (r, g, b) =>
  sharp({ create: { width: 900, height: 900, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();

/** Первый кадр — «не тот», второй — тот, ради которого чинили экран. */
const WRONG = await photo(150, 122, 96);
const RIGHT = await photo(196, 148, 60);

const SUBSCRIPTION = {
  subscription: {
    period: "yearly",
    is_trial: false,
    identify_limit: null,
    identify_used: 3,
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

const IDENTIFY = {
  id: "shot-1",
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
    {
      rank: 2,
      scientific_name: "Hygrophoropsis aurantiaca",
      common_name: "False chanterelle",
      probability: 0.06,
      reference_photo_url: null,
      wikipedia_url: null,
      gbif_url: null,
      toxic: null,
      toxic_source: null,
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

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const snap = async (page, file) => {
  await page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {});
  await page.screenshot({ path: join(OUT, file) });
  console.log(`✓ ${file}`);
};

/** Выбор файла через системный диалог: кнопки открывают <input type=file>. */
async function pick(page, name, buffer) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name, exact: true }).click();
  await (await chooser).setFiles({ name: "mushroom.jpg", mimeType: "image/jpeg", buffer });
  await sleep(900);
}

for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "en-GB",
  });
  await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
  const page = await ctx.newPage();

  await page.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
  await page.route("**/rest/v1/mushroom_identifications*", (r) =>
    r.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "[]",
    }),
  );
  await page.route("**/api/mushrooms/identify", async (r) => {
    await sleep(900);
    await r.fulfill({ json: IDENTIFY });
  });

  await page.goto(`${ORIGIN}/en/login`, { waitUntil: "domcontentloaded" });
  await sleep(2000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[form="ck-login"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
  await sleep(3000);

  await page.goto(`${ORIGIN}/en/dashboard/identify`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);

  // Случайно выбран не тот снимок.
  await pick(page, "From gallery", WRONG);
  await snap(page, `${theme}-01-preview.png`);

  // Замена тем же способом: повторный выбор из галереи прямо из превью.
  await pick(page, "Gallery", RIGHT);
  await snap(page, `${theme}-02-preview-replaced.png`);

  // И съёмкой — кнопка рядом (в браузере это тот же диалог файла).
  await pick(page, "Retake", RIGHT);
  await snap(page, `${theme}-03-preview-retake.png`);

  await page.getByRole("button", { name: /^Identify/ }).first().click();
  await sleep(700);
  await page.click('[role="dialog"] button >> nth=0');
  await sleep(4000);
  await snap(page, `${theme}-04-result-top.png`);

  await page.mouse.wheel(0, 4000);
  await sleep(800);
  await snap(page, `${theme}-05-result-actions.png`);

  // Из результата — сразу другой файл из галереи, без возврата на главный.
  await pick(page, "From gallery", WRONG);
  await sleep(600);
  await snap(page, `${theme}-06-back-to-preview.png`);

  await ctx.close();
}

await browser.close();
