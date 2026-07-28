#!/usr/bin/env node
/**
 * Собирает www этой оболочки из двух источников:
 *
 *  - `apps/wayback/shell/` — СВОИ страницы офлайн-ядра (вёрстка и логика).
 *    WayBack владеет ими целиком, поэтому дизайн можно крутить, не задевая
 *    офлайн-экран основного SkyForest (тот берёт `mobile/shell` напрямую,
 *    см. корневой capacitor.config.ts).
 *  - `mobile/shell/basemap` и `mobile/shell/vendor` — нейтральные ресурсы
 *    (мировые тайлы z0–5 ~9 МБ и Leaflet). Дизайна в них нет, дублировать
 *    в гите незачем — копируем из общего места.
 *
 * Ссылки skyforest.ai переписываются на wayback.skyforest.ai: кнопка
 * «Открыть приложение» и стартовые ссылки должны вести на поддомен WayBack,
 * где middleware оставляет только track.
 *
 * Запускается перед `cap sync` (см. npm run sync).
 */
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const own = join(here, "shell");
const shared = join(here, "../../mobile/shell");
const dst = join(here, "www");

rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });

// Свои страницы — основа www.
cpSync(own, dst, { recursive: true });

// Общие ресурсы без дизайна.
for (const dir of ["basemap", "vendor"]) {
  cpSync(join(shared, dir), join(dst, dir), { recursive: true });
}

for (const file of ["offline-track.js", "index.html", "offline-track.html"]) {
  const path = join(dst, file);
  try {
    const text = readFileSync(path, "utf8");
    writeFileSync(
      path,
      text.replaceAll("https://skyforest.ai", "https://wayback.skyforest.ai"),
    );
  } catch {
    /* файла может не быть — не критично */
  }
}

console.log(
  "shell synced -> www (свои страницы из shell/, тайлы и vendor из mobile/shell, домены → wayback.skyforest.ai)",
);
