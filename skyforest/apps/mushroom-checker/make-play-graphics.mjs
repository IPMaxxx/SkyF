#!/usr/bin/env node
/**
 * Графика листинга Mushroom Checker в Google Play:
 *
 * - feature graphic 1024×500 (Play требует ровно этот размер, PNG без альфы);
 * - иконка листинга 512×512 (в записи Checker её не было вовсе).
 *
 * Сестринский скрипт — apps/wayback/make-feature-graphic.mjs. Отличия: своя
 * схема (светлая, токены `ck-*` из src/styles/flavors/checker.css), свой
 * исходник иконки (resources/icon.png этого приложения) и второй выход под
 * иконку листинга.
 *
 * Play обрезает края в некоторых раскладках и накладывает поверх графики
 * название приложения, поэтому текст держится в 112 px от краёв, а название
 * мелкой подписью по центру снизу не дублируется: слева сверху стоит логотип с
 * моно-вордмарком, дальше — тот же заголовок, что человек увидит на главном
 * экране приложения.
 *
 * Запуск из каталога skyforest: node apps/mushroom-checker/make-play-graphics.mjs
 * Заливка:
 *   node fastlane/play-screenshots.mjs ai.skyforest.mushroomchecker en-US \
 *     featureGraphic docs/store-shots/checker/play/feature-graphic.png
 *   PLAY_PKG=ai.skyforest.mushroomchecker node fastlane/play-icon.mjs \
 *     docs/store-shots/checker/play/icon.png --apply
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = join(HERE, "..", "..");
const ICON = join(HERE, "resources", "icon.png");
const OUT_DIR = join(SKY_ROOT, "docs", "store-shots", "checker", "play");
const OUT_GRAPHIC = join(OUT_DIR, "feature-graphic.png");
const OUT_ICON = join(OUT_DIR, "icon.png");

const W = 1024;
const H = 500;

// Токены из src/styles/flavors/checker.css. Схема светлая: картинка в листинге
// должна показывать то же приложение, которое человек увидит после установки.
const CANVAS = "#f3f7f1"; // --color-ck-canvas
const SURFACE = "#ffffff"; // --color-ck-surface
const BORDER = "#dfe8db"; // --color-ck-border
const PRIMARY = "#3f9c58"; // --color-ck-primary
const PRIMARY_LIGHT = "#5fb573"; // --color-ck-primary-light
const PRIMARY_TINT = "#e7f4e9"; // --color-ck-primary-tint
const PRIMARY_MID = "#3d6248"; // --color-ck-primary-mid
const INK = "#132318"; // --color-ck-ink
const MUTED = "#7d8d80"; // --color-ck-muted

/** Шрифты приложения (--font-ck / --font-ck-mono) с системными фолбэками. */
const SANS = "Plus Jakarta Sans, Avenir Next, Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "JetBrains Mono, Menlo, DejaVu Sans Mono, monospace";

/** Логотип плиткой со скруглением 0.25 стороны — как в make-assets.mjs. */
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

const TILE = 84;
const TILE_X = 112;
const TILE_Y = 84;

/**
 * Правая карточка повторяет кадр съёмки с главного экрана: рамка сканирования
 * и силуэт гриба внутри — тот же мотив, что в иконке приложения.
 */
const CARD = { x: 584, y: 78, w: 328, h: 344, r: 44 };
const DISC = { cx: CARD.x + CARD.w / 2, cy: 232, r: 104 };
const CAP_R = 66;
const FRAME = 124; // вылет уголков рамки от центра диска
const ARM = 40;

const corner = (dx, dy) => {
  const x = DISC.cx + dx * FRAME;
  const y = DISC.cy + dy * FRAME;
  return `<path d="M ${x} ${y + dy * -ARM} L ${x} ${y} L ${x + dx * -ARM} ${y}"
        fill="none" stroke="${PRIMARY_LIGHT}" stroke-width="9"
        stroke-linecap="round" stroke-linejoin="round"/>`;
};

const layout = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${CANVAS}"/>

  <rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}"
        rx="${CARD.r}" ry="${CARD.r}" fill="${SURFACE}"
        stroke="${BORDER}" stroke-width="2"/>
  <circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="${PRIMARY_TINT}"/>
  <path d="M ${DISC.cx - CAP_R} ${DISC.cy + 6} a ${CAP_R} ${CAP_R} 0 0 1 ${CAP_R * 2} 0 z"
        fill="${PRIMARY}"/>
  <rect x="${DISC.cx - 21}" y="${DISC.cy + 6}" width="42" height="72" rx="20"
        fill="${PRIMARY}"/>
  ${corner(-1, -1)}
  ${corner(1, -1)}
  ${corner(-1, 1)}
  ${corner(1, 1)}
  <text x="${DISC.cx}" y="386" text-anchor="middle"
        font-family="${MONO}" font-weight="500" font-size="18"
        letter-spacing="2.4" fill="${PRIMARY_MID}">CHECK YOUR FIND</text>

  <text x="${TILE_X + TILE + 26}" y="138"
        font-family="${MONO}" font-weight="700" font-size="27"
        letter-spacing="1" fill="${INK}">MUSHROOM CHECKER</text>

  <text x="${TILE_X}" y="272"
        font-family="${SANS}" font-weight="800" font-size="58"
        letter-spacing="-1.6" fill="${INK}">Mushroom?</text>
  <text x="${TILE_X}" y="342"
        font-family="${SANS}" font-weight="800" font-size="58"
        letter-spacing="-1.6" fill="${PRIMARY}">Let&#39;s check.</text>

  <text x="${TILE_X}" y="398"
        font-family="${MONO}" font-weight="500" font-size="18"
        letter-spacing="2.6" fill="${MUTED}">PHOTO IN &#183; SPECIES + LOOKALIKES</text>
</svg>
`;

if (!existsSync(ICON)) {
  console.error(`нет исходника: ${ICON}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

// removeAlpha даёт PNG truecolour без альфы — Play не принимает 32-битный PNG.
await sharp(Buffer.from(layout))
  .composite([{ input: await tile(TILE), left: TILE_X, top: TILE_Y }])
  .flatten({ background: CANVAS })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(OUT_GRAPHIC);

await sharp(ICON)
  .resize(512, 512, { fit: "cover" })
  .flatten({ background: CANVAS })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(OUT_ICON);

let bad = false;
for (const [file, w, h] of [
  [OUT_GRAPHIC, W, H],
  [OUT_ICON, 512, 512],
]) {
  const meta = await sharp(file).metadata();
  console.log(
    `${file.replace(`${SKY_ROOT}/`, "")}  ${meta.width}x${meta.height}  каналов: ${meta.channels}  альфа: ${meta.hasAlpha ? "есть" : "нет"}`,
  );
  if (meta.width !== w || meta.height !== h || meta.hasAlpha) bad = true;
}
if (bad) {
  console.error("не проходит требования Play: нужен точный размер и PNG без альфы");
  process.exit(1);
}
