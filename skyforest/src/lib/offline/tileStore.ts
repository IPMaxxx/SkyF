/**
 * Офлайн-тайлы карты для функции Track (wayback).
 *
 * Позволяет скачать регион карты (диапазон тайлов по bbox и уровням зума) и
 * хранить его на устройстве, чтобы карта работала без интернета:
 *  - в нативной оболочке (Capacitor) — файлы в Filesystem (Directory.Data),
 *    доступ к ним из WebView через Capacitor.convertFileSrc(...);
 *  - в браузере/PWA — Cache Storage (blob-тайлы, отдаются через object URL).
 *
 * Индекс скачанных регионов лежит в Preferences (native) / localStorage (web).
 *
 * Лицензии: публичные серверы OSM/OpenTopoMap ОГРАНИЧИВАЮТ массовую загрузку.
 * Для продакшена задайте провайдера, разрешающего офлайн-кеш (Thunderforest
 * Outdoors, MapTiler Outdoor), через NEXT_PUBLIC_OUTDOOR_TILE_URL.
 */

import { isNativeApp } from "@/lib/native/capacitor";

export interface TileSource {
  id: string;
  /** Шаблон с {s} {z} {x} {y}. */
  urlTemplate: string;
  subdomains: string[];
  minZoom: number;
  maxZoom: number;
  attribution: string;
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface DownloadedRegion {
  id: string;
  name: string;
  sourceId: string;
  bbox: BBox;
  minZoom: number;
  maxZoom: number;
  /** Число реально сохранённых тайлов. */
  tileCount: number;
  /** Приблизительный объём в байтах. */
  sizeBytes: number;
  createdAt: number;
}

export interface DownloadProgress {
  done: number;
  total: number;
  failed: number;
  bytes: number;
}

/**
 * Основной «уличный» слой с тропами в стиле Gaia — по умолчанию OpenTopoMap.
 * В проде замените на провайдера с разрешённым офлайн-кешем через env.
 */
export const OUTDOOR_SOURCE: TileSource = {
  id: "outdoor",
  urlTemplate:
    process.env.NEXT_PUBLIC_OUTDOOR_TILE_URL ||
    "https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=1faca5b7ed0d462b8630f4c3ec1acbcb",
  subdomains: (process.env.NEXT_PUBLIC_OUTDOOR_TILE_SUBDOMAINS || "a,b,c").split(","),
  minZoom: 1,
  maxZoom: 22,
  attribution: "© Thunderforest, © OpenStreetMap",
};

const TILE_DIR = "sf-tiles";
const REGIONS_KEY = "sf_tile_regions";
const CACHE_NAME = "sf-tiles-v1";

/* ------------------------------------------------------------------ */
/* Тайловая математика                                                 */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Долгота/широта → номер тайла (x, y) на уровне z (Web Mercator). */
export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) };
}

/** Полный список тайлов, покрывающих bbox на уровнях [minZoom; maxZoom]. */
export function tilesForBbox(bbox: BBox, minZoom: number, maxZoom: number): TileCoord[] {
  const out: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const tl = lngLatToTile(bbox.west, bbox.north, z);
    const br = lngLatToTile(bbox.east, bbox.south, z);
    const x0 = Math.min(tl.x, br.x);
    const x1 = Math.max(tl.x, br.x);
    const y0 = Math.min(tl.y, br.y);
    const y1 = Math.max(tl.y, br.y);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) out.push({ z, x, y });
    }
  }
  return out;
}

/** Быстрый подсчёт числа тайлов без построения массива. */
export function countTilesForBbox(bbox: BBox, minZoom: number, maxZoom: number): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const tl = lngLatToTile(bbox.west, bbox.north, z);
    const br = lngLatToTile(bbox.east, bbox.south, z);
    const w = Math.abs(br.x - tl.x) + 1;
    const h = Math.abs(br.y - tl.y) + 1;
    total += w * h;
  }
  return total;
}

/** bbox квадрата со стороной ~2*radiusKm вокруг точки. */
export function bboxAround(lat: number, lng: number, radiusKm: number): BBox {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    west: lng - dLng,
    east: lng + dLng,
    south: lat - dLat,
    north: lat + dLat,
  };
}

/** Итоговый сетевой URL тайла с подстановкой поддомена. */
export function buildRemoteUrl(source: TileSource, coord: TileCoord): string {
  const s = source.subdomains[(coord.x + coord.y) % source.subdomains.length] || "a";
  return source.urlTemplate
    .replace("{s}", s)
    .replace("{z}", String(coord.z))
    .replace("{x}", String(coord.x))
    .replace("{y}", String(coord.y));
}

function tileKey(coord: TileCoord): string {
  return `${coord.z}/${coord.x}/${coord.y}`;
}

function tilePath(sourceId: string, coord: TileCoord): string {
  return `${TILE_DIR}/${sourceId}/${coord.z}/${coord.x}/${coord.y}.png`;
}

function webCacheUrl(sourceId: string, coord: TileCoord): string {
  const origin = typeof location !== "undefined" ? location.origin : "";
  return `${origin}/__sf_tile__/${sourceId}/${coord.z}/${coord.x}/${coord.y}.png`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function convertFileSrc(uri: string): string {
  const cap = (window as unknown as { Capacitor?: { convertFileSrc?: (u: string) => string } })
    .Capacitor;
  return cap?.convertFileSrc?.(uri) ?? uri;
}

/* ------------------------------------------------------------------ */
/* Хранилище тайлов                                                    */
/* ------------------------------------------------------------------ */

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function writeTileNative(sourceId: string, coord: TileCoord, base64: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  await Filesystem.writeFile({
    path: tilePath(sourceId, coord),
    directory: Directory.Data,
    data: base64,
    recursive: true,
  });
}

async function writeTileWeb(sourceId: string, coord: TileCoord, blob: Blob) {
  if (typeof caches === "undefined") return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    webCacheUrl(sourceId, coord),
    new Response(blob, { headers: { "Content-Type": "image/png" } }),
  );
}

