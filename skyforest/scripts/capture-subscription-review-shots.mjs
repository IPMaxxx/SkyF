#!/usr/bin/env node
/**
 * Кадры экрана покупки для ревьюера подписки (App Store Connect → подписка →
 * App Review Screenshot).
 *
 * Apple смотрит на этот кадр, чтобы понять, что именно продаётся, поэтому на
 * нём обязаны быть название тарифа, срок, цена, автопродление и ссылки на
 * оферту с политикой. Кадры листинга для этого не годятся: они показывают
 * функции приложения, а не покупку.
 *
 * Снимаем боевые домены, а не dev-сервер: на локальной сборке в углу висит
 * значок ошибок Next.js, и он попадает в кадр.
 *
 * Учётная запись должна быть БЕЗ права на приложение, иначе пейволла не
 * увидеть — вошедшему с подпиской WayBack открывает трек, а Checker на
 * `/payment` показывает карточку активной подписки вместо тарифов. Демо-аккаунт
 * ревью (`appreview@skyforest.ai`) право как раз имеет, поэтому под ним снимать
 * нельзя: нужна временная учётка, которую после съёмки удаляют.
 *
 * У WayBack снимаем не `/payment`, а стартовый гейт на `/dashboard/track`: в
 * приложении подписка обязательна с первого запуска, и покупка живёт именно
 * там. Гейт рисуется только в нативной оболочке, поэтому Capacitor
 * подменяется init-скриптом — присваиванием это сделать нельзя, бандл
 * @capacitor/core позже перезапишет window.Capacitor своей веб-реализацией.
 *
 * Размер 1290×2796 (iPhone 6.9″) — Apple принимает кадр любой спецификации,
 * которую поддерживает приложение.
 *
 * Запуск из каталога skyforest:
 *   SHOT_EMAIL=… SHOT_PASSWORD=… node scripts/capture-subscription-review-shots.mjs
 * Выход: docs/store-shots/{wayback,checker}/subscription/*.png
 * Загрузка: node fastlane/asc-sub-review-screenshot.mjs <subscriptionId> <файл>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = process.env.SHOT_EMAIL;
const PASSWORD = process.env.SHOT_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error(
    "Нужна учётная запись БЕЗ подписки: SHOT_EMAIL и SHOT_PASSWORD.\n" +
      "Демо-аккаунт ревью не подходит — у него активное право, пейволл ему не покажут.",
  );
  process.exit(1);
}

/** Виден только в нативной оболочке, поэтому подменяем платформу. */
const AS_NATIVE = `(() => {
  let real;
  Object.defineProperty(window, "Capacitor", {
    configurable: true,
    get() {
      return Object.assign({}, real, {
        isNativePlatform: () => true,
        getPlatform: () => "ios",
      });
    },
    set(v) { real = v; },
  });
})();`;

const SHOTS = [
  {
    origin: "https://wayback.skyforest.ai",
    // Обязательный гейт на старте и есть экран покупки WayBack.
    path: "/dashboard/track",
    out: "docs/store-shots/wayback/subscription/yearly-paywall.png",
    expect: "Start 3 free days",
  },
  {
    origin: "https://checker.skyforest.ai",
    path: "/payment",
    out: "docs/store-shots/checker/subscription/yearly-paywall.png",
    expect: "$14.99",
  },
  {
    origin: "https://checker.skyforest.ai",
    path: "/payment",
    // У месячного товара свой кадр: на нём должна стоять его цена, а не годовая.
    tab: "Monthly",
    out: "docs/store-shots/checker/subscription/monthly-paywall.png",
    expect: "$2.00",
  },
];

const browser = await chromium.launch();
let failed = 0;

for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    locale: "en-US",
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(AS_NATIVE);
  const page = await ctx.newPage();

  // networkidle и пауза: по клику до гидратации форма уходит обычным GET, и
  // страница входа просто перезагружается.
  await page.goto(`${shot.origin}/login?redirect=${shot.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await page.getByPlaceholder("you@example.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForTimeout(9000);

  if (shot.tab) {
    await page.getByRole("button", { name: shot.tab, exact: true }).click();
    await page.waitForTimeout(1500);
  }

  const body = await page.evaluate(() => document.body.innerText);
  const ok = body.includes(shot.expect);
  if (!ok) failed += 1;

  const file = join(ROOT, shot.out);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: file, animations: "disabled" });
  console.log(
    `${ok ? "OK   " : "ПЛОХО"} ${shot.out}` +
      (ok ? "" : `\n      ожидали «${shot.expect}», получили: ${body.replace(/\s+/g, " ").slice(0, 200)}`),
  );
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
