#!/usr/bin/env node
/**
 * Экран оплаты WayBack при разном ответе стора: одно плечо и второе.
 *
 * Тарифов у приложения два — неделя и год, — но показывать оба можно только
 * там, где стор их обоих одобрил. App Store и Google Play делают это в разное
 * время, поэтому экран строится не из каталога, а из ответа стора
 * (`getPurchasableSubscriptions` → `waybackPlansFor`). Флага «включить
 * недельный» в коде нет, и проверять надо именно это: экран обязан быть
 * правильным в обоих состояниях, без единой правки кода между ними.
 *
 * Скрипт подменяет ровно одно — список товаров, которые поддельный плагин
 * покупок отдаёт готовыми к заказу:
 *
 *   yearly-only — стор знает только годовой (так выглядит App Store, пока
 *                 недельный не одобрен). Ожидаем: выбора нет, цена одна,
 *                 условия говорят «в год».
 *   both        — стор отдал оба (так выглядит Google Play после активации).
 *                 Ожидаем: два тарифа, недельный первым, у годового значок
 *                 выгоды, переключение меняет и цену на кнопке, и условия.
 *
 * Негативное плечо здесь тоже есть, и оно важнее положительного: без него
 * «показываем только доступное» ничем не отличается от «показываем всё».
 *
 * Проверяется не картинка, а текст на экране, поэтому расхождение видно в
 * выводе, а не только глазами. Снимки нужны отдельно — недельный товар не
 * пропустят на ревью без кадра, где видно, что продаётся.
 *
 * Запуск (нужен локальный сервер и вход, экран покупки закрыт):
 *   npm run build && npm start
 *   WB_REVIEW_EMAIL=… WB_REVIEW_PASSWORD=… \
 *     node scripts/capture-wayback-plans-selfcheck.mjs [origin]
 * Выход: docs/wayback-plans-selfcheck/*.png
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
const OUT = join(ROOT, "docs/wayback-plans-selfcheck");
const ORIGIN = process.argv[2] || "http://wayback.localhost:3000";

const EMAIL = process.env.WB_REVIEW_EMAIL;
const PASSWORD = process.env.WB_REVIEW_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Экран покупки закрыт входом: нужны WB_REVIEW_EMAIL и WB_REVIEW_PASSWORD.");
  process.exit(1);
}

const WEEKLY = "ai.skyforest.wayback.sub.weekly";
const YEARLY = "ai.skyforest.wayback.sub.yearly";

/**
 * Поддельная нативная оболочка. `available` — то самое, что различает плечи:
 * товар без offer плагин считает незаказуемым, и экран его не покажет.
 */
const FAKE_NATIVE = (available) => {
  const PRICES = {
    "ai.skyforest.wayback.sub.weekly": "$1.99",
    "ai.skyforest.wayback.sub.yearly": "$19.99",
  };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {} };
  const make = (id) => ({
    id,
    pricing: { price: PRICES[id] },
    getOffer: () =>
      available.includes(id)
        ? { pricingPhases: [{ price: "Free" }, { price: PRICES[id] }], order: async () => {} }
        : undefined,
  });
  const products = Object.fromEntries(Object.keys(PRICES).map((id) => [id, make(id)]));
  window.CdvPurchase = {
    Platform: { APPLE_APPSTORE: "ios-appstore", GOOGLE_PLAY: "android-playstore" },
    ProductType: { CONSUMABLE: "consumable", PAID_SUBSCRIPTION: "paid subscription" },
    store: {
      applicationUsername: undefined,
      obfuscator: "disabled",
      register: () => {},
      error: () => {},
      when: () => {
        const chain = { productUpdated: () => chain, approved: () => chain, finished: () => chain };
        return chain;
      },
      initialize: async () => {},
      get: (id) => products[id],
      restorePurchases: async () => {},
      manageSubscriptions: async () => {},
    },
  };
};

