#!/usr/bin/env node
/**
 * Снимает экраны Mushroom Checker и WayBack (флейворы одной кодовой базы) для
 * документации редизайна: docs/UI-FLOWS-*.md + docs/ui-flows/<flavor>/*.png.
 *
 * Флейвор определяется хостом (см. src/lib/appFlavor.ts), поэтому ходим на
 * боевые поддомены:
 *   checker → https://checker.skyforest.ai
 *   wayback → https://wayback.skyforest.ai
 * Офлайн-оболочка (mobile/shell/offline-track.html) снимается с локального
 * статик-сервера, который поднимает сам скрипт.
 *
 * Запуск из каталога skyforest:
 *   node scripts/capture-ui-flows.mjs                # всё
 *   node scripts/capture-ui-flows.mjs checker        # только Mushroom Checker
 *   node scripts/capture-ui-flows.mjs wayback shell
 *
 * Учётные данные демо-аккаунта: UI_FLOWS_EMAIL / UI_FLOWS_PASSWORD.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = resolve(__dirname, "..");
const OUT_ROOT = resolve(SKY_ROOT, "docs/ui-flows");
const SHELL_DIR = resolve(SKY_ROOT, "mobile/shell");

const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD = process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 }; // iPhone 14 Pro
/** Лес под Минском — правдоподобный центр карт и точка входа в лес. */
const GEO = { latitude: 53.9412, longitude: 27.3168 };

const ORIGINS = {
  checker: process.env.UI_FLOWS_CHECKER || "https://checker.skyforest.ai",
  wayback: process.env.UI_FLOWS_WAYBACK || "https://wayback.skyforest.ai",
};

/**
 * Симуляция нативной оболочки в обычном Chromium.
 *
 * `CapacitorCustomPlatform` — штатный хук Capacitor: `getPlatform()` вернёт
 * "ios", `isNativePlatform()` → true, а плагины (Geolocation, Preferences,
 * SplashScreen) разрешатся в свои web-реализации, потому что нативных
 * PluginHeaders нет. Заглушка `window.Capacitor` нужна отдельно: наш хелпер
 * `isNativeApp()` читает её ещё до загрузки @capacitor/core (на гидрации).
 */
const NATIVE_INIT = () => {
  window.CapacitorCustomPlatform = { name: "ios", plugins: {} };
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
    Plugins: {},
  };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*  Статик-сервер для офлайн-оболочки                                  */
/* ------------------------------------------------------------------ */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function startShellServer() {
  return new Promise((done) => {
    const server = createServer((req, res) => {
      const rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(/^\/+/, "");
      const file = join(SHELL_DIR, rel || "index.html");
      if (!file.startsWith(SHELL_DIR) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
      createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => done({ server, port: server.address().port }));
  });
}

/* ------------------------------------------------------------------ */
/*  Хелперы съёмки                                                     */
/* ------------------------------------------------------------------ */

const manifest = [];

/**
 * Снимок с одной повторной попыткой.
 *
 * Известная проблема: на части экранов в режиме симуляции нативной оболочки
 * headless Chromium перестаёт отдавать кадры (виснет и page.screenshot, и
 * CDP Page.captureScreenshot, и любой evaluate) — страница «зависает» после
 * гидрации. В web-режиме тот же экран снимается за ~250 мс, поэтому вызывающий
 * код умеет переснять экран в браузерной раскладке (см. NativeSession.shot).
 */
async function shoot(page, dir, id, title, note) {
  const outDir = resolve(OUT_ROOT, dir);
  mkdirSync(outDir, { recursive: true });
  const file = resolve(outDir, `${id}.png`);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.screenshot({ path: file, animations: "disabled", timeout: 15000 });
      manifest.push({
        flavor: dir,
        id,
        title,
        note: note || null,
        file: `docs/ui-flows/${dir}/${id}.png`,
      });
      console.log(`  ✓ ${dir}/${id}.png — ${title}${note ? ` [${note}]` : ""}`);
      return true;
    } catch (err) {
      if (attempt === 1) {
        console.warn(`  ⚠ ${dir}/${id}: ${err.message.split("\n")[0]}`);
        return false;
      }
      await sleep(1500);
    }
  }
  return false;
}

