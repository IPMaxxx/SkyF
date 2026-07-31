#!/usr/bin/env node
/**
 * Перерисовывает исходники splash: плитка логотипа из resources/icon.png по
 * центру холста #0b120d.
 *
 * Скругление плитки лежит готовой маской в resources/tile-mask.png — она снята
 * с самого первого splash приложения, поэтому форма угла остаётся прежней при
 * любой смене логотипа. Раньше маска восстанавливалась из старого коммита по
 * формуле alpha = (splash - фон) / (icon - фон); это работало, только пока
 * логотип не менялся, и на новой картинке давало шум.
 *
 * Запуск: node make-splash.mjs
 * Итог:   resources/splash.png и resources/splash-dark.png (файлы одинаковые:
 *         у приложения одна плитка на обе схемы устройства).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const RES = join(HERE, "resources");

// sharp живёт в зависимостях сайта: у оболочки своих node_modules под него нет.
const require = createRequire(resolve(HERE, "../../package.json"));
const sharp = require("sharp");

const CANVAS = 2732;
const DARK = { r: 0x0b, g: 0x12, b: 0x0d };
/** Плитка логотипа: 900×900 по центру. */
const TILE = 900;
const OFFSET = (CANVAS - TILE) / 2;

const icon = await sharp(join(RES, "icon.png"))
  .resize(TILE, TILE, { fit: "cover" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const mask = await sharp(join(RES, "tile-mask.png"))
  .resize(TILE, TILE)
  .greyscale()
  .raw()
  .toBuffer();

const out = Buffer.alloc(TILE * TILE * 4);
const dark = [DARK.r, DARK.g, DARK.b];

for (let p = 0; p < TILE * TILE; p++) {
  const i = p * 4;
  const alpha = mask[p] / 255;
  for (let c = 0; c < 3; c++) {
    out[i + c] = Math.round(icon.data[i + c] * alpha + dark[c] * (1 - alpha));
  }
  out[i + 3] = 255;
}

const tile = await sharp(out, {
  raw: { width: TILE, height: TILE, channels: 4 },
})
  .png()
  .toBuffer();

const splash = await sharp({
  create: {
    width: CANVAS,
    height: CANVAS,
    channels: 4,
    background: { ...DARK, alpha: 1 },
  },
})
  .composite([{ input: tile, left: OFFSET, top: OFFSET }])
  .png()
  .toBuffer();

for (const name of ["splash.png", "splash-dark.png"]) {
  await sharp(splash).toFile(join(RES, name));
  console.log(`готово: resources/${name}`);
}
