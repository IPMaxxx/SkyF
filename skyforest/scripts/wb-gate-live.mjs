// Живая проверка гейта на настоящей учётной записи и настоящем /api/subscription.
// Ничего не подделывает, кроме признака нативной оболочки: вход идёт через
// форму /login, право читается из user_subscriptions сервисным ключом.
// Запуск: node scripts/wb-gate-live.mjs (нужен SUPABASE_SERVICE_ROLE_KEY в env).
import pw from "../node_modules/playwright-core/index.js";
const { chromium } = pw;

const PORT = process.env.PORT ?? "3411";
const BASE = `http://wayback.localhost:${PORT}`;
const OUT = "/tmp/wb-shots";

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SB || !KEY) {
  console.error("нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const EMAIL = `wb-gate-${Date.now()}@skyforest-test.ai`;
const PASSWORD = "GateTest!2026wb";

async function admin(path, init = {}) {
  const res = await fetch(`${URL_SB}${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: init.prefer ?? "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** Нативная оболочка: подменяем только Capacitor, всё остальное настоящее. */
const NATIVE = `(() => {
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

const created = { userId: null, subId: null };

async function cleanup() {
  if (created.subId) {
    const r = await admin(`/rest/v1/user_subscriptions?id=eq.${created.subId}`, {
      method: "DELETE",
    });
    console.log(`  убрал подписку: HTTP ${r.status}`);
  }
  if (created.userId) {
    const r = await admin(`/auth/v1/admin/users/${created.userId}`, {
      method: "DELETE",
    });
    console.log(`  убрал учётку: HTTP ${r.status}`);
  }
}

try {
  console.log(`1. создаю учётку ${EMAIL}`);
  const u = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    }),
  });
  if (u.status >= 300) throw new Error(`создание: ${u.status} ${JSON.stringify(u.body)}`);
  created.userId = u.body.id;
  console.log(`   id=${created.userId}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
  });
  await context.addInitScript(NATIVE);
  const page = await context.newPage();

  const bodyText = () => page.evaluate(() => document.body.innerText);
  const check = async (label, want, shot) => {
    await page.waitForTimeout(4000);
    const text = await bodyText();
    const ok = text.includes(want);
    if (shot) await page.screenshot({ path: `${OUT}/${shot}.png` });
    console.log(
      `${ok ? "OK  " : "ПЛОХО"} ${label}` +
        (ok ? "" : ` — ожидали «${want}», получили: ${text.replace(/\s+/g, " ").slice(0, 200)}`),
    );
    return ok;
  };

  console.log("2. без входа гейт просит учётную запись");
  await page.goto(`${BASE}/dashboard/track`, { waitUntil: "networkidle" });
  await check("натив без входа → шаг входа", "Sign in to start");

  console.log("3. вхожу настоящей формой");
  await page.goto(`${BASE}/login?redirect=/dashboard/track`, {
    waitUntil: "networkidle",
  });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard\/track/, { timeout: 30000 });
  const passWithout = await check(
    "вошёл, подписки в базе нет → внутрь не пускает",
    "Start your free trial",
    "live-1-no-subscription",
  );

  // Пейволл /payment — защищённый маршрут, поддельной сессией его не открыть
  // (middleware проверяет её на сервере), поэтому снимаем здесь, с настоящей.
  console.log("3a. пейволл /payment под настоящей сессией");
  await page.goto(`${BASE}/payment`, { waitUntil: "networkidle" });
  await check("пейволл в приложении", "BEFORE YOU SUBSCRIBE", "live-3-paywall");

  console.log("4. выдаю право tier=wayback сервисным ключом");
  const now = new Date();
  const end = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  const sub = await admin("/rest/v1/user_subscriptions", {
    method: "POST",
    body: JSON.stringify({
      user_id: created.userId,
      platform: "ios",
      product_id: "ai.skyforest.wayback.sub.yearly",
      tier: "wayback",
      period: "yearly",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      is_trial: true,
    }),
  });
  if (sub.status >= 300) throw new Error(`выдача права: ${sub.status} ${JSON.stringify(sub.body)}`);
  created.subId = sub.body[0].id;
  console.log(`   строка ${created.subId}`);

  console.log("5. подписанный проходит гейт");
  await page.goto(`${BASE}/dashboard/track`, { waitUntil: "networkidle" });
  const passWith = await check(
    "вошёл, подписка есть → внутрь пускает",
    "I'm entering the forest",
    "live-2-subscribed",
  );

  console.log("6. право снято → гейт снова закрывается");
  await admin(`/rest/v1/user_subscriptions?id=eq.${created.subId}`, {
    method: "DELETE",
  });
  created.subId = null;
  await page.goto(`${BASE}/dashboard/track`, { waitUntil: "networkidle" });
  const closesAgain = await check(
    "право снято → снова пейволл",
    "Start your free trial",
  );

  await browser.close();
  console.log(
    `\nИТОГ: ${passWithout && passWith && closesAgain ? "все три сценария сошлись" : "ЕСТЬ РАСХОЖДЕНИЯ"}`,
  );
} finally {
  console.log("убираю за собой:");
  await cleanup();
}