const ARMS = [
  {
    name: "yearly-only",
    title: "стор отдал только годовой (App Store до одобрения недельного)",
    available: [YEARLY],
    expect: {
      plans: 1,
      hasPicker: false,
      texts: [/\$19\.99/, /\/ year/i, /then \$19\.99 per year/i],
      // Недельного тарифа не должно быть ни следа: ни цены, ни подписи, ни
      // значка выгоды — сравнивать не с чем, когда тариф один.
      absent: [/\$1\.99/, /\/ week/i, /save \d+%/i],
    },
  },
  {
    name: "both",
    title: "стор отдал оба тарифа (Google Play после активации)",
    available: [WEEKLY, YEARLY],
    expect: {
      plans: 2,
      hasPicker: true,
      // «/ week» встречается дважды и по разным поводам: как период
      // недельного тарифа и как пересчёт годового («$0.38 / week»).
      texts: [/\$1\.99/, /\$19\.99/, /\/ week/i, /\/ year/i, /save \d+%/i],
      absent: [],
    },
  },
];

mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium
  .launch({ headless: true })
  .catch(() => chromium.launch({ headless: true, executablePath: cachedChromium() }));

let problems = 0;
const note = (ok, line) => {
  if (!ok) problems += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`);
};

for (const arm of ARMS) {
  console.log(`\n=== ${arm.name}: ${arm.title} ===`);
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    locale: "en-US",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Вход идёт без поддельной оболочки: с ней страница входа уходит на нативный
  // соц-вход, которого в браузере нет. Ждём гидрации — до неё клик отправляет
  // форму обычным GET, и страница возвращается на себя же без входа.
  await page.goto(`${ORIGIN}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByPlaceholder(/you@example\.com/i).fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 60_000 });

  await context.addInitScript(FAKE_NATIVE, arm.available);
  // «Подписки нет» — у демо-аккаунта право уже есть, и без подмены экран
  // показал бы карточку активной подписки вместо тарифов.
  await context.route("**/api/subscription", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"subscription":null}' }),
  );

  await page.goto(`${ORIGIN}/en/payment`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);

  await page.screenshot({ path: join(OUT, `${arm.name}.png`), fullPage: true });

  const picker = page.getByRole("radiogroup");
  const hasPicker = (await picker.count()) > 0;
  const options = hasPicker ? await picker.getByRole("radio").count() : 1;
  const body = (await page.locator("main").innerText()).replace(/\s+/g, " ");

  note(hasPicker === arm.expect.hasPicker, `переключатель тарифов ${hasPicker ? "есть" : "нет"}`);
  note(options === arm.expect.plans, `тарифов на экране ${options}, ожидалось ${arm.expect.plans}`);
  for (const re of arm.expect.texts) note(re.test(body), `на экране есть ${re}`);
  for (const re of arm.expect.absent) note(!re.test(body), `на экране НЕТ ${re}`);

  // Кнопка покупки обязана помещаться целиком: ради неё экран и существует.
  const cta = page.getByRole("button", { name: /free day/i }).first();
  const box = (await cta.count()) > 0 ? await cta.boundingBox() : null;
  note(Boolean(box), `кнопка покупки ${box ? `найдена (y=${Math.round(box.y)})` : "НЕ НАЙДЕНА"}`);

  // На двух тарифах проверяем то, ради чего выбор и сделан: выбор меняет
  // и цену под кнопкой, и раскрытие условий.
  if (arm.expect.plans === 2) {
    const first = picker.getByRole("radio").first();
    const preselected = await picker.getByRole("radio").nth(1).getAttribute("aria-checked");
    note(preselected === "true", `предвыбран годовой (aria-checked=${preselected})`);

    await first.click();
    await page.waitForTimeout(400);
    const afterClick = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    note(/then \$1\.99 per week/i.test(afterClick), "после выбора недели условия говорят «$1.99 per week»");
    note(
      /renews automatically every week/i.test(afterClick),
      "после выбора недели продление названо недельным",
    );
    await page.screenshot({ path: join(OUT, `${arm.name}-weekly-selected.png`), fullPage: true });
  }

  await context.close();
}

await browser.close();
console.log(
  problems === 0
    ? "\nэкран оплаты верен в обоих плечах"
    : `\nрасхождений: ${problems}`,
);
process.exit(problems === 0 ? 0 : 1);
