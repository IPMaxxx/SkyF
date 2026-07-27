#!/usr/bin/env node
/**
 * Иконки приложений из «мастер»-картинок 1024×1024.
 *
 *   Mushroom Checker — неоновый гриб (бывшая иконка SkyForest);
 *   SkyForest        — картинка-логотип SKY forest.
 *
 * Скрипт готовит только исходники: `resources/icon.png` и `resources/splash*.png`
 * для @capacitor/assets (он раскладывает их по ios/android), плюс PNG для веба
 * и манифестов. Нативные наборы генерирует `npm run icons` в каждой оболочке.
 *
 * Запуск: node scripts/make-app-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Неоновый гриб: тёмная арт-иконка, ушла в Mushroom Checker. */
const CHECKER_MASTER = join(root, "assets/app-icon-checker.png");
/** SKY forest: картинка-логотип, стала иконкой основного приложения. */
const SKYFOREST_MASTER = join(root, "assets/logo.png");

/** Splash: логотип-плитка по центру фирменного фона (2732×2732 для @capacitor/assets). */
async function splash(master, { background, tile = 900, radius = 200 }) {
  const rounded = await sharp(master)
    .resize(tile, tile)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" rx="${radius}" ry="${radius}"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background,
    },
  })
    .composite([{ input: rounded, gravity: "center" }])
    .png()
    .toBuffer();
}

async function build({ master, resourcesDir, webIcons, splashBackground }) {
  mkdirSync(resourcesDir, { recursive: true });
  await sharp(master)
    .resize(1024, 1024)
    .png()
    .toFile(join(resourcesDir, "icon.png"));

  const splashPng = await splash(master, { background: splashBackground });
  await sharp(splashPng).toFile(join(resourcesDir, "splash.png"));
  await sharp(splashPng).toFile(join(resourcesDir, "splash-dark.png"));

  for (const [path, size] of webIcons) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    await sharp(master).resize(size, size).png().toFile(join(root, path));
  }
}

// Mushroom Checker: светлый splash под редизайн «Soft Product».
await build({
  master: CHECKER_MASTER,
  resourcesDir: join(root, "apps/mushroom-checker/resources"),
  splashBackground: { r: 0xf3, g: 0xf7, b: 0xf1, alpha: 1 },
  webIcons: [
    ["public/icons/checker-192.png", 192],
    ["public/icons/checker-512.png", 512],
  ],
});
console.log("✓ Mushroom Checker");

// SkyForest: тёмный брендовый фон, как в NativeSplash.
await build({
  master: SKYFOREST_MASTER,
  resourcesDir: join(root, "resources"),
  splashBackground: { r: 0x0e, g: 0x17, b: 0x10, alpha: 1 },
  webIcons: [["public/favicon.png", 256]],
});
console.log("✓ SkyForest");
