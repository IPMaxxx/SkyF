#!/usr/bin/env node
/**
 * Скриншоты Mushroom Checker для сторов (английская локаль).
 *
 * Снимаем боевой checker.skyforest.ai в нативном режиме WebView. Подписка и
 * ответ распознавания подменяются, чтобы кадры были детерминированными:
 * демо-аккаунту не нужно тратить реальные определения, а результат всегда
 * один и тот же (Boletus edulis, фото — scripts/fixtures/mushrooms).
 *
 * Размеры: Apple требует 1290×2796 (6.9″), Google Play не принимает сторону
 * длиннее двойной короткой — для него отдельный проход 1290×2580.
 *
 * Запуск: node scripts/capture-checker-store-shots.mjs [origin]
 * Выход:  docs/store-shots/checker/{apple,play}/*.png
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/store-shots/checker");
const FIXTURES = join(ROOT, "scripts/fixtures/mushrooms");
const ORIGIN = process.argv[2] || "https://checker.skyforest.ai";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

/** Apple: 6.9″. Play: сторона не длиннее двойной короткой. */
const TARGETS = [
  { name: "apple", viewport: { width: 430, height: 932 } },
  { name: "play", viewport: { width: 430, height: 860 } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUrl = (f) =>
  `data:image/jpeg;base64,${readFileSync(join(FIXTURES, f)).toString("base64")}`;

const SUBSCRIPTION = {
  subscription: {
    tier: "checker",
    period: "yearly",
    status: "active",
    platform: "ios",
    current_period_end: "2027-06-14T00:00:00.000Z",
    identify_used: 7,
    forecast_used: 0,
    identify_limit: 25,
    forecast_limit: 0,
    quota_resets_at: "2026-08-12T00:00:00.000Z",
  },
};

const IDENTIFY = {
  id: "store-shot",
  low_confidence: false,
  token_cost: 0,
  balance: 0,
  suggestions: [
    {
      rank: 1,
      scientific_name: "Boletus edulis",
      common_name: "Porcini",
      probability: 0.94,
      reference_photo_url: dataUrl("mush_Boletus_edulis_sm.jpg"),
      wikipedia_url: "https://en.wikipedia.org/wiki/Boletus_edulis",
      gbif_url: "https://www.gbif.org/species/5247203",
      toxic: false,
      toxic_source: "GBIF",
    },
    {
      rank: 2,
      scientific_name: "Imleria badia",
      common_name: "Bay bolete",
      probability: 0.41,
      reference_photo_url: dataUrl("mush_Imleria_badia_sm.jpg"),
      wikipedia_url: null,
      gbif_url: null,
      toxic: false,
      toxic_source: "GBIF",
    },
    {
      rank: 3,
      scientific_name: "Tylopilus felleus",
      common_name: "Bitter bolete",
      probability: 0.09,
      reference_photo_url: dataUrl("mush_Tylopilus_felleus_sm.jpg"),
      wikipedia_url: null,
      gbif_url: null,
      toxic: true,
      toxic_source: "GBIF",
    },
  ],
  details: {
    scientific_name: "Boletus edulis",
    common_name: "Porcini",
    family: "Boletaceae",
    genus: "Boletus",
    summary:
      "A prized edible mushroom with a thick white stem and a brown, rounded cap. Grows in coniferous and deciduous forests from summer to late autumn.",
    wikipedia_url: "https://en.wikipedia.org/wiki/Boletus_edulis",
    gbif_url: null,
  },
  lookalikes: [
    {
      scientific_name: "Tylopilus felleus",
      photo_url: dataUrl("mush_Tylopilus_felleus_sm.jpg"),
    },
  ],
  habitat: null,
  disclaimer:
    "Automated photo recognition can make mistakes. Never eat a mushroom identified only by a photo.",
};

/**
 * Оболочка Capacitor: приложение должно считать себя нативным, иначе пейволл
 * покажет заглушку «оформите в приложении» вместо цен и кнопки покупки.
 * Цены при этом берутся из fallback каталога — StoreKit в браузере нет.
 */
const NATIVE_INIT = () => {
  window.CapacitorCustomPlatform = { name: "ios", plugins: {} };
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
};

async function capture({ name, viewport }) {
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 3,
    locale: "en-US",
  });
  await ctx.addInitScript(NATIVE_INIT);
  await ctx.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
  await ctx.route("**/api/mushrooms/identify", (r) =>
    r.fulfill({ json: IDENTIFY }),
  );

  const page = await ctx.newPage();
  page.on("filechooser", (fc) =>
    fc.setFiles(join(FIXTURES, "porcini_preview.jpg")).catch(() => {}),
  );

  const shot = async (file) => {
    await page.screenshot({ path: join(dir, file) });
    console.log(`  ${name}/${file}`);
  };

  await page.goto(`${ORIGIN}/en/login`, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[form="ck-login"]');
  await page.waitForURL(/dashboard/, { timeout: 45000 });
  await sleep(3500);
  await shot("01-home.png");

  await page.click('button:has-text("From gallery")');
  await sleep(3000);
  await shot("02-photo.png");

  await page.click('button:has-text("Identify")');
  await sleep(1200);
  await page.click('[role="dialog"] button:has-text("Identify")');
  await page.waitForSelector("text=Possible matches", { timeout: 30000 });
  await sleep(1500);
  await shot("03-result.png");

  await page.evaluate(() => window.scrollTo(0, 780));
  await sleep(900);
  await shot("04-details.png");

  // Пейволл продаёт приложение лучше, чем карточка активной подписки, —
  // на этом кадре отдаём «подписки нет».
  await ctx.unroute("**/api/subscription");
  await ctx.route("**/api/subscription", (r) =>
    r.fulfill({ json: { subscription: null } }),
  );
  await page.goto(`${ORIGIN}/en/payment`, { waitUntil: "domcontentloaded" });
  await sleep(5000);
  await shot("05-premium.png");

  await browser.close();
}

for (const target of TARGETS) {
  console.log(target.name);
  await capture(target);
}
console.log(`\nshots -> ${OUT}`);
