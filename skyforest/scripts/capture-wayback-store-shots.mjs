#!/usr/bin/env node
/**
 * Скриншоты WayBack для App Store и Google Play (английская локаль).
 *
 * Снимаем боевой wayback.skyforest.ai в дизайне «Widget Board». Аккаунт не
 * нужен: поход и офлайн-карта работают анонимно, поэтому состояние устройства
 * подкладываем в localStorage — активный поход (sf_active_track), история
 * походов (sf_track_history) и скачанные области (sf_tile_regions). Так кадры
 * детерминированные, а на карте есть настоящий пройденный путь, а не пустота.
 *
 * Место — Nuuksio National Park (Espoo, Finland): узнаваемый лес с тропами и
 * подписями латиницей. Локация вне ЕАЭС и без кириллицы — требование сторов
 * к англоязычному листингу.
 *
 * Порядок съёмки отличается от нумерации кадров: история и ручной выбор точки
 * входа живут на главной без активного похода, поэтому поход подкладывается
 * последним.
 *
 * Последние две точки пути не подкладываются, а «проходятся» через
 * setGeolocation: watchPosition должен увидеть смещение, иначе курс движения
 * (course over ground) не считается и вместо стрелки возврата экран показывает
 * подсказку «пройдите пару шагов».
 *
 * Размеры: Apple требует 1290×2796 (6.9″), Google Play не принимает сторону
 * длиннее двойной короткой — для него отдельный проход 1290×2580.
 *
 * Запуск: node scripts/capture-wayback-store-shots.mjs [origin]
 * Выход:  docs/store-shots/wayback/{apple,play}/*.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/store-shots/wayback");
const ORIGIN = process.argv[2] || "https://wayback.skyforest.ai";

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
/** Прогулочный темп по лесу: связывает длину пути и время на кадрах. */
const PACE_KMH = 1.8;

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
 * Прошлые походы для плитки «History»: без них главный экран показывает
 * «no walks yet» и выглядит как свежая установка.
 *
 * Путь — «туда и обратно» со сдвигом обратной ветки: так люди и ходят, а на
 * карте получается замкнутая петля вместо линии, дважды нарисованной по себе.
 * Длину и время считаем от самих точек — иначе подпись под кадром спорит с
 * нарисованным маршрутом.
 */
function savedHistory(now) {
  const day = 24 * 60 * 60_000;
  return [
    { ago: 2 * day, from: 0, to: 14, sideways: 250 },
    { ago: 5 * day, from: 3, to: 22, sideways: 70 },
    { ago: 9 * day, from: 0, to: 27, sideways: 290 },
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

/** Скачанные офлайн-области — плитка «Offline map» и экран менеджера карт. */
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
    await page.screenshot({ path: join(dir, file) });
    console.log(`  ${name}/${file}`);
  };

  /* ---- 1. Главный экран: похода нет ---- */
  await page.goto(`${ORIGIN}/dashboard/track`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "I'm entering the forest" }).waitFor();
  await sleep(1200);
  await shot("01-home.png");

  /* ---- 2. Ручная постановка точки входа ---- */
  await page.getByRole("button", { name: "Set entry point on the map" }).click();
  await page.getByRole("button", { name: "I entered here" }).waitFor();
  // Тайлы Thunderforest на полном экране грузятся заметно дольше плитки.
  await sleep(6000);
  await page.mouse.click(viewport.width / 2, viewport.height * 0.46);
  await sleep(1500);
  await shot("02-entry-point.png");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  /* ---- 4. История походов, первый раскрыт вместе с картой ---- */
  await page.getByRole("button", { name: /History/ }).click();
  const firstWalk = page.locator("button").filter({ hasText: /^Track / }).first();
  await firstWalk.click();
  await sleep(6000);
  await shot("04-history.png");
  await page.getByRole("button", { name: "Back" }).click();

  /* ---- 3, 5. Активный поход: стрелка возврата и офлайн-карта ---- */
  await page.evaluate((track) => {
    localStorage.setItem("sf_active_track", JSON.stringify(track));
  }, activeTrack(now));
  await page.goto(`${ORIGIN}/dashboard/track`, { waitUntil: "networkidle" });

  // Хвост пути проходим по-настоящему: watchPosition считает по нему курс
  // движения, и стрелка возврата получает точку отсчёта.
  for (const p of WALKED) {
    await ctx.setGeolocation({ latitude: p.lat, longitude: p.lng });
    await sleep(2500);
  }
  await page.getByText("Entry point:").waitFor({ timeout: 30_000 });
  await sleep(7000);
  await shot("03-way-back.png");

  /* ---- 5. Менеджер офлайн-карт ---- */
  await page.getByRole("button", { name: "Manage" }).click();
  await page.getByRole("heading", { name: "Downloaded areas" }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1500);
  await shot("05-offline-map.png");

  await browser.close();
}

for (const target of TARGETS) {
  console.log(target.name);
  await capture(target);
}
console.log(`\nshots -> ${OUT}`);
