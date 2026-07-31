#!/usr/bin/env node
/**
 * Главный экран с новым заголовком, фотографией-обрывком и переключателями
 * языка/темы в углу — плюс экран подписки с недельным и годовым тарифами.
 *
 * Снимается в двух схемах (тёмная — основная, светлая — по выбору) и на двух
 * размерах: обычный телефон 393×852 и короткий 375×667 (iPhone SE 3), на
 * котором экран обязан помещаться без прокрутки вместе с предупреждением.
 *
 * Локально нет SUPABASE_SERVICE_ROLE_KEY, поэтому `/api/subscription` отдаёт
 * 500 — подменяем его; историю распознаваний (PostgREST) отдаём пустой, чтобы
 * карточка достижений не влияла на композицию.
 *
 * Запуск: node scripts/capture-checker-home-prices.mjs [origin]
 * Выход:  docs/checker-home-prices/*.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-home-prices");
const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

/** Идёт пробный период: на главном экране видна карточка остатка. */
const TRIAL = {
  subscription: {
    tier: "checker",
    period: "weekly",
    status: "active",
    platform: "ios",
    is_trial: true,
    identify_limit: 10,
    identify_used: 3,
    quota_resets_at: "2035-01-01T00:00:00.000Z",
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

/** Подписки нет — пейволл показывает тарифы. */
const NO_SUB = { subscription: null };

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const snap = async (page, file, full = false) => {
  await page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {});
  await page.screenshot({ path: join(OUT, file), fullPage: full });
  console.log(`✓ ${file}`);
};

for (const theme of ["dark", "light"]) {
  for (const size of [
    { name: "393x852", width: 393, height: 852 },
    { name: "375x667", width: 375, height: 667 },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      locale: "en-GB",
    });
    await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
    const page = await ctx.newPage();
    // Dev-сервер компилирует роуты по запросу: первая навигация на экран
    // подписки в холодном состоянии не укладывается в штатные 30 с.
    page.setDefaultNavigationTimeout(90000);

    let sub = TRIAL;
    await page.route("**/api/subscription", (r) => r.fulfill({ json: sub }));
    await page.route("**/rest/v1/mushroom_identifications*", (r) =>
      r.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: "[]",
      }),
    );

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
    await snap(page, `${theme}-${size.name}-01-home.png`);

    // Тот же экран по-русски: переключатель языка в углу шапки.
    await page.getByRole("group", { name: "Language" }).getByText("RU").click();
    await page.waitForURL(/\/ru\//, { timeout: 20000 }).catch(() => {});
    await sleep(2500);
    await snap(page, `${theme}-${size.name}-02-home-ru.png`);

    // Пейволл: подписки нет, видны недельный и годовой тарифы.
    sub = NO_SUB;
    await page.goto(`${ORIGIN}/en/payment`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    await snap(page, `${theme}-${size.name}-03-paywall-yearly.png`);

    await page.getByRole("button", { name: "Weekly", exact: true }).click();
    await sleep(600);
    await snap(page, `${theme}-${size.name}-04-paywall-weekly.png`);

    await ctx.close();
  }
}

await browser.close();
