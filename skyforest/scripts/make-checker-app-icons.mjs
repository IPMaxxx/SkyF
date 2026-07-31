#!/usr/bin/env node
/**
 * Иконки соседних приложений для панели «Ещё» Mushroom Checker.
 *
 * Источники — входные иконки нативных сборок (1024×1024), из них берётся
 * только копия: сами файлы нативных проектов скрипт не трогает.
 *
 *   resources/icon.png             → public/checker/app-icons/skyforest.webp
 *   apps/wayback/assets/icon.png   → public/checker/app-icons/wayback.webp
 *
 * Иконки самого Checker здесь нет намеренно: в интерфейсе он представлен
 * своим ассетом флейвора (`FLAVORS.checker.faviconPath`).
 *
 * 96×96 — примерно 3,7× от размера в списке (26px), то есть с запасом под
 * ретину. Запуск: node scripts/make-checker-app-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/checker/app-icons");
const SIZE = 96;

const ICONS = [
  ["resources/icon.png", "skyforest.webp"],
  ["apps/wayback/assets/icon.png", "wayback.webp"],
];

mkdirSync(out, { recursive: true });

for (const [src, file] of ICONS) {
  const info = await sharp(join(root, src))
    .resize(SIZE, SIZE, { fit: "cover" })
    .webp({ quality: 88, effort: 6 })
    .toFile(join(out, file));
  console.log(`✓ ${file} — ${info.size} B`);
}
