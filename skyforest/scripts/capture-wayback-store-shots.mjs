#!/usr/bin/env node
/**
 * Скриншоты WayBack для App Store и Google Play (английская локаль).
 *
 * Снимаем боевой wayback.skyforest.ai в тёмной схеме: холст #0b120d, плитка
 * START, нижнее меню, карта на главной, предсохранение области касанием.
 *
 * Съёмка идёт под учётной записью с активным правом на приложение (строка
 * `user_subscriptions` с `tier=wayback`), и это обязательное условие, а не
 * удобство. В нативной оболочке на старте стоит гейт «вход → пробный период»,
 * поэтому пользователь приложения всегда вошедший и с подпиской: анонимные
 * кадры показывали бы приглашение «Sign in to sync your walks», которого он
 * никогда не увидит. Гейт живёт только в нативной оболочке (см.
 * useWaybackGate), в браузере он пропускает без проверки — вход нужен именно
 * ради достоверности кадров.
 *
 * Состояние устройства подкладываем в localStorage — история походов
 * (sf_track_history), скачанные области (sf_tile_regions), последняя позиция
 * (sf_last_position) и активный поход (sf_active_track). Так кадры
 * детерминированные, а на карте есть настоящий пройденный путь, а не пустота.
 *
 * Место — Nuuksio National Park (Espoo, Finland): узнаваемый лес с тропами и
 * подписями латиницей. Локация вне ЕАЭС и без кириллицы — требование сторов
 * к англоязычному листингу.
 *
 * Порядок съёмки не совпадает с нумерацией кадров: активный поход подкладывается
 * последним, потому что он подменяет главный экран, а история и офлайн-карта
 * нужны без него.
 *
 * Хвост пути не подкладывается, а «проходится» через setGeolocation: у похода
 * работает watchPosition, и курс движения (course over ground) считается только
 * по реальному смещению. Без него вместо стрелки возврата экран показывает
 * подсказку «пройдите пару шагов».
 *
 * Размеры: Apple требует 1290×2796 (6.9″), Google Play не принимает сторону
 * длиннее двойной короткой — для него отдельный проход 1290×2580.
 *
 * Запуск: WB_SHOTS_EMAIL=… WB_SHOTS_PASSWORD=… \
 *         node scripts/capture-wayback-store-shots.mjs [origin]
 * Выход:  docs/store-shots/wayback/{apple,play}/*.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/store-shots/wayback");
const ORIGIN = process.argv[2] || "https://wayback.skyforest.ai";

const EMAIL = process.env.WB_SHOTS_EMAIL;
const PASSWORD = process.env.WB_SHOTS_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error(
    "Нужна учётка с правом на приложение: WB_SHOTS_EMAIL и WB_SHOTS_PASSWORD.",
  );
  process.exit(1);
}

/** Apple: 6.9″. Play: сторона не длиннее двойной короткой. */
const TARGETS = [
  { name: "apple", viewport: { width: 430, height: 932 } },
  { name: "play", viewport: { width: 430, height: 860 } },
];

/**
 * Точка входа в лес — тропа у Haukkalampi в Nuuksio National Park, и опорные
 * точки прогулки на север по Haukankierros / Reitti 2000. Между опорными
 * точками путь уплотняется вдвое, чтобы линия на карте выглядела пройденной,
 * а не начерченной по линейке.
 */
const WAYPOINTS = [
  { lat: 60.309749, lng: 24.520662 },
  { lat: 60.309962, lng: 24.519159 },
  { lat: 60.310175, lng: 24.517441 },
  { lat: 60.310494, lng: 24.515938 },
  { lat: 60.311025, lng: 24.514864 },
  { lat: 60.31177, lng: 24.514435 },
  { lat: 60.312514, lng: 24.514649 },
  { lat: 60.313153, lng: 24.515508 },
  { lat: 60.313578, lng: 24.516582 },
  { lat: 60.313897, lng: 24.517871 },
  { lat: 60.314323, lng: 24.518944 },
  { lat: 60.314961, lng: 24.519374 },
  { lat: 60.315599, lng: 24.518944 },
  { lat: 60.316024, lng: 24.517871 },
];

/** Шаг записи точки — столько же, сколько даёт watchPosition на ходу. */
const POINT_INTERVAL_MS = 90_000;
/**
 * Темп «по лесу с корзиной»: он связывает длину пути и время на кадрах. Цифра
 * низкая намеренно — так походы в истории длятся больше часа и подпись читается
 * как «1 h 5 m · 1.19 km», а не как «65 m · 1.19 km», где метры спорят с
 * минутами.
 */
const PACE_KMH = 1.1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg) => (deg * Math.PI) / 180;

function haversineM(a, b) {
  const s =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

function pathLengthM(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

function shift(point, bearing, metres) {
  return {
    lat: point.lat + (metres * Math.cos(rad(bearing))) / 111_320,
    lng:
      point.lng +
      (metres * Math.sin(rad(bearing))) / (111_320 * Math.cos(rad(point.lat))),
  };
}

function densify(points) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    out.push(points[i]);
    out.push({
      lat: (points[i].lat + points[i + 1].lat) / 2,
      lng: (points[i].lng + points[i + 1].lng) / 2,
    });
  }
  out.push(points[points.length - 1]);
  return out;
}

