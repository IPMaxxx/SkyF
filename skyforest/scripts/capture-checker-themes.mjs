#!/usr/bin/env node
/**
 * Снимает экраны Mushroom Checker в обеих схемах и на обоих языках.
 *
 * Схема приезжает кукой `ck-theme` — её же читает сервер, поэтому страница
 * сразу рендерится в нужных цветах и на снимке нет светлой вспышки.
 *
 * Запуск: node scripts/capture-checker-themes.mjs [origin]
 * Выход:  docs/checker-theme/<схема>-<язык>-*.png
 */
import { chromium } from "playwright";
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

const NATIVE_INIT = () => {
  window.CapacitorCustomPlatform = { name: "ios", plugins: {} };
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
};

/** Значок сборки Next перекрывает нижнюю панель — на снимках он не нужен. */
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const THEMES = (process.env.SHOT_THEMES || "dark,light").split(",");

const snap = async (page, file) => {
  await page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {});
  await page.screenshot({ path: join(OUT, file) });
};

for (const theme of THEMES) {
  for (const locale of ["en", "ru"]) {
    const tag = `${theme}-${locale}`;
    const makeContext = async (native) => {
      const c = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
        locale: locale === "ru" ? "ru-RU" : "en-GB",
      });
      if (native) await c.addInitScript(NATIVE_INIT);
      await c.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
      return c;
    };

    // Посадочная — только веб: в нативной оболочке гость сразу уходит на вход.
    const webCtx = await makeContext(false);
    const webPage = await webCtx.newPage();
    await webPage.goto(`${ORIGIN}/${locale}`, { waitUntil: "domcontentloaded" });
    await sleep(2500);
    await snap(webPage, `${tag}-01-landing.png`);
    console.log(`✓ ${tag}-01-landing ← ${webPage.url()}`);
    await webCtx.close();

    const ctx = await makeContext(true);
    const page = await ctx.newPage();

    const shot = async (name, path, wait = 2500) => {
      await page.goto(`${ORIGIN}${path}`, { waitUntil: "domcontentloaded" });
      await sleep(wait);
      await snap(page, `${tag}-${name}.png`);
      console.log(`✓ ${tag}-${name} ← ${page.url()}`);
    };

    await shot("02-login", `/${locale}/login`);
    await shot("03-register", `/${locale}/register`);
    await shot("04-forgot", `/${locale}/forgot-password`);
    await shot("05-reset", `/${locale}/reset-password`);
    await shot("06-verify-mfa", `/${locale}/verify-mfa`);

    // Ошибка входа: тост и красная рамка поля — их цвета отдельные от палитры.
    await page.goto(`${ORIGIN}/${locale}/login`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(1500);
    await page.fill('input[type="email"]', "nobody@example.com");
    await page.fill('input[type="password"]', "wrong-password-123");
    await page.click('button[form="ck-login"]');
    await sleep(3500);
    await snap(page, `${tag}-07-login-error.png`);
    console.log(`✓ ${tag}-07-login-error`);

    // Кабинет — под демо-аккаунтом ревью.
    await page.goto(`${ORIGIN}/${locale}/login`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(1500);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[form="ck-login"]');
    await page
      .waitForURL(/dashboard|verify-mfa/, { timeout: 30000 })
      .catch(() => {});
    await sleep(4500);
    await snap(page, `${tag}-08-identify.png`);
    console.log(`✓ ${tag}-08-identify ← ${page.url()}`);

    await shot("09-paywall", `/${locale}/payment`, 4500);
    await shot("10-account", `/${locale}/account`, 4500);

    // Панель «Ещё» поверх домашнего экрана — там же переключатель темы.
    await page.goto(`${ORIGIN}/${locale}/dashboard/identify`, {
      waitUntil: "domcontentloaded",
    });
    await sleep(3500);
    await page.click("nav button[aria-expanded]");
    await sleep(900);
    await snap(page, `${tag}-11-more-sheet.png`);
    console.log(`✓ ${tag}-11-more-sheet`);

    await ctx.close();
  }
}

/**
 * Переключение и память выбора. Контекст стартует без куки — значит в тёмной
 * теме; жмём «Светлое», перезагружаем страницу и смотрим, что она приехала с
 * сервера уже светлой (а не мигнула тёмным и перекрасилась после гидрации).
 */
{
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "en-GB",
  });
  await ctx.addInitScript(NATIVE_INIT);
  const page = await ctx.newPage();
  const scheme = () =>
    page.evaluate(() => document.documentElement.dataset.scheme);
  const meta = () =>
    page.evaluate(
      () =>
        document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    );

  await page.goto(`${ORIGIN}/en/login`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[form="ck-login"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
  await sleep(4000);
  console.log(`старт: ${await scheme()} ${await meta()}`);

  await page.click("nav button[aria-expanded]");
  await sleep(700);
  await page.click('button:has-text("Light")');
  await sleep(700);
  await snap(page, "toggle-1-after-click-light.png");
  console.log(`после «Светлое»: ${await scheme()} ${await meta()}`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(3000);
  await snap(page, "toggle-2-after-reload.png");
  console.log(`после перезагрузки: ${await scheme()} ${await meta()}`);
  // Отдельно — то, что пришло по проводу: атрибут должен быть уже в разметке.
  const html = await (
    await ctx.request.get(`${ORIGIN}/en/dashboard/identify`)
  ).text();
  console.log(`разметка с сервера: ${html.match(/<html[^>]*>/)?.[0]}`);

  // И обратно в тёмную — вернуть демо-аккаунт в состояние по умолчанию.
  await page.click("nav button[aria-expanded]");
  await sleep(700);
  await page.click('button:has-text("Dark")');
  await sleep(700);
  await snap(page, "toggle-3-back-to-dark.png");
  console.log(`после «Тёмное»: ${await scheme()} ${await meta()}`);

  await ctx.close();
}

await browser.close();
