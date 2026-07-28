#!/usr/bin/env node
/**
 * Перерисовывает исходники splash под тёмную тему: плитка логотипа из
 * resources/icon.png по центру холста #0b120d.
 *
 * Геометрия и скругление берутся из прежнего светлого splash, а не задаются
 * заново: маска угла считается из того, как логотип был смешан со светлым
 * фоном (alpha = (splash - фон) / (icon - фон)). Иначе пришлось бы угадывать
 * кривую скругления, и плитка стала бы чуть другой формы.
 *
 * Запуск: node make-splash.mjs
 * Итог:   resources/splash.png и resources/splash-dark.png (файлы одинаковые,
 *         как и были: у приложения одна плитка на обе схемы устройства).
 */
import { execSync } from "node:child_process";
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
/** Прежний светлый фон — из него восстанавливаем маску скругления. */
const LIGHT = [0xf3, 0xf7, 0xf1];
/** Плитка логотипа: 900×900 по центру, ровно как было. */
const TILE = 900;
const OFFSET = (CANVAS - TILE) / 2;

/**
 * Коммит со светлым splash — источник геометрии. Ссылка именно на него, а не
 * на HEAD: после первого же запуска в HEAD лежит тёмный результат, и скрипт
 * стал бы считать маску сам от себя.
 */
const LIGHT_SPLASH_AT = "0a08826";

const REFERENCE = execSync(`git show ${LIGHT_SPLASH_AT}:skyforest/apps/mushroom-checker/resources/splash.png`, {
  cwd: resolve(HERE, "../../.."),
  maxBuffer: 64 * 1024 * 1024,
  encoding: "buffer",
});

const icon = await sharp(join(RES, "icon.png"))
  .resize(TILE, TILE, { fit: "cover" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const prev = await sharp(REFERENCE)
  .extract({ left: OFFSET, top: OFFSET, width: TILE, height: TILE })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(TILE * TILE * 4);

for (let p = 0; p < TILE * TILE; p++) {
  const i = p * 4;

  // Из каждого канала получаем свою оценку прозрачности и берём ту, где
  // логотип дальше всего от фона: там деление устойчивее всего.
  let alpha = 1;
  let confidence = 0;
  for (let c = 0; c < 3; c++) {
    const spread = icon.data[i + c] - LIGHT[c];
    if (Math.abs(spread) <= confidence) continue;
    confidence = Math.abs(spread);
    alpha = (prev.data[i + c] - LIGHT[c]) / spread;
  }
  alpha = Math.min(1, Math.max(0, alpha));

  for (let c = 0; c < 3; c++) {
    const dark = [DARK.r, DARK.g, DARK.b][c];
    out[i + c] = Math.round(icon.data[i + c] * alpha + dark * (1 - alpha));
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
