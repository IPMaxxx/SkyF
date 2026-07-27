#!/usr/bin/env node
/**
 * Визуальная проверка редизайна Mushroom Checker: снимает экраны с локального
 * dev-сервера (флейвор определяется хостом, поэтому ходим на checker.localhost).
 *
 * Запуск: node scripts/capture-checker-redesign.mjs [origin]
 * Выход:  docs/checker-redesign/*.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-redesign");
const ORIGIN = process.argv[2] || "http://checker.localhost:3000";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NATIVE_INIT = () => {
  window.CapacitorCustomPlatform = { name: "ios", plugins: {} };
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
};

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  locale: "en-GB",
});
await ctx.addInitScript(NATIVE_INIT);
const page = await ctx.newPage();

async function shot(name, path, { wait = 2500 } = {}) {
  await page.goto(`${ORIGIN}${path}`, { waitUntil: "domcontentloaded" });
  await sleep(wait);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`✓ ${name} ← ${page.url()}`);
}

await shot("01-login", "/en/login");
await shot("02-register", "/en/register");
await shot("03-forgot", "/en/forgot-password");
await shot("04-reset-invalid", "/en/reset-password");

// Логинимся демо-аккаунтом ревью, дальше — экраны кабинета.
await page.goto(`${ORIGIN}/en/login`, { waitUntil: "domcontentloaded" });
await sleep(1500);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[form="ck-login"]');
await page.waitForURL(/dashboard|verify-mfa/, { timeout: 30000 }).catch(() => {});
await sleep(4000);
await page.screenshot({ path: join(OUT, "05-home.png") });
console.log(`✓ 05-home ← ${page.url()}`);

await shot("06-paywall", "/en/payment", { wait: 4000 });
await shot("07-account", "/en/account", { wait: 4000 });

// Меню-шит поверх домашнего экрана.
await page.goto(`${ORIGIN}/en/dashboard/identify`, {
  waitUntil: "domcontentloaded",
});
await sleep(3000);
await page.click('button[aria-label="Open menu"]').catch(() => {});
await sleep(800);
await page.screenshot({ path: join(OUT, "08-menu.png") });
console.log("✓ 08-menu");

await browser.close();
