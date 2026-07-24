#!/usr/bin/env node
/**
 * Снимает скриншоты всех экранов мобильного приложения SkyForest (native UI)
 * для передачи дизайнеру. Запуск из каталога skyforest:
 *
 *   node scripts/capture-mobile-ui-screenshots.mjs
 *
 * Требует: dev-сервер на BASE_URL (по умолчанию http://localhost:3001),
 * SUPABASE_SERVICE_ROLE_KEY в .env.local или ../SkyF/skyforest/.env.local
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(SKY_ROOT, "docs/mobile-ui-screenshots");
const BASE_URL = process.env.SCREENSHOT_BASE_URL || "http://localhost:3001";
const DEMO_EMAIL =
  process.env.SCREENSHOT_EMAIL || `ui-screenshots-${Date.now()}@skyforest.ai`;

const VIEWPORT = { width: 393, height: 852 }; // iPhone 14 Pro

function parseEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
  return out;
}

function loadEnv() {
  const candidates = [
    resolve(SKY_ROOT, ".env.local"),
    resolve(SKY_ROOT, ".env"),
    resolve(SKY_ROOT, "..", "SkyF", "skyforest", ".env.local"),
  ];
  const merged = {};
  for (const f of candidates) {
    for (const [k, v] of Object.entries(parseEnv(f))) {
      if (!(k in merged) && v) merged[k] = v;
    }
  }
  return merged;
}

function strongPassword() {
  const base = randomBytes(18).toString("base64").replace(/[+/=]/g, "");
  return `Sky#${base}9`;
}

async function ensureDemoAccount(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  const password = strongPassword();
  const adminUrl = `${url.replace(/\/$/, "")}/auth/v1/admin/users`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const create = await fetch(adminUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: DEMO_EMAIL, password, email_confirm: true }),
  });
  const createJson = await create.json().catch(() => ({}));

  if (create.status === 200 || create.status === 201) {
    return { email: DEMO_EMAIL, password };
  }

  const byEmail = await fetch(
    `${adminUrl}?email=${encodeURIComponent(DEMO_EMAIL)}`,
    { headers },
  );
  const byEmailJson = await byEmail.json().catch(() => ({}));
  const exact = (byEmailJson.users || []).find(
    (u) => (u.email || "").toLowerCase() === DEMO_EMAIL.toLowerCase(),
  );
  if (exact) {
    const upd = await fetch(`${adminUrl}/${exact.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!upd.ok) throw new Error(`Failed to reset demo password: ${upd.status}`);
    return { email: DEMO_EMAIL, password };
  }

  throw new Error(
    `Could not create screenshot account (${create.status}): ${JSON.stringify(createJson).slice(0, 200)}`,
  );
}

/** @type {{ id: string, path: string, title: string, flow: string, note?: string, before?: (page: import('playwright').Page) => Promise<void> }[]} */
const SCREENS = [
  // Auth
  { id: "01-login", path: "/login", title: "Вход", flow: "Auth" },
  { id: "02-register", path: "/register", title: "Регистрация", flow: "Auth" },
  { id: "03-forgot-password", path: "/forgot-password", title: "Восстановление пароля", flow: "Auth" },
  { id: "04-reset-password", path: "/reset-password", title: "Новый пароль (недействительная ссылка)", flow: "Auth" },

  // Main tabs
  { id: "10-dashboard", path: "/dashboard", title: "Главная (native)", flow: "Home" },
  {
    id: "11-dashboard-menu",
    path: "/dashboard",
    title: "Боковое меню",
    flow: "Home",
    before: async (page) => {
      await page.getByRole("button", { name: /меню/i }).click();
      await page.waitForTimeout(400);
    },
  },
  { id: "12-weather", path: "/dashboard/weather", title: "Погода", flow: "Weather" },
  {
    id: "13-rain-map",
    path: "/dashboard/weather?tab=rain-map",
    title: "Карта осадков",
    flow: "Weather",
  },
  { id: "14-identify", path: "/dashboard/identify", title: "Определить гриб", flow: "Identify" },
  { id: "15-compare", path: "/dashboard/compare", title: "Мониторинг", flow: "Compare" },
  { id: "16-track", path: "/dashboard/track", title: "Трек / путь назад", flow: "Track" },

  // Secondary app screens
  { id: "20-forest-search", path: "/dashboard/forest-search", title: "Поиск леса", flow: "Forest search" },
  { id: "21-marketplace", path: "/dashboard/marketplace", title: "Маркетплейс", flow: "Marketplace" },
  { id: "22-chats", path: "/dashboard/marketplace/chats", title: "Чаты", flow: "Marketplace" },
  { id: "23-locations-new", path: "/dashboard/locations/new", title: "Новая локация", flow: "Locations" },
  { id: "24-best-day-new", path: "/dashboard/best-day/new", title: "Новый грибной день", flow: "Best days" },
  { id: "25-account", path: "/account", title: "Аккаунт", flow: "Account" },
  { id: "26-payment", path: "/payment", title: "Токены / IAP", flow: "Payment" },
  {
    id: "27-payment-subscriptions",
    path: "/payment#subscriptions",
    title: "Подписки",
    flow: "Payment",
    before: async (page) => {
      await page.evaluate(() => {
        document.getElementById("subscriptions")?.scrollIntoView({ block: "start" });
      });
      await page.waitForTimeout(500);
    },
  },

  // Site sections (native menu footer)
  { id: "30-services", path: "/services", title: "Услуги", flow: "Site sections" },
  { id: "31-promotions", path: "/promotions", title: "Акции", flow: "Site sections" },
  { id: "32-blog", path: "/blog", title: "Блог", flow: "Site sections" },
  { id: "33-contacts", path: "/contacts", title: "Контакты", flow: "Site sections" },
  { id: "34-offer", path: "/offer", title: "Оферта / EULA", flow: "Legal" },
  { id: "35-privacy", path: "/privacy", title: "Политика конфиденциальности", flow: "Legal" },
];

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function captureScreen(page, screen) {
  const url = `${BASE_URL}${screen.path}`;
  await page.goto(url, { waitUntil: "networkidle" });
  // Дождаться гидрации native UI (Capacitor mock → таб-бар / native-заголовок).
  await page
    .locator('nav[aria-label*="Меню"], nav[aria-label*="Menu"]')
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  if (screen.before) await screen.before(page);
  const file = resolve(OUT_DIR, `${screen.id}.png`);
  // Viewport-only: ближе к реальному экрану телефона (не full-page scroll).
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const env = loadEnv();
  const demo = await ensureDemoAccount(env);
  writeFileSync(
    resolve(OUT_DIR, ".demo-credentials.json"),
    JSON.stringify({ email: demo.email, note: "Password rotated for screenshot run; not stored here." }, null, 2),
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "ru-RU",
    colorScheme: "dark",
  });

  await context.addInitScript(() => {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
    };
  });

  const page = await context.newPage();

  // Auth screens (no login)
  const authScreens = SCREENS.filter((s) => s.flow === "Auth");
  const manifest = [];

  for (const screen of authScreens) {
    console.log(`📸 ${screen.id} — ${screen.title}`);
    const file = await captureScreen(page, screen);
    manifest.push({ ...screen, file: file.replace(SKY_ROOT + "/", "") });
  }

  await login(page, demo.email, demo.password);

  const appScreens = SCREENS.filter((s) => s.flow !== "Auth");
  for (const screen of appScreens) {
    console.log(`📸 ${screen.id} — ${screen.title}`);
    try {
      const file = await captureScreen(page, screen);
      manifest.push({ ...screen, file: file.replace(SKY_ROOT + "/", "") });
    } catch (err) {
      console.warn(`  ⚠ skip ${screen.id}: ${err.message}`);
      manifest.push({ ...screen, file: null, error: String(err.message) });
    }
  }

  writeFileSync(resolve(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(`\n✓ ${manifest.length} screens → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