const TRAIL = densify(WAYPOINTS);
const ANCHOR = TRAIL[0];
/** Хвост пути проходим «живьём» — ради курса движения. */
const WALKED = TRAIL.slice(-2);
const SEEDED = TRAIL.slice(1, -2);

/** Активный поход в том виде, в каком его хранит lib/trackState. */
function activeTrack(now) {
  const startedAt = now - (TRAIL.length + 1) * POINT_INTERVAL_MS;
  return {
    anchor: { ...ANCHOR, t: startedAt },
    startedAt,
    points: SEEDED.map((p, i) => ({
      ...p,
      t: startedAt + (i + 1) * POINT_INTERVAL_MS,
    })),
  };
}

/**
 * Прошлые походы для плитки «History» и экрана истории: без них главный экран
 * показывает «no walks yet» и выглядит как свежая установка.
 *
 * Путь — «туда и обратно» со сдвигом обратной ветки: так люди и ходят, а на
 * карте получается замкнутая петля вместо линии, дважды нарисованной по себе.
 * Длину и время считаем от самих точек — иначе подпись под кадром спорит с
 * нарисованным маршрутом.
 *
 * Походов шесть, и это тоже про кадр: с раскрытой картой первого список уходит
 * за нижний край, и подсказка «Sign in to keep them if you change phones» в
 * кадр не попадает. Для вошедшего пользователя (а в приложении он всегда
 * вошедший) она читалась бы как противоречие, хотя относится к походам,
 * записанным до входа.
 */
