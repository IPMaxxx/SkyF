#!/usr/bin/env node
/**
 * Экран оплаты WayBack на широком экране: снимки для проверки вёрстки.
 *
 * Отказ App Review от 6 августа 2026 пришёл с устройства iPad Air 11″ (M3), и
 * первый вопрос был — не ушла ли на планшете кнопка покупки за пределы вида.
 * Приложение собрано только для iPhone (TARGETED_DEVICE_FAMILY = 1), то есть на
 * планшете идёт в окне размером с телефон, но проверить вёрстку всё равно надо:
 * решение о поддержке iPad ещё может измениться.
 *
 * Экран оплаты живёт в нативной оболочке: в браузере гейт пропускает без
 * проверки, а пейволл вместо кнопки показывает «оформите в приложении». Поэтому
 * скрипт подкладывает поддельный Capacitor (`isNativePlatform() === true`) и
 * поддельный плагин покупок — так страница считает себя приложением и рисует
 * кнопку с ценой, как на телефоне.
 *
 * Экран покупки закрыт входом, а у демо-аккаунта право уже есть — поэтому
 * `/api/subscription` перехватывается и отвечает «подписки нет». Только так
 * страница показывает именно пейволл с кнопкой, а не карточку активной подписки.
 *
 * Размеры: iPad Air 11″ в двух ориентациях (820×1180 и 1180×820) и iPhone для
 * сравнения. Проверяется одно: помещается ли кнопка «Начать пробный период» в
 * видимую часть экрана — её положение печатается вместе с высотой вида.
 *
 * Запуск: WB_REVIEW_EMAIL=… WB_REVIEW_PASSWORD=… \
 *         node scripts/capture-wayback-paywall-selfcheck.mjs [origin]
 * Выход:  docs/wayback-paywall-selfcheck/*.png
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Playwright в зависимостях не объявлен — см. capture-offline-map-selfcheck.mjs. */
async function loadChromium() {
  for (const pkg of ["playwright", "playwright-core"]) {
    try {
      return (await import(pkg)).chromium;
    } catch {
      /* следующий */
    }
  }
  throw new Error("нет Playwright: npm install --no-save playwright-core");
}

/** Chromium из кеша Playwright, если пакет не знает про свою сборку сам. */
function cachedChromium() {
  const root = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(root)) return null;
  const builds = readdirSync(root)
    .filter((d) => d.startsWith("chromium-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const build of builds) {
    for (const dir of ["chrome-mac-arm64", "chrome-mac"]) {
      const bin = join(
        root,
        build,
        dir,
        "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      );
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/wayback-paywall-selfcheck");
const ORIGIN = process.argv[2] || "https://wayback.skyforest.ai";

const EMAIL = process.env.WB_REVIEW_EMAIL;
const PASSWORD = process.env.WB_REVIEW_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Экран покупки закрыт входом: нужны WB_REVIEW_EMAIL и WB_REVIEW_PASSWORD.");
  process.exit(1);
}

const SIZES = [
  { name: "ipad-portrait", viewport: { width: 820, height: 1180 } },
  { name: "ipad-landscape", viewport: { width: 1180, height: 820 } },
  { name: "iphone", viewport: { width: 393, height: 852 } },
];

/**
 * Поддельная нативная оболочка. Плагин покупок отвечает ровно настолько, чтобы
 * экран построился: список товаров с ценой и предложением.
 */
const FAKE_NATIVE = () => {
  const PRODUCT = "ai.skyforest.wayback.sub.yearly";
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
  const offer = {
    pricingPhases: [{ price: "Free" }, { price: "$3.99" }],
    order: async () => {},
  };
  const product = { id: PRODUCT, pricing: { price: "$3.99" }, getOffer: () => offer };
  window.CdvPurchase = {
    Platform: { APPLE_APPSTORE: "ios-appstore", GOOGLE_PLAY: "android-playstore" },
    ProductType: { CONSUMABLE: "consumable", PAID_SUBSCRIPTION: "paid subscription" },
    store: {
      applicationUsername: undefined,
      obfuscator: "disabled",
      register: () => {},
      error: () => {},
      when: () => {
        const chain = {
          productUpdated: () => chain,
          approved: () => chain,
          finished: () => chain,
        };
        return chain;
      },
      initialize: async () => {},
      get: (id) => (id === PRODUCT ? product : undefined),
      restorePurchases: async () => {},
      manageSubscriptions: async () => {},
    },
  };
};

mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium
  .launch({ headless: true })
  .catch(() => chromium.launch({ headless: true, executablePath: cachedChromium() }));
let problems = 0;

for (const size of SIZES) {
  const context = await browser.newContext({
    viewport: size.viewport,
    locale: "en-US",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Вход идёт БЕЗ поддельной оболочки: со включённым Capacitor страница входа
  // уходит на нативный путь соц-входа, которого в браузере нет. Поддельная
  // оболочка добавляется после входа — она нужна только экрану покупки.
  // Ждём гидрации: по клику до неё браузер отправляет форму сам, обычным GET,
  // и страница возвращается на себя же без входа.
  await page.goto(`${ORIGIN}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByPlaceholder(/you@example\.com/i).fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 60_000 });

  await context.addInitScript(FAKE_NATIVE);

  // «Подписки нет» — иначе демо-аккаунт показал бы карточку активной подписки,
  // а нам нужен именно пейволл с кнопкой.
  await context.route("**/api/subscription", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"subscription":null}' }),
  );
  await page.goto(`${ORIGIN}/en/payment`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const shot = join(OUT, `${size.name}.png`);
  await page.screenshot({ path: shot });

  // Кнопка покупки: она обязана быть в видимой части экрана целиком.
  const cta = page.getByRole("button", { name: /free day/i }).first();
  const box = (await cta.count()) > 0 ? await cta.boundingBox() : null;
  const width = await page.evaluate(
    () => document.querySelector("main")?.getBoundingClientRect().width ?? null,
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  const visible = box ? box.y >= 0 && box.y + box.height <= size.viewport.height : false;
  if (!visible || overflow > 0) problems += 1;
  console.log(
    `${visible && overflow <= 0 ? "ok  " : "FAIL"} ${size.name} ${size.viewport.width}×${size.viewport.height}: ` +
      `кнопка ${box ? `y=${Math.round(box.y)}..${Math.round(box.y + box.height)}, ширина ${Math.round(box.width)}` : "НЕ НАЙДЕНА"}` +
      `, колонка ${width ? Math.round(width) : "?"} px, горизонтальный вылет ${overflow} px`,
  );
  await context.close();
}

await browser.close();
console.log(problems === 0 ? "\nвёрстка экрана оплаты помещается во все размеры" : `\nпроблем: ${problems}`);
process.exit(problems === 0 ? 0 : 1);
