#!/usr/bin/env node
/**
 * Feature graphic для листинга WayBack в Google Play — 1024×500.
 *
 * Собирается из того же исходника, что и вся графика приложения
 * (assets/icon.png), в схеме приложения: тёмный холст, зелёный акцент,
 * моноширинные заголовки капсом. Рядом лежит make-assets.mjs — он делает
 * иконки и сплэши, здесь ровно тот же подход и та же зависимость (sharp).
 *
 * Требования Play: ровно 1024×500, PNG без альфы (или JPEG). Play обрезает
 * края в некоторых раскладках и накладывает поверх графики название
 * приложения, поэтому текст держится в 112 px от краёв, а слово WayBack стоит
 * логотипом слева сверху, а не мелкой подписью по центру снизу.
 *
 * Запуск из каталога skyforest: node apps/wayback/make-feature-graphic.mjs
 * Заливка: node fastlane/play-screenshots.mjs ai.skyforest.wayback en-US \
 *            featureGraphic docs/store-shots/wayback/play/feature-graphic.png
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKY_ROOT = join(HERE, "..", "..");
const ICON = join(HERE, "assets", "icon.png");
const OUT = join(
  SKY_ROOT,
  "docs",
  "store-shots",
  "wayback",
  "play",
  "feature-graphic.png",
);

const W = 1024;
const H = 500;

// Токены из src/styles/flavors/wayback.css. Схема тёмная: картинка в листинге
// должна показывать то же приложение, которое человек увидит после установки.
const CANVAS = "#0b120d"; // --color-wb-canvas
const INK = "#eaf2ea"; // --color-wb-ink
const PRIMARY = "#5fb573"; // --color-wb-primary
const ON_PRIMARY = "#06120a"; // --color-wb-on-primary: стрелка на зелёном
const PRIMARY_SOFT = "#0e3a1d"; // --color-wb-primary-soft: подпись на зелёном
const PRIMARY_LIFT = "#6fce7f"; // круг внутри зелёной плитки, как в приложении

/** Моноширинный — как --font-wb-mono в приложении, с системными фолбэками. */
const MONO = "IBM Plex Mono, Menlo, DejaVu Sans Mono, monospace";

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
 * Правая плитка повторяет зелёную карточку старта: круг со стрелкой к точке
 * входа. Стрелка — тот же силуэт, что у компаса на экране похода.
 */
const PANEL = { x: 584, y: 82, w: 328, h: 336, r: 44 };
const DISC = { cx: PANEL.x + PANEL.w / 2, cy: 248, r: 98 };

const layout = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${CANVAS}"/>

  <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}"
        rx="${PANEL.r}" ry="${PANEL.r}" fill="${PRIMARY}"/>
  <circle cx="${DISC.cx}" cy="${DISC.cy}" r="${DISC.r}" fill="${PRIMARY_LIFT}"/>
  <path d="M ${DISC.cx} ${DISC.cy - 76}
           L ${DISC.cx + 50} ${DISC.cy + 52}
           L ${DISC.cx} ${DISC.cy + 26}
           L ${DISC.cx - 50} ${DISC.cy + 52} Z"
        fill="${ON_PRIMARY}"/>
  <text x="${DISC.cx}" y="392" text-anchor="middle"
        font-family="${MONO}" font-weight="500" font-size="18"
        letter-spacing="2.4" fill="${PRIMARY_SOFT}">TO THE ENTRY POINT</text>

  <text x="${TILE_X + TILE + 28}" y="138"
        font-family="${MONO}" font-weight="700" font-size="34"
        letter-spacing="1" fill="${INK}">WAYBACK</text>

  <text x="${TILE_X}" y="276"
        font-family="${MONO}" font-weight="700" font-size="54"
        letter-spacing="-1" fill="${INK}">ALWAYS KNOW</text>
  <text x="${TILE_X}" y="350"
        font-family="${MONO}" font-weight="700" font-size="54"
        letter-spacing="-1" fill="${INK}">THE WAY BACK</text>

  <text x="${TILE_X}" y="404"
        font-family="${MONO}" font-weight="500" font-size="20"
        letter-spacing="2.8" fill="${PRIMARY}">OFFLINE · NO ACCOUNT NEEDED</text>
</svg>
`;

if (!existsSync(ICON)) {
  console.error(`нет исходника: ${ICON}`);
  process.exit(1);
}

await mkdir(dirname(OUT), { recursive: true });

// removeAlpha даёт PNG truecolour без альфы — Play не принимает 32-битный PNG.
await sharp(Buffer.from(layout))
  .composite([{ input: await tile(TILE), left: TILE_X, top: TILE_Y }])
  .flatten({ background: CANVAS })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const meta = await sharp(OUT).metadata();
console.log(
  `${OUT.replace(`${SKY_ROOT}/`, "")}  ${meta.width}x${meta.height}  каналов: ${meta.channels}  альфа: ${meta.hasAlpha ? "есть" : "нет"}`,
);
if (meta.width !== W || meta.height !== H || meta.hasAlpha) {
  console.error("не проходит требования Play: нужен ровно 1024x500 без альфы");
  process.exit(1);
}