async function deleteTile(sourceId: string, coord: TileCoord) {
  try {
    if (isNativeApp()) {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      await Filesystem.deleteFile({ path: tilePath(sourceId, coord), directory: Directory.Data });
    } else if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(webCacheUrl(sourceId, coord));
    }
  } catch {
    /* уже удалён/не существует — игнорируем */
  }
}

/**
 * URL тайла для отрисовки на карте:
 *  - если тайл скачан — локальный URL (файл/blob);
 *  - иначе, если есть сеть — сетевой URL провайдера;
 *  - иначе null (Leaflet покажет пустой тайл).
 *
 * Для web возвращается blob: URL — вызывающий обязан его revoke после load.
 */
export async function resolveTileUrl(
  source: TileSource,
  coord: TileCoord,
  online: boolean,
): Promise<string | null> {
  if (isNativeApp()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const path = tilePath(source.id, coord);
      await Filesystem.stat({ path, directory: Directory.Data });
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
      return convertFileSrc(uri);
    } catch {
      /* не скачан — ниже сеть */
    }
    return online ? buildRemoteUrl(source, coord) : null;
  }

  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(webCacheUrl(source.id, coord));
      if (hit) return URL.createObjectURL(await hit.blob());
    } catch {
      /* нет доступа к Cache Storage */
    }
  }
  return online ? buildRemoteUrl(source, coord) : null;
}

/* ------------------------------------------------------------------ */
/* Индекс регионов                                                     */
/* ------------------------------------------------------------------ */

export async function listRegions(): Promise<DownloadedRegion[]> {
  try {
    if (isNativeApp()) {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key: REGIONS_KEY });
      return value ? (JSON.parse(value) as DownloadedRegion[]) : [];
    }
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(REGIONS_KEY) : null;
    return raw ? (JSON.parse(raw) as DownloadedRegion[]) : [];
  } catch {
    return [];
  }
}

async function writeRegions(regions: DownloadedRegion[]) {
  const json = JSON.stringify(regions);
  try {
    if (isNativeApp()) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key: REGIONS_KEY, value: json });
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(REGIONS_KEY, json);
    }
  } catch {
    /* квота — игнорируем */
  }
}

/** Суммарный (приблизительный) объём и число тайлов по всем регионам. */
export async function storageSummary(): Promise<{ bytes: number; tiles: number; regions: number }> {
  const regions = await listRegions();
  return {
    bytes: regions.reduce((s, r) => s + r.sizeBytes, 0),
    tiles: regions.reduce((s, r) => s + r.tileCount, 0),
    regions: regions.length,
  };
}

/* ------------------------------------------------------------------ */
/* Загрузка и удаление регионов                                        */
/* ------------------------------------------------------------------ */

/**
 * Скачивает регион карты и сохраняет его на устройстве. Не бросает на
 * отдельных сетевых ошибках тайлов — считает их в failed. Поддерживает отмену
 * через AbortSignal.
 */
export async function downloadRegion(
  opts: {
    name: string;
    source: TileSource;
    bbox: BBox;
    minZoom: number;
    maxZoom: number;
  },
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<DownloadedRegion> {
  const tiles = tilesForBbox(opts.bbox, opts.minZoom, opts.maxZoom);
  const native = isNativeApp();
  let done = 0;
  let failed = 0;
  let bytes = 0;
  let idx = 0;

  const worker = async () => {
    while (idx < tiles.length) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      const coord = tiles[idx++];
      try {
        const resp = await fetch(buildRemoteUrl(opts.source, coord));
        if (!resp.ok) throw new Error(`http ${resp.status}`);
        const blob = await resp.blob();
        bytes += blob.size;
        if (native) await writeTileNative(opts.source.id, coord, await blobToBase64(blob));
        else await writeTileWeb(opts.source.id, coord, blob);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        failed++;
      }
      done++;
      onProgress?.({ done, total: tiles.length, failed, bytes });
    }
  };

  const concurrency = Math.min(6, tiles.length) || 1;
  await Promise.all(Array.from({ length: concurrency }, worker));

  const region: DownloadedRegion = {
    id: randomId(),
    name: opts.name,
    sourceId: opts.source.id,
    bbox: opts.bbox,
    minZoom: opts.minZoom,
    maxZoom: opts.maxZoom,
    tileCount: tiles.length - failed,
    sizeBytes: bytes,
    createdAt: Date.now(),
  };
  const regions = await listRegions();
  await writeRegions([region, ...regions]);
  return region;
}

/** Удаляет регион и его тайлы, не затрагивая тайлы, общие с другими регионами. */
export async function deleteRegion(id: string): Promise<void> {
  const regions = await listRegions();
  const target = regions.find((r) => r.id === id);
  const remaining = regions.filter((r) => r.id !== id);

  if (target) {
    const keep = new Set<string>();
    for (const r of remaining) {
      if (r.sourceId !== target.sourceId) continue;
      for (const c of tilesForBbox(r.bbox, r.minZoom, r.maxZoom)) keep.add(tileKey(c));
    }
    for (const coord of tilesForBbox(target.bbox, target.minZoom, target.maxZoom)) {
      if (keep.has(tileKey(coord))) continue;
      await deleteTile(target.sourceId, coord);
    }
  }
  await writeRegions(remaining);
}
