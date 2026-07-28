#!/usr/bin/env node
/**
 * Состояния Checker, до которых демо-аккаунтом не добраться: у него оплачена
 * подписка, а распознавание стоит денег. Ответы `/api/subscription` и
 * `/api/mushrooms/identify` подменяются в браузере — экраны при этом настоящие,
 * подставлены только данные.
 *
 * Запуск: node scripts/capture-checker-theme-states.mjs [origin]
 * Выход:  docs/checker-theme/state-*.png
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-theme");
const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

const NATIVE_INIT = () => {
  window.CapacitorCustomPlatform = { name: "ios", plugins: {} };
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
};

/** Пробная подписка с остатком 2 из 5 — так выглядит карточка квоты. */
const TRIAL = {
  subscription: {
    period: "monthly",
    is_trial: true,
    identify_limit: 5,
    identify_used: 3,
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

/** Ядовитый вид: красная плашка, чипы и блок двойников. */
const IDENTIFY = {
  id: "demo",
  suggestions: [
    {
      rank: 1,
      scientific_name: "Amanita muscaria",
      common_name: "Fly agaric",
      probability: 0.93,
      reference_photo_url: null,
      wikipedia_url: "https://en.wikipedia.org/wiki/Amanita_muscaria",
      gbif_url: null,
      toxic: true,
      toxic_source: "GBIF",
    },
    {
      rank: 2,
      scientific_name: "Amanita caesarea",
      common_name: "Caesar's mushroom",
      probability: 0.04,
      reference_photo_url: null,
      wikipedia_url: null,
      gbif_url: null,
      toxic: false,
      toxic_source: null,
    },
    {
      rank: 3,
      scientific_name: "Russula emetica",
      common_name: "The sickener",
      probability: 0.03,
      reference_photo_url: null,
      wikipedia_url: null,
      gbif_url: null,
      toxic: true,
      toxic_source: null,
    },
  ],
  details: {
    scientific_name: "Amanita muscaria",
    common_name: "Fly agaric",
    family: "Amanitaceae",
    genus: "Amanita",
    summary:
      "A large white-gilled mushroom with a bright red cap covered in white warts. Widely known and widely misidentified; contains ibotenic acid and muscimol.",
    wikipedia_url: "https://en.wikipedia.org/wiki/Amanita_muscaria",
    gbif_url: null,
  },
  lookalikes: [
    { scientific_name: "Amanita caesarea", photo_url: null },
    { scientific_name: "Russula aurea", photo_url: null },
  ],
  habitat: null,
  disclaimer: "Never eat a mushroom based on this result alone.",
  low_confidence: false,
  token_cost: 0,
  balance: 0,
};

/** Заглушка снимка: важен не сюжет, а то, что на месте фото не чёрный прямоугольник. */
const PHOTO = await sharp({
  create: {
    width: 900,
    height: 900,
    channels: 3,
    background: { r: 122, g: 96, b: 62 },
  },
})
  .composite([
    {
      input: await sharp({
        create: {
          width: 620,
          height: 620,
          channels: 3,
          background: { r: 178, g: 58, b: 44 },
        },
      })
        .png()
        .toBuffer(),
      left: 140,
      top: 120,
      blend: "over",
    },
  ])
  .jpeg()
  .toBuffer();

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function login(page, locale) {
  await page.goto(`${ORIGIN}/${locale}/login`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(1500);
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

const ONLY = process.env.SHOT_ONLY || "";

for (const theme of ["dark", "light"]) {
  for (const locale of ["en", "ru"]) {
    const tag = `state-${theme}-${locale}`;

    // 1. Подписки нет: предложение с тарифами и главная с призывом подписаться.
    if (!ONLY || ONLY === "paywall") {
      const ctx = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
        locale: locale === "ru" ? "ru-RU" : "en-GB",
      });
      await ctx.addInitScript(NATIVE_INIT);
      await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
      const page = await ctx.newPage();
      await login(page, locale);
      await page.route("**/api/subscription", (r) =>
        r.fulfill({ json: { subscription: null } }),
      );

      await page.goto(`${ORIGIN}/${locale}/payment`, {
        waitUntil: "domcontentloaded",
      });
      await sleep(4000);
      await snap(page, `${tag}-01-paywall-offer.png`);
      await page.mouse.wheel(0, 900);
      await sleep(700);
      await snap(page, `${tag}-02-paywall-offer-scrolled.png`);

      await page.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
        waitUntil: "domcontentloaded",
      });
      await sleep(3500);
      await snap(page, `${tag}-03-identify-no-subscription.png`);
      await ctx.close();
    }

    // 2. Пробный период: карточка квоты на главной и в подписке.
    if (!ONLY || ONLY === "trial") {
      const ctx = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
        locale: locale === "ru" ? "ru-RU" : "en-GB",
      });
      await ctx.addInitScript(NATIVE_INIT);
      await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
      const page = await ctx.newPage();
      await login(page, locale);
      await page.route("**/api/subscription", (r) => r.fulfill({ json: TRIAL }));

      await page.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
        waitUntil: "domcontentloaded",
      });
      await sleep(3500);
      await snap(page, `${tag}-04-identify-trial-quota.png`);

      await page.goto(`${ORIGIN}/${locale}/payment`, {
        waitUntil: "domcontentloaded",
      });
      await sleep(4000);
      await snap(page, `${tag}-05-subscription-trial.png`);
      await ctx.close();
    }

    // 3. Результат распознавания. Здесь контекст веб-овый: в вебе выбор файла
    //    идёт через <input>, до которого дотягивается браузер, а в оболочке —
    //    через нативную галерею, которой в тесте нет.
    if (!ONLY || ONLY === "result") {
      const ctx = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
        locale: locale === "ru" ? "ru-RU" : "en-GB",
      });
      await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
      const page = await ctx.newPage();
      await login(page, locale);

      await page.route("**/api/mushrooms/identify", async (r) => {
        await sleep(1200);
        await r.fulfill({ json: IDENTIFY });
      });

      await page.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
        waitUntil: "domcontentloaded",
      });
      await sleep(3000);

      const chooser = page.waitForEvent("filechooser");
      await page.click("#main-content button:has-text(\"From gallery\"), #main-content button:has-text(\"Из галереи\")");
      await (await chooser).setFiles({
        name: "mushroom.jpg",
        mimeType: "image/jpeg",
        buffer: PHOTO,
      });
      await sleep(900);
      await snap(page, `${tag}-06-identify-preview.png`);

      await page
        .click(
          "#main-content button:has-text(\"Identify\"), #main-content button:has-text(\"Определить\"), #main-content button:has-text(\"Распознать\")",
        )
        .catch(() => {});
      await sleep(800);
      // Перед списанием приложение переспрашивает — заодно снимок модального листа.
      await snap(page, `${tag}-07-confirm-sheet.png`);
      await page.click(`[role="dialog"] button >> nth=0`);
      await sleep(500);
      await snap(page, `${tag}-08-loading.png`);
      await sleep(2500);
      await snap(page, `${tag}-09-result-top.png`);
      await page.mouse.wheel(0, 800);
      await sleep(700);
      await snap(page, `${tag}-10-result-middle.png`);
      await page.mouse.wheel(0, 900);
      await sleep(700);
      await snap(page, `${tag}-11-result-bottom.png`);
      await ctx.close();
    }
  }
}

await browser.close();
