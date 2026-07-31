#!/usr/bin/env node
/**
 * Иконки приложений из «мастер»-картинок 1024×1024.
 *
 *   Mushroom Checker — лисичка в неоновой рамке;
 *   SkyForest        — картинка-логотип SKY forest.
 *
 * Скрипт готовит только исходники: `resources/icon.png` и `resources/splash*.png`
 * для @capacitor/assets (он раскладывает их по ios/android), плюс PNG для веба
 * и манифестов. Нативные наборы генерирует `npm run icons` в каждой оболочке.
 *
 * Splash Mushroom Checker здесь не собирается: у него своя плитка на тёмном
 * холсте со скруглением из сохранённой маски, за это отвечает
 * `apps/mushroom-checker/make-splash.mjs`. Порядок при смене иконки Checker:
 * заменить мастер → этот скрипт → make-splash.mjs → `npm run icons` в оболочке.
 *
 * Запуск: node scripts/make-app-icons.mjs [checker|skyforest]
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

/**
 * Иконка под маску Android: система обрезает её до своей формы, поэтому
 * полезная часть занимает 80%, а поля заливаются цветом угла самой картинки —
 * иначе у иконки с рисунком до края видно обрезанную рамку.
 */
async function maskable(master, size) {
  const inner = Math.round(size * 0.8);
  const pad = Math.round((size - inner) / 2);
  const corner = await sharp(master)
    .extract({ left: 0, top: 0, width: 24, height: 24 })
    .stats();
  const background = {
    r: Math.round(corner.channels[0].mean),
    g: Math.round(corner.channels[1].mean),
    b: Math.round(corner.channels[2].mean),
    alpha: 1,
  };
  const tile = await sharp(master).resize(inner, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: tile, left: pad, top: pad }])
    .png({ palette: true, effort: 10 })
    .toBuffer();
}

async function build({ master, resourcesDir, webIcons, splashBackground }) {
  mkdirSync(resourcesDir, { recursive: true });
  await sharp(master)
    .resize(1024, 1024)
    .png()
    .toFile(join(resourcesDir, "icon.png"));

  if (splashBackground) {
    const splashPng = await splash(master, { background: splashBackground });
    await sharp(splashPng).toFile(join(resourcesDir, "splash.png"));
    await sharp(splashPng).toFile(join(resourcesDir, "splash-dark.png"));
  }

  for (const [path, size, kind] of webIcons) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    // Палитра: мастер Checker фотографический, полноцветный PNG на 512 весит
    // под полмегабайта и уезжает в вебе как есть, без оптимизации Next.
    const png =
      kind === "maskable"
        ? await maskable(master, size)
        : await sharp(master).resize(size, size).png({ palette: true, effort: 10 }).toBuffer();
    await sharp(png).toFile(join(root, path));
  }
}

const only = process.argv[2];

if (!only || only === "checker") {
  await build({
    master: CHECKER_MASTER,
    resourcesDir: join(root, "apps/mushroom-checker/resources"),
    // splash — за make-splash.mjs, см. шапку файла
    splashBackground: null,
    webIcons: [
      ["public/icons/checker-192.png", 192],
      ["public/icons/checker-512.png", 512],
      ["public/icons/checker-512-maskable.png", 512, "maskable"],
    ],
  });
  console.log("✓ Mushroom Checker");
}

if (!only || only === "skyforest") {
  // SkyForest: тёмный брендовый фон, как в NativeSplash.
  await build({
    master: SKYFOREST_MASTER,
    resourcesDir: join(root, "resources"),
    splashBackground: { r: 0x0e, g: 0x17, b: 0x10, alpha: 1 },
    webIcons: [["public/favicon.png", 256]],
  });
  console.log("✓ SkyForest");
}