function savedHistory(now) {
  const day = 24 * 60 * 60_000;
  return [
    { ago: 2 * day, from: 0, to: 14, sideways: 250 },
    { ago: 5 * day, from: 3, to: 22, sideways: 70 },
    { ago: 9 * day, from: 0, to: 27, sideways: 290 },
    { ago: 14 * day, from: 6, to: 25, sideways: 110 },
    { ago: 21 * day, from: 1, to: 18, sideways: 300 },
    { ago: 26 * day, from: 8, to: 27, sideways: 200 },
  ].map(({ ago, from, to, sideways }, i) => {
    const out = TRAIL.slice(from, to);
    const home = out
      .slice(0, -1)
      .reverse()
      .map((p) => shift(p, sideways, 55));
    const points = [...out, ...home];
    const distanceM = Math.round(pathLengthM(points));
    const finishedAt = now - ago;
    const startedAt =
      finishedAt - Math.round((distanceM / 1000 / PACE_KMH) * 60) * 60_000;
    const step = (finishedAt - startedAt) / (points.length - 1);
    return {
      id: `local-${finishedAt}-${i}`,
      name: `Track ${new Date(startedAt).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      startedAt,
      finishedAt,
      distanceM,
      points: points.map((p, j) => ({ ...p, t: Math.round(startedAt + j * step) })),
      local: true,
    };
  });
}

/**
 * Скачанные офлайн-области: плитка «Offline map» на главной и список на экране
 * менеджера карт. Обе стоят на прошлых походах в том же лесу — так, как их и
 * качают перед поездкой.
 */
function savedRegions(now) {
  const date = (ts) =>
    new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const bbox = (radiusKm) => {
    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.cos((ANCHOR.lat * Math.PI) / 180));
    return {
      west: ANCHOR.lng - dLng,
      east: ANCHOR.lng + dLng,
      south: ANCHOR.lat - dLat,
      north: ANCHOR.lat + dLat,
    };
  };
  return [
    {
      id: "shot-region-a",
      name: `10 km · medium · ${date(now - 3 * 24 * 60 * 60_000)}`,
      sourceId: "outdoor",
      sourceIds: ["outdoor", "satellite"],
      bbox: bbox(10),
      minZoom: 9,
      maxZoom: 15,
      tileCount: 1462,
      sizeBytes: 57_016_320,
      createdAt: now - 3 * 24 * 60 * 60_000,
      center: ANCHOR,
      radiusKm: 10,
    },
    {
      id: "shot-region-b",
      name: `25 km · basic · ${date(now - 12 * 24 * 60 * 60_000)}`,
      sourceId: "outdoor",
      sourceIds: ["outdoor", "satellite"],
      bbox: bbox(25),
      minZoom: 9,
      maxZoom: 13,
      tileCount: 386,
      sizeBytes: 15_046_656,
      createdAt: now - 12 * 24 * 60 * 60_000,
      center: ANCHOR,
      radiusKm: 25,
    },
  ];
}

/**
 * Ждём, пока карта дорисуется. Тайлы Thunderforest приезжают неровно, и кадр,
 * снятый по таймеру, ловит серые прогалины.
 *
 * Условие — не «все тайлы загружены», а «число загруженных перестало расти»:
 * Leaflet держит в DOM и снятые с показа тайлы, часть из них так и остаётся
 * незагруженной, и ожидание полного комплекта упирается в таймаут на каждом
 * кадре.
 */
async function waitForTiles(page, { settle = 1200 } = {}) {
  const loaded = () =>
    page.evaluate(
      () =>
        Array.from(document.querySelectorAll("img.leaflet-tile")).filter(
          (t) => t.complete && t.naturalWidth > 0,
        ).length,
    );

  let previous = -1;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const count = await loaded();
    if (count > 0 && count === previous) break;
    previous = count;
    await sleep(1200);
  }
  if (previous <= 0) console.warn("    тайлы не загрузились — снимаем как есть");
  await sleep(settle);
}

async function capture({ name, viewport }) {
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });

  const now = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 3,
    locale: "en-US",
    timezoneId: "Europe/Helsinki",
    geolocation: { latitude: TRAIL.at(-3).lat, longitude: TRAIL.at(-3).lng },
    permissions: ["geolocation"],
    // Кольцо внимания у плитки START и пульсация точки «я здесь» на статичном
    // кадре выглядят как артефакт отрисовки, а не как анимация.
    reducedMotion: "reduce",
  });

  // История и офлайн-области нужны на всех кадрах, активный поход — не на всех,
  // поэтому его подкладываем отдельно.
  await ctx.addInitScript(
    ([history, regions, position]) => {
      localStorage.setItem("sf_track_history", JSON.stringify(history));
      localStorage.setItem("sf_tile_regions", JSON.stringify(regions));
      localStorage.setItem("sf_last_position", JSON.stringify(position));
    },
    [savedHistory(now), savedRegions(now), { ...ANCHOR, t: now - 60_000 }],
  );

  const page = await ctx.newPage();
  const shot = async (file) => {
    await page.screenshot({ path: join(dir, file), animations: "disabled" });
    console.log(`  ${name}/${file}`);
  };

  /* ---- Вход: кадры показывают приложение, а в нём человек всегда вошёл ---- */
  // networkidle и пауза — не перестраховка: по клику до гидратации форма уходит
  // обычным GET-запросом, и страница входа просто перезагружается.
  await page.goto(`${ORIGIN}/login`, { waitUntil: "networkidle" });
  await sleep(2000);
  await page.getByPlaceholder("you@example.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  /* ---- 1. Главный экран: START, карта «где я», нижнее меню ---- */
  await page.getByRole("button", { name: /Start/ }).waitFor({ timeout: 30_000 });
  await waitForTiles(page);
  // Приглашение войти исчезает только после ответа /api/subscription: снимаем
  // кадр, когда его на экране точно нет.
  await page
    .getByText("Sign in to sync your walks")
    .waitFor({ state: "detached", timeout: 20_000 })
    .catch(() => {});
  await shot("01-home.png");

  /* ---- 4. Предсохранение области касанием ---- */
  await page.getByRole("button", { name: "Save this area for offline use" }).click();
  await page.getByText("Pick an area to save").waitFor({ timeout: 30_000 });
  await waitForTiles(page, { settle: 2500 });
  await shot("04-save-area.png");

  /* ---- 5. Менеджер офлайн-карт ---- */
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("heading", { name: "Downloaded areas" }).waitFor();
  // Без центра экран показывает пустое «centre not set yet» и одну кнопку:
  // радиус, детализация и честная оценка объёма появляются только с ним.
  await page.getByRole("button", { name: "Use my location" }).first().click();
  await page.getByText("area radius").first().waitFor({ timeout: 30_000 });
  await sleep(1200);
  await shot("05-offline-map.png");

  /* ---- 3. История походов, первый раскрыт вместе с картой ---- */
  // Точное совпадение: «History» есть и в нижнем меню, и на плитке главной.
  await page.getByRole("button", { name: "History", exact: true }).click();
  const firstWalk = page.locator("button").filter({ hasText: /^Track / }).first();
  await firstWalk.click();
  await waitForTiles(page, { settle: 2000 });
  await shot("03-history.png");

  /* ---- 2. Активный поход: стрелка возврата и пройденный путь ---- */
  await page.evaluate((track) => {
    localStorage.setItem("sf_active_track", JSON.stringify(track));
  }, activeTrack(now));
  await page.goto(`${ORIGIN}/dashboard/track`, { waitUntil: "domcontentloaded" });

  // Хвост пути проходим по-настоящему: watchPosition считает по нему курс
  // движения, и стрелка возврата получает точку отсчёта.
  for (const p of WALKED) {
    await ctx.setGeolocation({ latitude: p.lat, longitude: p.lng });
    await sleep(3000);
  }
  await page.getByText("Entry point:").waitFor({ timeout: 45_000 });
  await waitForTiles(page, { settle: 2000 });
  await shot("02-way-back.png");

  await browser.close();
}

for (const target of TARGETS) {
  console.log(target.name);
  await capture(target);
}
console.log(`\nshots -> ${OUT}`);
