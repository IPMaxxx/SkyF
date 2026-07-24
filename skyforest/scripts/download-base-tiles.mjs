/**
 * Скачивает обзорные тайлы (z0–5) уличной карты Thunderforest в
 * mobile/shell/basemap, чтобы в приложении ВСЕГДА была базовая карта —
 * даже офлайн и без единого скачанного региона. Leaflet растягивает эти
 * низкие зумы на все уровни (базовый слой в TrackMap/offline-track).
 *
 * Запуск: node scripts/download-base-tiles.mjs
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../mobile/shell/basemap");
const APIKEY = process.env.THUNDERFOREST_APIKEY || "1faca5b7ed0d462b8630f4c3ec1acbcb";
const MAX_Z = Number(process.env.BASE_MAX_ZOOM || 5);
const SUBS = ["a", "b", "c"];

function url(z, x, y) {
  const s = SUBS[(x + y) % SUBS.length];
  return `https://${s}.tile.thunderforest.com/outdoors/${z}/${x}/${y}.png?apikey=${APIKEY}`;
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const jobs = [];
  for (let z = 0; z <= MAX_Z; z++) {
    const n = 2 ** z;
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) jobs.push({ z, x, y });
  }
  console.log(`Base tiles z0-${MAX_Z}: ${jobs.length} tiles → ${OUT_DIR}`);

  let done = 0;
  let failed = 0;
  let bytes = 0;
  let idx = 0;
  const CONCURRENCY = 10;

  async function worker() {
    while (idx < jobs.length) {
      const { z, x, y } = jobs[idx++];
      const out = resolve(OUT_DIR, `${z}/${x}/${y}.png`);
      try {
        if (!(await exists(out))) {
          const resp = await fetch(url(z, x, y));
          if (!resp.ok) throw new Error(`http ${resp.status}`);
          const buf = Buffer.from(await resp.arrayBuffer());
          await mkdir(dirname(out), { recursive: true });
          await writeFile(out, buf);
          bytes += buf.length;
        }
      } catch (e) {
        failed++;
        console.warn(`skip ${z}/${x}/${y}: ${e.message}`);
      }
      done++;
      if (done % 100 === 0 || done === jobs.length) {
        console.log(`  ${done}/${jobs.length} (${(bytes / 1024 / 1024).toFixed(1)} MB, ${failed} failed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done: ${done - failed} tiles, ${(bytes / 1024 / 1024).toFixed(1)} MB, ${failed} failed`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
