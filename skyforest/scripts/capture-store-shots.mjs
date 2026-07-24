#!/usr/bin/env node
/**
 * Одноразовый генератор скриншотов для сторов: экран РЕЗУЛЬТАТА распознавания
 * гриба (виды + проценты) и экран Track с записанным путём на карте.
 *
 * Веб-режим на телефонном вьюпорте (430×932 @3x = 1290×2796) — совпадает с
 * тем, как сделаны текущие скриншоты в App Store / Google Play.
 *
 * Запуск из каталога skyforest (dev-сервер на :3001 уже поднят):
 *   node scripts/capture-store-shots.mjs
 */
import { chromium } from "playwright";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(SKY_ROOT, "docs/store-shots");
const BASE_URL = process.env.SCREENSHOT_BASE_URL || "http://localhost:3001";

// iPhone 6.7" store size: 1290×2796 = 430×932 @ DSR 3.
const VIEWPORT = { width: 430, height: 932 };

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
  const merged = {};
  for (const f of [
    resolve(SKY_ROOT, ".env.local"),
    resolve(SKY_ROOT, "..", "SkyF", "skyforest", ".env.local"),
  ]) {
    for (const [k, v] of Object.entries(parseEnv(f))) {
      if (!(k in merged) && v) merged[k] = v;
    }
  }
  return merged;
}

function dataUrl(path) {
  return `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
}

async function ensureDemoAccount(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Need SUPABASE URL + SERVICE_ROLE key");
  const email = `store-shots-${Date.now()}@skyforest.ai`;
  const password = `Sky#${randomBytes(18).toString("base64").replace(/[+/=]/g, "")}9`;
  const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!(res.status === 200 || res.status === 201)) {
    throw new Error(`create demo failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return { email, password };
}

const IDENTIFY_RESULT = {
  id: "demo",
  low_confidence: false,
  suggestions: [
    {
      rank: 1,
      scientific_name: "Boletus edulis",
      common_name: "Porcini · King bolete",
      probability: 0.94,
      reference_photo_url: dataUrl("/tmp/mush_Boletus_edulis_sm.jpg"),
      wikipedia_url: "https://en.wikipedia.org/wiki/Boletus_edulis",
      gbif_url: null,
      toxic: false,
      toxic_source: "GBIF",
    },
    {
      rank: 2,
      scientific_name: "Imleria badia",
      common_name: "Bay bolete",
      probability: 0.41,
      reference_photo_url: dataUrl("/tmp/mush_Imleria_badia_sm.jpg"),
      wikipedia_url: "https://en.wikipedia.org/wiki/Imleria_badia",
      gbif_url: null,
      toxic: false,
      toxic_source: "GBIF",
    },
    {
      rank: 3,
      scientific_name: "Tylopilus felleus",
      common_name: "Bitter bolete",
      probability: 0.09,
      reference_photo_url: dataUrl("/tmp/mush_Tylopilus_felleus_sm.jpg"),
      wikipedia_url: "https://en.wikipedia.org/wiki/Tylopilus_felleus",
      gbif_url: null,
      toxic: true,
      toxic_source: "GBIF",
    },
  ],
  details: {
    scientific_name: "Boletus edulis",
    common_name: "Porcini",
    family: "Boletaceae",
    genus: "Boletus",
    summary:
      "A prized edible mushroom with a thick white stem and a brown, rounded cap. Grows in coniferous and deciduous forests from summer to late autumn.",
    wikipedia_url: "https://en.wikipedia.org/wiki/Boletus_edulis",
    gbif_url: null,
  },
  lookalikes: [
    {
      scientific_name: "Tylopilus felleus",
      label: "Bitter bolete — inedible, intensely bitter taste",
      photo_url: dataUrl("/tmp/mush_Tylopilus_felleus_sm.jpg"),
    },
  ],
  habitat: null,
  disclaimer:
    "Automated photo recognition can make mistakes. Never eat a mushroom identified only by a photo.",
};

// Точка входа + записанный путь для экрана Track (лес под Минском).
const ANCHOR = { lat: 53.9012, lng: 27.4419 };
const CURRENT = { lat: 53.9043, lng: 27.4468 };
const PATH = [
  [53.90165, 27.44235],
  [53.90205, 27.4432],
  [53.9026, 27.4437],
  [53.90295, 27.4447],
  [53.9035, 27.4452],
  [53.90395, 27.4461],
];

function activeTrackJson() {
  const now = Date.now();
  const startedAt = now - 46 * 60000;
  const points = PATH.map((p, i) => ({
    lat: p[0],
    lng: p[1],
    t: startedAt + (i + 1) * 6 * 60000,
  }));
  return JSON.stringify({ anchor: { ...ANCHOR, t: startedAt }, startedAt, points });
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/en/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnv();
  const demo = await ensureDemoAccount(env);
  console.log("demo:", demo.email);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    locale: "en-US",
    colorScheme: "dark",
    geolocation: { latitude: CURRENT.lat, longitude: CURRENT.lng, accuracy: 8 },
    permissions: ["geolocation"],
  });

  // Баланс токенов — чтобы окно подтверждения не блокировало распознавание.
  await context.route("**/api/tokens/balance", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ balance: 240, bonus_balance: 0, withdrawable: 0 }) }),
  );
  // Мокаем сам ответ распознавания (демо-данные для стора).
  await context.route("**/api/mushrooms/identify", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIFY_RESULT) }),
  );

  const page = await context.newPage();
  page.on("filechooser", (fc) => fc.setFiles("/tmp/porcini_preview.jpg").catch(() => {}));

  // Прячем dev-оверлей Next.js («N» в углу) и тосты — их не должно быть в сторе.
  const hideChrome = () =>
    page.addStyleTag({
      content:
        "nextjs-portal,[data-next-badge-root],[data-nextjs-toast],[data-nextjs-dev-tools-button],#__next-build-watcher,[data-sonner-toaster]{display:none!important}",
    }).catch(() => {});

  await login(page, demo.email, demo.password);

  // ---------- 1. Распознавание гриба (результат с процентами) ----------
  console.log("capturing identify…");
  await page.goto(`${BASE_URL}/en/dashboard/identify`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Choose from gallery" }).click();
  await page.locator("button.btn-identify").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("button.btn-identify").click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByText("Possible matches", { exact: false }).waitFor({ state: "visible", timeout: 20000 });
  await hideChrome();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(OUT_DIR, "identify.png"), fullPage: false });

  // ---------- 2. Track / путь назад ----------
  console.log("capturing track…");
  await page.goto(`${BASE_URL}/en/dashboard`, { waitUntil: "networkidle" });
  await page.evaluate((json) => localStorage.setItem("sf_active_track", json), activeTrackJson());
  await page.goto(`${BASE_URL}/en/dashboard/track`, { waitUntil: "networkidle" });
  // Включаем компас и шлём показание ориентации — чтобы нарисовалась стрелка
  // возврата (иначе экран показывает подсказку «пройдите пару шагов»).
  const enable = page.getByRole("button", { name: "Enable compass" });
  if (await enable.count().catch(() => 0)) {
    await enable.click().catch(() => {});
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      for (let i = 0; i < 4; i++) {
        window.dispatchEvent(
          new DeviceOrientationEvent("deviceorientationabsolute", { absolute: true, alpha: 25 }),
        );
      }
    });
    await page.waitForTimeout(500);
  }
  // Дать карте прогрузить тайлы.
  await page.waitForTimeout(4000);
  await hideChrome();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(OUT_DIR, "track.png"), fullPage: false });

  await browser.close();
  console.log(`\n✓ shots → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
