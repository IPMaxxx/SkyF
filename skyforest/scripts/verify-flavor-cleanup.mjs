#!/usr/bin/env node
/**
 * Проверка брендирования и «лишних» сущностей в трёх флейворах на локальной
 * прод-сборке. Хосты подменяются host-resolver-rules Chromium, поэтому
 * skyforest.ai / checker.skyforest.ai / wayback.skyforest.ai ведут на
 * localhost:PORT и middleware видит настоящий Host.
 *
 * Запуск (из каталога skyforest, при поднятом `npm start`):
 *   node scripts/verify-flavor-cleanup.mjs [port]
 *
 * Учётные данные демо-аккаунта: UI_FLOWS_EMAIL / UI_FLOWS_PASSWORD.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] || "3999";
const OUT = "/tmp/flavor-verify";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD = process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const HOSTS = {
  skyforest: "skyforest.ai",
  checker: "checker.skyforest.ai",
  wayback: "wayback.skyforest.ai",
};

/** Слова, которых не должно быть в интерфейсе флейворов. */
const FORBIDDEN = [
  "SkyForest",
  "токен",
  "Токен",
  "token",
  "Token",
  "Referral",
  "referral",
  "рефер",
  "Marketplace",
  "маркетплейс",
  "Weather",
  "погод",
  "Tours",
  "туры",
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    `--host-resolver-rules=MAP skyforest.ai 127.0.0.1:${PORT},MAP checker.skyforest.ai 127.0.0.1:${PORT},MAP wayback.skyforest.ai 127.0.0.1:${PORT}`,
  ],
});

for (const [flavor, host] of Object.entries(HOSTS)) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    geolocation: { latitude: 53.9412, longitude: 27.3168 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();
  const base = `http://${host}`;

  await page.goto(`${base}/en/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 45000 }).catch(() => {}),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await page.waitForTimeout(2500);
  console.log(`\n=== ${flavor} (after login: ${page.url()})`);

  const home =
    flavor === "checker"
      ? "/en/dashboard/identify"
      : flavor === "wayback"
        ? "/en/dashboard/track"
        : "/en/dashboard";

  for (const path of ["/en/account", home, "/en/payment"]) {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const text = await page.locator("body").innerText();
    await page.screenshot({
      path: `${OUT}/${flavor}${path.replace(/\//g, "-")}.png`,
      fullPage: true,
    });
    const hits = FORBIDDEN.filter((w) => text.includes(w));
    console.log(`  ${path}: ${text.length} chars; forbidden hits: ${hits.join(", ") || "none"}`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