/** Переход + ожидание, что клиентский UI отрисовался. */
async function go(page, url, { wait = 1600 } = {}) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await sleep(wait);
}

async function newContext(browser, { native = true, geo = true, storageState } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "ru-RU",
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
    ...(storageState ? { storageState } : {}),
    ...(geo ? { geolocation: GEO, permissions: ["geolocation"] } : {}),
  });
  if (native) await context.addInitScript(NATIVE_INIT);
  return context;
}

/** Сессии по origin — логинимся в каждое приложение один раз. */
const stateCache = new Map();

async function authContext(browser, origin, opts = {}) {
  if (!stateCache.has(origin)) {
    const tmp = await browser.newContext({ viewport: VIEWPORT, locale: "ru-RU" });
    const page = await tmp.newPage();
    await login(page, origin);
    stateCache.set(origin, await tmp.storageState());
    await tmp.close();
  }
  return newContext(browser, { ...opts, storageState: stateCache.get(origin) });
}

async function login(page, origin) {
  await go(page, `${origin}/login`, { wait: 1200 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 45000 }).catch(() => {}),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await sleep(1500);
}

/** Пробуем нажать по тексту; возвращает false, если элемента нет. */
async function tap(page, rx, { timeout = 4000 } = {}) {
  const el = page.getByRole("button", { name: rx }).first();
  try {
    await el.waitFor({ state: "visible", timeout });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

/**
 * Авторизованная сессия «нативного» приложения с восстановлением.
 *
 * Если экран не отдал кадр, страница остаётся мёртвой: пересоздаём её и
 * переснимаем экран в браузерной раскладке (контент тот же, отличается только
 * оболочка — вместо таб-бара веб-шапка и футер).
 */
class NativeSession {
  constructor(browser, dir, origin) {
    this.browser = browser;
    this.dir = dir;
    this.origin = origin;
    this.lastPath = "/";
  }

  async open() {
    this.ctx = await authContext(this.browser, this.origin);
    this.page = await this.ctx.newPage();
    return this;
  }

  async visit(path, wait = 2200) {
    this.lastPath = path;
    await go(this.page, `${this.origin}${path}`, { wait });
  }

  /** Снимок текущего экрана; при неудаче — переснять в web-раскладке. */
  async shot(id, title, { webFallback = true } = {}) {
    if (await shoot(this.page, this.dir, id, title)) return true;
    await this.recover();
    if (!webFallback) return false;
    const ok = await this.webShot(id, `${title} (снято в браузерной раскладке)`);
    if (!ok) manifest.push({ flavor: this.dir, id, title, error: "кадр не получен" });
    return ok;
  }

  /**
   * Пересоздаём страницу после зависшего рендерера. `page.close()` на мёртвой
   * странице сам может не вернуться, поэтому не ждём его дольше 5 секунд.
   */
  async recover() {
    const closed = this.page.close({ runBeforeUnload: false }).catch(() => {});
    await Promise.race([closed, sleep(5000)]);
    this.page = await this.ctx.newPage();
  }

  async webShot(id, title) {
    if (!this.webCtx) {
      this.webCtx = await authContext(this.browser, this.origin, { native: false });
      this.webPage = await this.webCtx.newPage();
    }
    await go(this.webPage, `${this.origin}${this.lastPath}`, { wait: 2200 });
    return shoot(this.webPage, this.dir, id, title, "web-раскладка");
  }

  async close() {
    await this.ctx?.close().catch(() => {});
    await this.webCtx?.close().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*  Общие наборы экранов                                               */
/* ------------------------------------------------------------------ */

/** Неавторизованные экраны: посадочная + auth. */
async function captureAnonymous(browser, dir, origin) {
  // Посадочная видна только в браузере: в нативной оболочке NativeAppProvider
  // сразу уводит с "/" на /dashboard или /login.
  {
    const web = await newContext(browser, { native: false });
    const webPage = await web.newPage();
    await go(webPage, origin, { wait: 2500 });
    await shoot(webPage, dir, "01-landing", "Посадочная страница (браузер, без входа)");
    await web.close();
  }

  const context = await newContext(browser);
  const page = await context.newPage();

  // Splash рисуется один раз за загрузку документа (module-level флаг).
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(900);
  await shoot(page, dir, "00-splash", "Брендовый splash нативной оболочки (холодный старт)");

  for (const [id, path, title] of [
    ["02-login", "/login", "Вход"],
    ["03-register", "/register", "Регистрация"],
    ["04-forgot-password", "/forgot-password", "Восстановление пароля"],
    ["05-reset-password", "/reset-password", "Новый пароль — недействительная ссылка"],
  ]) {
    await go(page, `${origin}${path}`);
    await shoot(page, dir, id, title);
  }

  await context.close();
}

/**
 * Раскрытое мобильное меню (☰) — единственная навигация во флейворах:
 * «Аккаунт», «Подписка», «Выйти» + юридические ссылки.
 */
async function captureMenu(session, id) {
  await session.visit(FLAVOR_HOME[session.dir], 2600);
  const burger = session.page.getByRole("button", { name: /^Меню$|^Menu$/i }).first();
  try {
    await burger.waitFor({ state: "visible", timeout: 6000 });
    await burger.click();
  } catch {
    console.warn(`  ⚠ ${session.dir}/${id}: кнопка меню не найдена`);
    return;
  }
  await sleep(900);
  await session.shot(id, "Меню (☰) — вся навигация приложения");
}

const FLAVOR_HOME = { checker: "/dashboard/identify", wayback: "/dashboard/track" };

/** Экран подписки (пейволл): год / месяц. */
async function capturePaywall(session, startIdx) {
  const n = (i) => String(startIdx + i).padStart(2, "0");
  await session.visit("/payment", 2800);
  await session.shot(`${n(0)}-paywall-yearly`, "Пейволл подписки — годовой тариф (по умолчанию)");
  if (await tap(session.page, /^Месяц|Monthly/i)) {
    await sleep(800);
    await session.shot(`${n(1)}-paywall-monthly`, "Пейволл подписки — месячный тариф");
  }
}

/* ------------------------------------------------------------------ */
/*  Определение гриба: превью фото + модалка списания                  */
/* ------------------------------------------------------------------ */

const PHOTO = resolve(SKY_ROOT, "public/images/blog/blog-kak-opredelit-grib.jpg");

/**
 * Превью снимка и модалка списания. Снимаем в браузерном режиме: web-плагин
 * @capacitor/camera без @ionic/pwa-elements выбрасывает ошибку, а веб-фолбэк
 * `capturePhoto()` открывает обычный file input, который умеет Playwright.
 * Разметка самого экрана в native и web одинаковая (отличается только шапка).
 */
async function captureIdentifyStates(browser, dir, origin, startIdx, { withResult = false } = {}) {
  const n = (i) => String(startIdx + i).padStart(2, "0");
  const context = await authContext(browser, origin, { native: false });
  const page = await context.newPage();
  try {
    await go(page, `${origin}/dashboard/identify`, { wait: 2000 });
    const chooser = page.waitForEvent("filechooser", { timeout: 10000 });
    await page.getByRole("button", { name: /галере|gallery/i }).first().click();
    (await chooser).setFiles(PHOTO);
    await sleep(1800);
    await shoot(page, dir, `${n(0)}-identify-preview`, "Фото выбрано — превью перед распознаванием", "web-раскладка");

    await page.getByRole("button", { name: /^Определить|^Identify/i }).first().click();
    await sleep(1200);
    await shoot(page, dir, `${n(1)}-identify-confirm`, "Модалка подтверждения списания токена", "web-раскладка");

    // Реальное распознавание: списывает 1 токен демо-аккаунта, зато даёт
    // экраны «Анализируем…» и результата — самые важные для редизайна.
    if (withResult) {
      await page.getByRole("button", { name: /Подтвердить|Confirm/i }).first().click();
      await sleep(1500);
      await shoot(page, dir, `${n(2)}-identify-analyzing`, "Идёт распознавание — прогресс", "web-раскладка");
      await page
        .getByText(/Возможные совпадения|Possible matches/i)
        .first()
        .waitFor({ state: "visible", timeout: 45000 })
        .catch(() => {});
      await sleep(1500);
      await shoot(page, dir, `${n(3)}-identify-result`, "Результат распознавания — виды, вероятности, двойники", "web-раскладка");
      await page.evaluate(() => window.scrollBy(0, 900)).catch(() => {});
      await sleep(800);
      await shoot(page, dir, `${n(4)}-identify-result-details`, "Результат — подробности, двойники, чеклист", "web-раскладка");
    }
  } catch (err) {
    console.warn(`  ⚠ identify states: ${err.message.split("\n")[0]}`);
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------ */
/*  Mushroom Checker                                                   */
/* ------------------------------------------------------------------ */

async function captureChecker(browser) {
  const dir = "checker";
  const origin = ORIGINS.checker;
  console.log(`\n▸ Mushroom Checker — ${origin}`);

  await captureAnonymous(browser, dir, origin);

  const s = await new NativeSession(browser, dir, origin).open();

  await s.visit("/dashboard/identify", 2400);
  await s.shot("10-identify", "Определить гриб — единственный рабочий экран приложения");

  await captureMenu(s, "24-menu");
  await capturePaywall(s, 16);

  for (const [id, path, title] of [
    ["18-account", "/account", "Аккаунт"],
    ["19-offer", "/offer", "Оферта / EULA"],
    ["20-privacy", "/privacy", "Политика конфиденциальности"],
    ["21-delete-account", "/delete-account", "Удаление аккаунта"],
    ["22-blocked-route-redirect", "/dashboard/weather", "Чужой маршрут → редирект на «Определить гриб»"],
  ]) {
    await s.visit(path, 2000);
    await s.shot(id, title);
  }

  // Веб-версия пейволла (без нативной оболочки): покупка только в приложении.
  s.lastPath = "/payment";
  await s.webShot("23-paywall-web", "Пейволл в браузере — оформление только в приложении");

  await s.close();
  // Полное распознавание (11–15) тратит токен, поэтому по умолчанию только
  // превью и модалка; результат снимается прогоном `identify-result`.
  await captureIdentifyStates(browser, dir, origin, 11);
}

/* ------------------------------------------------------------------ */
/*  WayBack                                                            */
/* ------------------------------------------------------------------ */

/**
 * Активный поход: старт по GPS (координаты подменены Playwright), смещение
 * позиции для азимута и подтверждение выхода из леса.
 */
async function captureActiveHike(session) {
  const p = () => session.page;
  const started = await tap(p(), /Я вошёл в лес|I'?m entering the forest/i, { timeout: 10000 });
  if (!started) {
    console.warn("  ⚠ кнопка старта похода не найдена — экраны активного похода пропущены");
    return;
  }
  await sleep(4500);
  await session.shot("15-track-active", "Активный поход — расстояние, компас возврата, карта");

  await session.ctx.setGeolocation({
    latitude: GEO.latitude + 0.004,
    longitude: GEO.longitude + 0.006,
  });
  await sleep(7000);
  await session.shot("16-track-active-moved", "Активный поход после смещения — путь на карте и азимут");

  if (await tap(p(), /Я вышел из леса|I'?m out of the forest/i, { timeout: 6000 })) {
    await sleep(900);
    await session.shot("17-track-finish-confirm", "Подтверждение завершения похода");
    await tap(p(), /Отмена|Cancel|Не сейчас/i);
  }
}

/** Только экраны активного похода (для повторного прогона). */
async function captureWaybackActive(browser) {
  console.log(`\n▸ WayBack — активный поход`);
  const s = await new NativeSession(browser, "wayback", ORIGINS.wayback).open();
  await s.visit("/dashboard/track", 3200);
  await captureActiveHike(s);
  await s.close();
}

/**
 * История походов рендерится только при наличии записей (`TrackHistory`
 * возвращает null на пустом списке), поэтому проходим поход целиком:
 * старт → смещение → «Я вышел из леса» → подтверждение.
 */
async function captureWaybackHistory(browser) {
  console.log(`\n▸ WayBack — история походов`);
  const s = await new NativeSession(browser, "wayback", ORIGINS.wayback).open();
  await s.visit("/dashboard/track", 3200);
  const p = () => s.page;
  if (await tap(p(), /Я вошёл в лес|I'?m entering the forest/i, { timeout: 10000 })) {
    await sleep(4000);
    await s.ctx.setGeolocation({
      latitude: GEO.latitude + 0.005,
      longitude: GEO.longitude + 0.003,
    });
    await sleep(6000);
    if (await tap(p(), /Я вышел из леса|I'?m out of the forest/i, { timeout: 6000 })) {
      await sleep(600);
      await tap(p(), /Да, завершить|Yes, finish/i, { timeout: 6000 });
      await sleep(4000);
    }
  }
  await p()
    .evaluate(() => {
      const h = [...document.querySelectorAll("h2,h3")].find((e) =>
        /истори|history/i.test(e.textContent || ""),
      );
      h?.scrollIntoView({ block: "center" });
    })
    .catch(() => {});
  await sleep(800);
  await s.shot("14-track-history", "История походов — сохранённый поход, тап разворачивает карту");
  await s.close();
}

async function captureWayback(browser) {
  const dir = "wayback";
  const origin = ORIGINS.wayback;
  console.log(`\n▸ WayBack — ${origin}`);

  await captureAnonymous(browser, dir, origin);

  // Анонимный доступ к треку — ключевая особенность WayBack.
  {
    const context = await newContext(browser);
    const page = await context.newPage();
    await go(page, `${origin}/dashboard/track`, { wait: 2800 });
    await shoot(page, dir, "06-track-anonymous", "Трек доступен без входа (анонимный режим)");
    await context.close();
  }

  const s = await new NativeSession(browser, dir, origin).open();
  const page = () => s.page;

  await s.visit("/dashboard/track", 3200);
  await s.shot("10-track-idle", "Трек — похода нет");

  // Ручной выбор точки входа на карте.
  if (await tap(page(), /точку входа на карте|на карте|on the map/i)) {
    await sleep(2500);
    await s.shot("11-track-pick-on-map", "Ручной выбор точки входа на карте");
    await tap(page(), /Отмена|Cancel/i);
    await sleep(600);
  }

  // Секция офлайн-регионов.
  if (await tap(page(), /Определить моё местоположение|моё местоположение|my location/i)) {
    await sleep(2500);
  }
  await page()
    .evaluate(() => {
      const h = [...document.querySelectorAll("h2,h3")].find((e) =>
        /офлайн|оффлайн|offline/i.test(e.textContent || ""),
      );
      h?.scrollIntoView({ block: "center" });
    })
    .catch(() => {});
  await sleep(700);
  await s.shot("12-offline-region", "Скачивание региона для офлайна — радиус и детализация");

  if (await tap(page(), /Скачать этот участок|Скачать|Download this area/i)) {
    await sleep(2500);
    await s.shot("13-offline-region-downloading", "Загрузка тайлов региона — прогресс");
    await tap(page(), /Отменить|Cancel/i);
    await sleep(1200);
  }

  await page()
    .evaluate(() => {
      const h = [...document.querySelectorAll("h2,h3")].find((e) =>
        /истори|history/i.test(e.textContent || ""),
      );
      h?.scrollIntoView({ block: "center" });
    })
    .catch(() => {});
  await sleep(600);
  await s.shot("14-track-history", "История походов");

  // Активный поход: старт по GPS (координаты подменены Playwright).
  await page().evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await sleep(400);
  await captureActiveHike(s);

  await captureMenu(s, "25-menu");
  await capturePaywall(s, 18);

  for (const [id, path, title] of [
    ["20-account", "/account", "Аккаунт"],
    ["21-offer", "/offer", "Оферта / EULA"],
    ["22-privacy", "/privacy", "Политика конфиденциальности"],
    ["23-delete-account", "/delete-account", "Удаление аккаунта"],
    ["24-blocked-route-redirect", "/dashboard/identify", "Чужой маршрут → редирект на «Трек»"],
  ]) {
    await s.visit(path, 2000);
    await s.shot(id, title);
  }

  await s.close();
}

/* ------------------------------------------------------------------ */
/*  Офлайн-оболочка WayBack (vanilla JS, без Next.js)                  */
/* ------------------------------------------------------------------ */

async function captureShell(browser) {
  const dir = "wayback";
  console.log("\n▸ Офлайн-экран нативной оболочки (mobile/shell)");
  const { server, port } = await startShellServer();
  const url = `http://127.0.0.1:${port}/offline-track.html`;

  const context = await newContext(browser, { native: false });
  const page = await context.newPage();

  await go(page, url, { wait: 3500 });
  await shoot(page, dir, "30-shell-start", "Офлайн-экран — похода нет, точка входа ставится тапом по карте");

  await page.locator("#layerSatellite").click().catch(() => {});
  await sleep(3000);
  await shoot(page, dir, "31-shell-satellite", "Офлайн-экран — слой «Спутник»");
  await page.locator("#layerTrails").click().catch(() => {});
  await sleep(1500);

  // Ставим точку входа тапом в центр карты и стартуем поход.
  const box = await page.locator("#map").boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(1200);
    await shoot(page, dir, "32-shell-point-picked", "Офлайн-экран — точка входа выбрана, «Way Back» активна");
    const start = page.locator("#startBtn");
    if (await start.isVisible().catch(() => false)) {
      await start.click({ force: true });
      await sleep(3000);
      await shoot(page, dir, "33-shell-active", "Офлайн-экран — активный поход: расстояние, время, компас");
    }
  }

  await context.close();
  server.close();
}

/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const want = args.length ? args : ["checker", "wayback", "shell"];
  mkdirSync(OUT_ROOT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const safe = async (name, fn) => {
    try {
      await fn(browser);
    } catch (err) {
      console.warn(`\n⚠ набор «${name}» прерван: ${err.message.split("\n")[0]}`);
    }
  };

  try {
    if (want.includes("checker")) await safe("checker", captureChecker);
    if (want.includes("wayback")) await safe("wayback", captureWayback);
    if (want.includes("wayback-active")) await safe("wayback-active", captureWaybackActive);
    if (want.includes("wayback-history")) await safe("wayback-history", captureWaybackHistory);
    if (want.includes("menu")) {
      await safe("menu", async (b) => {
        for (const [dir, id] of [
          ["checker", "24-menu"],
          ["wayback", "25-menu"],
        ]) {
          const s = await new NativeSession(b, dir, ORIGINS[dir]).open();
          await captureMenu(s, id);
          await s.close();
        }
      });
    }
    // Тратит 1 токен демо-аккаунта, поэтому только по явному запросу.
    if (want.includes("identify-result")) {
      await safe("identify-result", (b) =>
        captureIdentifyStates(b, "checker", ORIGINS.checker, 11, { withResult: true }),
      );
    }
    if (want.includes("shell")) await safe("shell", captureShell);
  } finally {
    await browser.close();
  }

  // Частичный прогон не должен терять записи предыдущего: сливаем по flavor+id.
  const manifestPath = resolve(OUT_ROOT, "manifest.json");
  const merged = new Map();
  if (existsSync(manifestPath)) {
    for (const item of JSON.parse(readFileSync(manifestPath, "utf8"))) {
      merged.set(`${item.flavor}/${item.id}`, item);
    }
  }
  for (const item of manifest) merged.set(`${item.flavor}/${item.id}`, item);
  const all = [...merged.values()].sort((a, b) =>
    `${a.flavor}/${a.id}`.localeCompare(`${b.flavor}/${b.id}`),
  );
  writeFileSync(manifestPath, JSON.stringify(all, null, 2));
  const ok = all.filter((m) => !m.error).length;
  console.log(`\n✓ ${ok} скринов → ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
