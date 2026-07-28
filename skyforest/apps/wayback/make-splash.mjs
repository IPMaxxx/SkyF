#!/usr/bin/env node
/**
 * Перерисовка нативных сплэш-экранов WayBack под светлую схему «Widget Board».
 *
 * Сгенерированные @capacitor/assets картинки остались от прежнего тёмного
 * оформления (#0e1710), и на запуске светлого приложения мелькал тёмный экран.
 * Исходников assets/ в репозитории нет, поэтому рисуем сами: холст #eef0ec,
 * логотип плиткой с тем же радиусом 0.25 от стороны, что и в вебе, и подпись —
 * повторяем компоновку src/flavors/wayback/WayBackSplash.tsx.
 *
 * Размеры не выдумываем: каждый существующий файл перерисовывается в своих
 * пикселях, поэтому набор плотностей Android и вариантов iOS остаётся прежним.
 * Тёмные варианты (-dark, -night) тоже светлые: в вебе сплэш всегда светлый.
 *
 * Запуск из каталога apps/wayback: node make-splash.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = join(HERE, "..", "..");
const LOGO = join(SKY_ROOT, "public", "icons", "wayback-512.png");

const CANVAS = "#eef0ec";
const INK = "#141a15";

if (!existsSync(LOGO)) {
  console.error(`нет логотипа: ${LOGO}`);
  process.exit(1);
}
const logoSrc = readFileSync(LOGO);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Логотип как плитка со скруглением 0.25 стороны — как в вебе (26 из 104). */
async function roundedLogo(size) {
  const r = Math.round(size * 0.25);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );
  return sharp(logoSrc)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function render(width, height) {
  const side = Math.min(width, height);
  const logoSize = Math.max(24, Math.round(side * 0.19));
  const fontSize = Math.max(9, Math.round(logoSize * 0.36));
  const gap = Math.round(logoSize * 0.34);

  const blockH = logoSize + gap + fontSize;
  const top = Math.round((height - blockH) / 2);
  const logoLeft = Math.round((width - logoSize) / 2);
  // Базовая линия текста: под плиткой, с поправкой на выносные элементы шрифта.
  const textY = top + logoSize + gap + Math.round(fontSize * 0.82);

  const logo = await roundedLogo(logoSize);
  const label = Buffer.from(
    `<svg width="${width}" height="${height}">
       <text x="${Math.round(width / 2)}" y="${textY}"
             font-family="Helvetica, Arial, sans-serif" font-weight="800"
             font-size="${fontSize}" fill="${INK}"
             letter-spacing="${-(fontSize * 0.02).toFixed(2)}"
             text-anchor="middle">${esc("WayBack")}</text>
     </svg>`,
  );

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: CANVAS,
    },
  })
    .composite([
      { input: logo, left: logoLeft, top },
      { input: label, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function collect() {
  const targets = [];

  const iosDir = join(
    HERE,
    "ios/App/App/Assets.xcassets/Splash.imageset",
  );
  if (existsSync(iosDir)) {
    for (const f of await readdir(iosDir)) {
      if (f.endsWith(".png")) targets.push(join(iosDir, f));
    }
  }

  const resDir = join(HERE, "android/app/src/main/res");
  if (existsSync(resDir)) {
    for (const d of await readdir(resDir)) {
      const p = join(resDir, d, "splash.png");
      if (existsSync(p)) targets.push(p);
    }
  }
  return targets;
}

const targets = await collect();
if (!targets.length) {
  console.error("не нашёл ни одного файла сплэша");
  process.exit(1);
}

let done = 0;
for (const file of targets) {
  const { width, height } = await sharp(file).metadata();
  const out = await render(width, height);
  await sharp(out).toFile(file);
  done += 1;
  console.log(`  ${width}x${height}  ${file.replace(HERE + "/", "")}`);
}
console.log(`перерисовано файлов: ${done}`);
