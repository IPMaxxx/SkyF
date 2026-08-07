#!/usr/bin/env node
/**
 * Снимки офлайн-экрана SkyForest: как он выглядит без сети.
 *
 * Проверка fastlane/.offline-map-skyforest-check.mjs отвечает на вопрос «есть ли
 * на экране тайлы и маркер», но не на вопрос «как это выглядит». Здесь настоящая
 * страница офлайн-ядра (mobile/shell/offline-track.html) открывается в Chromium
 * с поддельным мостом Capacitor и запрещённой сетью — ровно те три положения,
 * что и в проверке, плюс версия страницы до правки для сравнения.
 *
 * Ничего не выходит за пределы машины: тайлы отдаёт локальный сервер вместо
 * Filesystem, остальные запросы обрываются.
 *
 * Запуск из каталога skyforest:
 *   node scripts/capture-offline-map-selfcheck.mjs
 */
import { createServer } from "node:http";
import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

/**
 * Playwright в зависимостях не объявлен (как и у соседнего
 * scripts/capture-ui-flows.mjs): снимки нужны от случая к случаю, и тянуть
 * браузер в сборку сайта незачем. Годится любой из двух пакетов — полный или
 * playwright-core с уже скачанным Chromium.
 */
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
      const bin = join(root, build, dir, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

const SKY_ROOT = resolve(import.meta.dirname, "..");
const SHELL_DIR = join(SKY_ROOT, "mobile/shell");
const OUT_ROOT = join(SKY_ROOT, "docs/offline-map-selfcheck");
const SHELL_REL = "skyforest/mobile/shell/offline-track.js";
const FIX_MARKER = "function renderPosition";

/** Минск: там же, где в проверке лежит скачанная область. */
const HERE = { lat: 53.9, lng: 27.55 };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

/** Версия страницы до правки — ближайшая в истории без отдельной отрисовки точки. */
function sourceBeforeFix() {
  const revs = execFileSync("git", ["rev-list", "HEAD", "--", SHELL_REL], {
    encoding: "utf8",
    cwd: resolve(SKY_ROOT, ".."),
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const rev of revs) {
    const text = execFileSync("git", ["show", `${rev}:${SHELL_REL}`], {
      encoding: "utf8",
      cwd: resolve(SKY_ROOT, ".."),
    });
    if (!text.includes(FIX_MARKER)) return { rev, text };
  }
  throw new Error(`в истории ${SHELL_REL} нет версии без «${FIX_MARKER}»`);
}

/**
 * Тайл «из Filesystem». Настоящих скачанных тайлов на машине сборки нет, а
 * подсунуть вместо них обзорный тайл значило бы соврать на снимке: непонятно,
 * что нарисовано — скачанное или зашитое в приложение. Поэтому локальный тайл
 * рисуется узнаваемым: свои координаты подписаны, и на снимке видно, что карта
 * собрана именно из файлов на устройстве.
 */
function localTileSvg(z, x, y) {
  const shade = (x + y) % 2 === 0 ? "#20301f" : "#1b2a1b";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="${shade}"/>
  <path d="M0 200 C 60 150, 120 210, 256 140" stroke="#4d7a4f" stroke-width="10" fill="none"/>
  <path d="M-10 60 C 80 90, 150 20, 266 70" stroke="#3d5f3f" stroke-width="6" fill="none"/>
  <path d="M30 256 C 60 180, 40 120, 90 0" stroke="#7a6a3a" stroke-width="4" fill="none" stroke-dasharray="10 8"/>
  <rect x="0.5" y="0.5" width="255" height="255" fill="none" stroke="rgba(98,168,99,.35)"/>
  <text x="8" y="22" fill="rgba(232,240,234,.7)" font-family="monospace" font-size="13">sf-tiles ${z}/${x}/${y}</text>
</svg>`;
}

/**
 * Сервер страницы. Отдаёт файлы оболочки, подменяет offline-track.js на версию
 * до правки (когда попросили) и притворяется Filesystem по адресам
 * `_capacitor_file_`, куда ведёт convertFileSrc.
 */
function startServer({ shellSource, tiles }) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url || "/").split("?")[0]);

    const tileMatch = path.match(/_capacitor_file_.*sf-tiles\/[^/]+\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (tileMatch) {
      if (!tiles) {
        res.writeHead(404).end();
        return;
      }
      const [, z, x, y] = tileMatch;
      res.writeHead(200, { "Content-Type": "image/svg+xml" }).end(localTileSvg(z, x, y));
      return;
    }

    if (path === "/offline-track.js" && shellSource) {
      res.writeHead(200, { "Content-Type": MIME[".js"] }).end(shellSource);
      return;
    }

    const file = join(SHELL_DIR, path === "/" ? "offline-track.html" : path);
    if (!file.startsWith(SHELL_DIR)) {
      res.writeHead(403).end();
      return;
    }
    try {
      res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((done) => {
    server.listen(0, "127.0.0.1", () => done({ server, port: server.address().port }));
  });
}

/** Мост Capacitor, как на errorPath-странице Android: androidBridge и ничего больше. */
function bridgeScript({ tiles, gps, lastPosition }) {
  return `(() => {
    Object.defineProperty(navigator, "onLine", { get: () => false });
    const prefs = new Map();
    ${lastPosition ? `prefs.set("sf_last_position", JSON.stringify(${JSON.stringify(lastPosition)}));` : ""}
    const answer = (plugin, method, options) => {
      if (plugin === "Preferences" && method === "get") {
        return { value: prefs.has(options.key) ? prefs.get(options.key) : null };
      }
      if (plugin === "Preferences" || plugin === "SplashScreen") return {};
      if (plugin === "Filesystem" && (method === "stat" || method === "getUri")) {
        if (!${tiles ? "true" : "false"}) throw { message: "does not exist" };
        return method === "stat"
          ? { type: "file", size: 1024 }
          : { uri: "file:///data/user/0/ai.skyforest.app/files/" + options.path };
      }
      throw { message: plugin + "." + method + " is not implemented" };
    };
    window.androidBridge = {
      postMessage(raw) {
        const call = JSON.parse(raw);
        const reply = (payload) =>
          setTimeout(() => window.androidBridge.onmessage?.({ data: JSON.stringify(payload) }), 0);
        if (call.pluginId === "Geolocation" && call.methodName === "watchPosition") {
          ${gps
            ? `setTimeout(() => reply({ callbackId: call.callbackId, success: true, save: true,
                 data: { coords: { latitude: ${gps.lat}, longitude: ${gps.lng}, accuracy: 18 } } }), 300);`
            : ""}
          return;
        }
        try {
          reply({ callbackId: call.callbackId, success: true, data: answer(call.pluginId, call.methodName, call.options) });
        } catch (error) {
          reply({ callbackId: call.callbackId, success: false, error });
        }
      },
    };
  })();`;
}

const CASES = [
  {
    id: "01-tiles",
    title: "сети нет, тайлы на устройстве есть",
    state: { tiles: true, gps: HERE, lastPosition: null },
  },
  {
    id: "02-no-tiles",
    title: "сети нет, тайлов нет — схематичная подложка",
    state: { tiles: false, gps: HERE, lastPosition: null },
  },
  {
    id: "03-no-fix",
    title: "сети нет, фикса нет — последняя известная позиция кольцом",
    state: { tiles: true, gps: null, lastPosition: { ...HERE, t: Date.now() - 60_000 } },
  },
];

async function capture(browser, dir, shellSource) {
  mkdirSync(join(OUT_ROOT, dir), { recursive: true });
  for (const c of CASES) {
    const { server, port } = await startServer({ shellSource, tiles: c.state.tiles });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: "ru-RU",
    });
    // Сеть запрещена: наружу не уходит ни один запрос.
    await context.route("**", (route) => {
      const url = route.request().url();
      if (url.includes("127.0.0.1")) return route.continue();
      return route.abort();
    });
    await context.addInitScript(bridgeScript(c.state));
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/offline-track.html`, { waitUntil: "load" });
    await page.waitForTimeout(4000);
    const file = join(OUT_ROOT, dir, `${c.id}.png`);
    await page.screenshot({ path: file });
    console.log(`  ${dir}/${c.id}.png — ${c.title}`);
    await context.close();
    server.close();
  }
}

const before = sourceBeforeFix();
const chromium = await loadChromium();
const browser = await chromium
  .launch({ headless: true })
  .catch(() => chromium.launch({ headless: true, executablePath: cachedChromium() }));
console.log("— как есть сейчас —");
await capture(browser, "after", null);
console.log(`\n— как было до правки (${before.rev.slice(0, 7)}) —`);
await capture(browser, "before", before.text);
await browser.close();
console.log(`\nснимки: ${OUT_ROOT}`);
