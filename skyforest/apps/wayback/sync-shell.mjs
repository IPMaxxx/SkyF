#!/usr/bin/env node
/**
 * Копирует общее офлайн-ядро mobile/shell в www этой оболочки, подменяя
 * ссылки skyforest.ai на wayback.skyforest.ai (кнопка «Открыть приложение»
 * и стартовые ссылки должны вести на поддомен WayBack, где middleware
 * оставляет только track). Запускается перед `cap sync` (см. npm run sync).
 */
import { cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../mobile/shell");
const dst = join(here, "www");

rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });

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
console.log("shell synced -> www (домены переписаны на wayback.skyforest.ai)");
