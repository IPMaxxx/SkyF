#!/usr/bin/env node
/**
 * Сборка всей графики WayBack из одного исходника — assets/icon.png.
 *
 * Порядок такой:
 *   1. из иконки рисуются assets/splash.png и splash-dark.png — светлый холст
 *      «Widget Board» с плиткой логотипа и подписью, как в WayBackSplash;
 *   2. веб-логотипы public/icons/wayback-{192,512}.png тоже берутся отсюда,
 *      чтобы манифест, сплэш в вебе и иконка приложения не разъезжались;
 *   3. дальше @capacitor/assets раскладывает иконки и сплэши по нативным
 *      проектам (он же делал это раньше — отсюда имена Default@Nx~universal).
 *
 * Скругление нигде не запекается: iOS накладывает маску сам и не принимает
 * альфу, а в вебе углы скругляет CSS (rounded-[26px]).
 *
 * Запуск из каталога apps/wayback: node make-assets.mjs
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = join(HERE, "..", "..");
const ICON = join(HERE, "assets", "icon.png");

const CANVAS = "#eef0ec"; // --color-wb-canvas
const INK = "#141a15"; // --color-wb-ink, он же фон иконки
const SPLASH_SIDE = 2732;

if (!existsSync(ICON)) {
  console.error(`нет исходника: ${ICON}`);
  process.exit(1);
}

/** Логотип плиткой со скруглением 0.25 стороны — как в вебе (26 из 104). */
async function tile(size) {
  const r = Math.round(size * 0.25);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );
  return sharp(ICON)
    .resize(size, size, { fit: "cover" })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function splash(side) {
  const logoSize = Math.round(side * 0.19);
  const fontSize = Math.round(logoSize * 0.36);
  const gap = Math.round(logoSize * 0.34);
  const blockH = logoSize + gap + fontSize;
  const top = Math.round((side - blockH) / 2);

  const label = Buffer.from(
    `<svg width="${side}" height="${side}">
       <text x="${Math.round(side / 2)}" y="${top + logoSize + gap + Math.round(fontSize * 0.82)}"
             font-family="Helvetica, Arial, sans-serif" font-weight="800"
             font-size="${fontSize}" fill="${INK}"
             letter-spacing="${-(fontSize * 0.02).toFixed(2)}"
             text-anchor="middle">WayBack</text>
     </svg>`,
  );

  return sharp({
    create: { width: side, height: side, channels: 4, background: CANVAS },
  })
    .composite([
      { input: await tile(logoSize), left: Math.round((side - logoSize) / 2), top },
      { input: label, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

// 1. Сплэши-исходники. Тёмный вариант тоже светлый: в вебе сплэш всегда светлый,
// иначе на запуске в тёмной теме мелькнёт чужой фон.
const body = await splash(SPLASH_SIDE);
for (const name of ["splash.png", "splash-dark.png"]) {
  await sharp(body).toFile(join(HERE, "assets", name));
  console.log(`  assets/${name}  ${SPLASH_SIDE}x${SPLASH_SIDE}`);
}

// 2. Веб-логотипы: квадратные, скругление даёт CSS.
const iconsDir = join(SKY_ROOT, "public", "icons");
await mkdir(iconsDir, { recursive: true });
for (const size of [192, 512]) {
  const out = join(iconsDir, `wayback-${size}.png`);
  await sharp(ICON).resize(size, size, { fit: "cover" }).png().toFile(out);
  console.log(`  public/icons/wayback-${size}.png  ${size}x${size}`);
}

// 3. Нативные наборы.
console.log("раскладываю по нативным проектам (@capacitor/assets):");
execFileSync(
  "npx",
  [
    "@capacitor/assets",
    "generate",
    "--iconBackgroundColor",
    INK,
    "--iconBackgroundColorDark",
    INK,
    "--splashBackgroundColor",
    CANVAS,
    "--splashBackgroundColorDark",
    CANVAS,
  ],
  { cwd: HERE, stdio: "inherit" },
);
