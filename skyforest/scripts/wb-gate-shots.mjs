// Съёмка состояний стартового гейта WayBack на локальном dev-сервере.
// Одноразовый проверочный скрипт: запуск node scripts/wb-gate-shots.mjs
import pw from "../node_modules/playwright-core/index.js";
const { chromium } = pw;

const BASE = "http://wayback.localhost:3000";
const REF = "pqffvnlrsnkgjgdjwrki";
const OUT = "/tmp/wb-shots";

const SIZES = [
  { name: "430x932", width: 430, height: 932 },
  { name: "375x667", width: 375, height: 667 },
];

const TEST_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "gate-test@skyforest.ai",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

/**
 * Сессия для @supabase/ssr лежит в cookie, а не в localStorage: значение —
 * префикс `base64-` плюс base64url от JSON сессии (см. dist/main/cookies.js).
 */
function sessionCookie(ref) {
  const session = {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: TEST_USER,
  };
  const b64 = Buffer.from(JSON.stringify(session), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return {
    name: `sb-${ref}-auth-token`,
    value: `base64-${b64}`,
    domain: "wayback.localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  };
}

const SUBSCRIBED = {
  subscription: {
    tier: "wayback",
    period: "yearly",
    status: "active",
    platform: "ios",
    current_period_end: "2027-07-28T10:00:00.000Z",
    identify_used: 0,
    forecast_used: 0,
    identify_limit: 0,
    forecast_limit: 0,
    is_trial: true,
    quota_resets_at: "2026-08-28T10:00:00.000Z",
  },
};

/**
 * Нативная оболочка + при желании сессия и кеш права.
 *
 * Capacitor нельзя просто присвоить: бандл @capacitor/core позже перезапишет
 * window.Capacitor своей веб-реализацией, где isNativePlatform() === false.
 * Поэтому ставим геттер — он отдаёт настоящий объект, но с подменённой
 * платформой, а присваивания бандла складываем в `real`.
 */
function initScript({ native, cache }) {
  return `
    ${
      native
        ? `(() => {
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
           })();`
        : ""
    }
    ${
      cache
        ? `window.localStorage.setItem(
             "wb:entitlement:v1",
             ${JSON.stringify(
               JSON.stringify({
                 userId: TEST_USER.id,
                 currentPeriodEnd: "2027-07-28T10:00:00.000Z",
                 checkedAt: Date.now(),
               }),
             )}
           );`
        : ""
    }
  `;
}

const CASES = [
  {
    id: "1-gate-auth",
    note: "натив, не вошёл → шаг входа",
    path: "/dashboard/track",
    native: true,
    expect: "Sign in to start",
  },
  {
    id: "2-gate-trial",
    note: "натив, вошёл, подписки нет → шаг пробного периода",
    path: "/dashboard/track",
    native: true,
    session: true,
    api: { subscription: null },
    expect: "Start your free trial",
  },
  {
    id: "3-gate-offline",
    note: "натив, вошёл, сервер недоступен, кеша нет → нет связи",
    path: "/dashboard/track",
    native: true,
    session: true,
    api: "abort",
    expect: "No connection",
  },
  {
    id: "4-gate-offline-cached",
    note: "натив, вошёл, сервер недоступен, право в кеше → приложение",
    path: "/dashboard/track",
    native: true,
    session: true,
    cache: true,
    api: "abort",
    expect: "I'm entering the forest",
  },
  {
    id: "5-gate-subscribed",
    note: "натив, вошёл, подписка есть → приложение",
    path: "/dashboard/track",
    native: true,
    session: true,
    api: SUBSCRIBED,
    expect: "I'm entering the forest",
  },
  {
    id: "6-web-no-gate",
    note: "веб без Capacitor → приложение как раньше",
    path: "/dashboard/track",
    native: false,
    api: "unauth",
    expect: "I'm entering the forest",
  },
  {
    id: "7-web-payment",
    note: "веб, /payment без входа → не тупик, уводит на вход",
    path: "/payment",
    native: false,
    api: "unauth",
    expect: "Sign in",
  },
  {
    // Русский у WayBack включается кукой переключателя языка, а не префиксом
    // в URL: `/ru/...` next-intl уводит на путь без префикса (ru — локаль
    // сборки), после чего middleware берёт язык из NEXT_LOCALE.
    id: "8-gate-trial-ru",
    note: "шаг пробного периода по-русски (проверка плюралей)",
    path: "/dashboard/track",
    native: true,
    session: true,
    ru: true,
    api: { subscription: null },
    expect: "3 дня бесплатно",
  },
];

const browser = await chromium.launch();

for (const size of SIZES) {
  for (const c of CASES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      locale: c.ru ? "ru-RU" : "en-US",
    });
    await context.addInitScript(
      initScript({ native: c.native, cache: c.cache }),
    );
    if (c.session) await context.addCookies([sessionCookie(REF)]);
    if (c.ru)
      await context.addCookies([
        {
          name: "NEXT_LOCALE",
          value: "ru",
          domain: "wayback.localhost",
          path: "/",
        },
      ]);

    await context.route("**/api/subscription", async (route) => {
      if (c.api === "abort") return route.abort("internetdisconnected");
      if (c.api === "unauth")
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized" }),
        });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(c.api),
      });
    });

    // Профиль пользователя и прочие вызовы Supabase из вебвью не нужны:
    // тестовая сессия поддельная, пусть отвечают пусто, а не висят.
    await context.route(`https://${REF}.supabase.co/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      }),
    );

    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

    await page.goto(`${BASE}${c.path}`, { waitUntil: "networkidle" });
    // Splash-оверлей нативной оболочки гасится по таймингам хука.
    await page.waitForTimeout(4000);

    const body = await page.evaluate(() => document.body.innerText);
    const ok = body.includes(c.expect);
    // Аналитика в тесте не отвечает — её ошибки не про приложение.
    const real = errors.filter((e) => !/google-analytics|googletagmanager/.test(e));
    await page.screenshot({ path: `${OUT}/${c.id}-${size.name}.png` });
    console.log(
      `${ok ? "OK  " : "ПЛОХО"} ${c.id} [${size.name}] — ${c.note}` +
        (ok ? "" : `\n      ожидали «${c.expect}», получили: ${body.replace(/\s+/g, " ").slice(0, 160)}`) +
        (real.length ? `\n      ОШИБКИ: ${real.slice(0, 2).join(" | ")}` : ""),
    );
    await context.close();
  }
}

await browser.close();
console.log(`\nскриншоты: ${OUT}`);
