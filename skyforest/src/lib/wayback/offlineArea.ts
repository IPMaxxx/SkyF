/**
 * Предсохранение карты по виду на экране (WayBack).
 *
 * Здесь живёт вся математика второго входа в офлайн-карту: пользователь выбирает
 * место касанием и приближением, а мы считаем, что именно скачается — область по
 * рамке на экране, диапазон зумов и честный объём трафика.
 *
 * Про объём. Средние веса тайлов замерены на реальных тайлах и лежат в общем
 * lib/offline/tileWeights — там же их берёт экран офлайн-карт SkyForest, чтобы
 * два продукта не могли разойтись в оценке одной и той же загрузки.
 *
 * Про пропуск уже скачанного. Перекрытие с сохранёнными областями считается по
 * индексу регионов (чистая математика, без обращений к диску), поэтому оценка
 * показывает трафик, а не размер области. Оценка консервативна: тайлы, попавшие
 * в кеш сами при просмотре карты, в ней не учтены, и реальная загрузка может
 * оказаться только меньше обещанной, но не больше.
 */

import {
  OUTDOOR_SOURCE,
  SATELLITE_SOURCE,
  buildRemoteUrl,
  hasTile,
  lngLatToTile,
  putTile,
  saveRegion,
  tilesForBbox,
  type BBox,
  type DownloadedRegion,
  type TileCoord,
  type TileSource,
} from "@/lib/offline/tileStore";
import { avgTileBytes } from "@/lib/offline/tileWeights";

/** Обзорные зумы качаем всегда: без них офлайн-карта не даёт отдалиться. */
export const AREA_OVERVIEW_ZOOM = 9;
/** Глубже 16 в этом стиле карты новых деталей местности не появляется. */
export const AREA_MAX_ZOOM = 16;
/**
 * Насколько глубже текущего вида качаем детали: 4 уровня = четыре шага
 * приближения офлайн (16-кратное увеличение). При этом объём загрузки почти не
 * зависит от того, на каком зуме стоит человек, — меняется только охват.
 */
export const AREA_EXTRA_LEVELS = 4;

/**
 * Дальше этого объёма предупреждаем: такое на сотовой сети качают осознанно.
 * Порог низкий не случайно — из-за правила «четыре уровня вглубь» загрузка с
 * экрана телефона упирается примерно в 36 МБ, и предупреждать надо там, где
 * человек шагом зума увеличил область вчетверо, а не на недостижимом гигабайте.
 */
export const AREA_SOFT_LIMIT_BYTES = 25 * 1024 * 1024;
/**
 * А это уже не запускаем молча. С телефона такой объём не выбрать, но на
 * планшете и в браузере рамка бывает во весь экран — там предохранитель нужен.
 */
export const AREA_HARD_LIMIT_BYTES = 800 * 1024 * 1024;

/** Оба слоя области: карта похода умеет и тропы, и спутник. */
export const AREA_SOURCES: TileSource[] = [OUTDOOR_SOURCE, SATELLITE_SOURCE];

/** Выше этого числа тайлов перекрытие не считаем — иначе подвиснет интерфейс. */
const OVERLAP_TILE_BUDGET = 200_000;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface ZoomPlan {
  minZoom: number;
  maxZoom: number;
}

/**
 * Диапазон зумов для вида на экране: вниз до обзорных 9 (чтобы офлайн можно
 * было отдалиться) и вверх на четыре уровня от текущего, но не глубже 16.
 */
export function zoomPlanFor(viewZoom: number): ZoomPlan {
  const z = Math.round(viewZoom);
  const minZoom = Math.max(1, Math.min(AREA_OVERVIEW_ZOOM, z));
  const maxZoom = Math.max(minZoom, Math.min(AREA_MAX_ZOOM, z + AREA_EXTRA_LEVELS));
  return { minZoom, maxZoom };
}

/** Размер области по земле — то, что показываем как «12 × 9 km». */
export function bboxSpanKm(bbox: BBox): { widthKm: number; heightKm: number } {
  const midLat = (bbox.north + bbox.south) / 2;
  return {
    widthKm: (bbox.east - bbox.west) * 111.32 * Math.cos((midLat * Math.PI) / 180),
    heightKm: (bbox.north - bbox.south) * 110.57,
  };
}

interface TileRange {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function tileRange(bbox: BBox, z: number): TileRange {
  const tl = lngLatToTile(bbox.west, bbox.north, z);
  const br = lngLatToTile(bbox.east, bbox.south, z);
  return {
    x0: Math.min(tl.x, br.x),
    x1: Math.max(tl.x, br.x),
    y0: Math.min(tl.y, br.y),
    y1: Math.max(tl.y, br.y),
  };
}

function rangeSize(r: TileRange): number {
  return (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
}

export interface AreaEstimate {
  /** Всего тайлов в области по всем слоям и зумам. */
  total: number;
  /** Из них уже лежат в скачанных ранее областях. */
  cached: number;
  /** Столько предстоит скачать. */
  pending: number;
  /** Честный объём трафика: только то, чего ещё нет. */
  bytes: number;
  /** Объём всей области целиком — для списка сохранённых участков. */
  totalBytes: number;
}

/**
 * Оценка области до начала загрузки. `regions` — уже скачанные участки: тайлы,
 * попадающие в них, из трафика вычитаются.
 */
export function estimateArea(
  bbox: BBox,
  plan: ZoomPlan,
  regions: DownloadedRegion[] = [],
): AreaEstimate {
  let total = 0;
  let cached = 0;
  let bytes = 0;
  let totalBytes = 0;

  for (const source of AREA_SOURCES) {
    const avg = avgTileBytes(source.id);
    // Прерванные области покрытыми не считаем: в них скачаны не все тайлы, а
    // обещать «уже сохранено» там, где будет белое поле, нельзя.
    const saved = regions.filter(
      (r) => !r.partial && (r.sourceIds ?? [r.sourceId]).includes(source.id),
    );
    for (let z = plan.minZoom; z <= plan.maxZoom; z++) {
      const range = tileRange(bbox, z);
      const count = rangeSize(range);
      total += count;
      totalBytes += count * avg;

      const covering = saved
        .filter((r) => z >= r.minZoom && z <= r.maxZoom)
        .map((r) => tileRange(r.bbox, z));
      let known = 0;
      if (covering.length > 0 && count <= OVERLAP_TILE_BUDGET) {
        for (let x = range.x0; x <= range.x1; x++) {
          for (let y = range.y0; y <= range.y1; y++) {
            if (covering.some((c) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1)) {
              known++;
            }
          }
        }
      }
      cached += known;
      bytes += (count - known) * avg;
    }
  }

  return { total, cached, pending: total - cached, bytes, totalBytes };
}

export type AreaSizeVerdict = "ok" | "large" | "too-large";

export function areaVerdict(bytes: number): AreaSizeVerdict {
  if (bytes > AREA_HARD_LIMIT_BYTES) return "too-large";
  if (bytes > AREA_SOFT_LIMIT_BYTES) return "large";
  return "ok";
}

/* ------------------------------------------------------------------ */
/* Загрузка области                                                    */
/* ------------------------------------------------------------------ */

export interface AreaProgress {
  /** Обработано тайлов (скачано + найдено в хранилище). */
  done: number;
  total: number;
  /** Найдено в хранилище — трафика не потратили. */
  skipped: number;
  failed: number;
  /** Реально скачанные байты. */
  bytes: number;
}

interface AreaJob {
  source: TileSource;
  coord: TileCoord;
}

/** Одновременных запросов: больше провайдер начинает отвечать 429. */
const CONCURRENCY = 6;

/**
 * Качает область карты по bbox и диапазону зумов.
 *
 * Отличий от общей `downloadRegion` два, и оба нужны именно этому сценарию:
 * уже лежащие в хранилище тайлы пропускаются (повторный проход по знакомым
 * местам не стоит трафика), а при отмене запись об области всё равно сохраняется
 * с фактическими числами — иначе скачанные тайлы остались бы в хранилище
 * невидимыми, и удалить их было бы нечем.
 */
export async function downloadArea(
  opts: {
    name: string;
    /** Имя для записи, если загрузку прервали. */
    partialName?: string;
    bbox: BBox;
    minZoom: number;
    maxZoom: number;
    center?: { lat: number; lng: number };
    radiusKm?: number;
  },
  onProgress?: (p: AreaProgress) => void,
  signal?: AbortSignal,
): Promise<{
  region: DownloadedRegion | null;
  progress: AreaProgress;
  aborted: boolean;
}> {
  const coords = tilesForBbox(opts.bbox, opts.minZoom, opts.maxZoom);
  const jobs: AreaJob[] = [];
  for (const source of AREA_SOURCES) {
    for (const coord of coords) jobs.push({ source, coord });
  }

  let done = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;
  const report = () => onProgress?.({ done, total: jobs.length, skipped, failed, bytes });

  const fetchOne = async (job: AreaJob) => {
    if (await hasTile(job.source.id, job.coord)) {
      skipped++;
      return;
    }
    const resp = await fetch(buildRemoteUrl(job.source, job.coord), { signal });
    if (!resp.ok) throw new Error(`http ${resp.status}`);
    const blob = await resp.blob();
    bytes += blob.size;
    await putTile(job.source.id, job.coord, blob);
  };

  const runPass = async (queue: AreaJob[], lastPass: boolean) => {
    const retry: AreaJob[] = [];
    let idx = 0;
    const worker = async () => {
      while (idx < queue.length) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        const job = queue[idx++];
        try {
          await fetchOne(job);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          if (lastPass) {
            failed++;
          } else {
            // Прогресс за неудачный тайл засчитаем в ретрай-проходе.
            retry.push(job);
            continue;
          }
        }
        done++;
        report();
      }
    };
    // Ждём все воркеры, а не первую ошибку: иначе после отмены уцелевшие
    // продолжают отчитываться о прогрессе, когда экран уже его сбросил.
    const results = await Promise.allSettled(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) || 1 }, worker),
    );
    const failure = results.find((r) => r.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return retry;
  };

  let aborted = false;
  try {
    const retry = await runPass(jobs, false);
    if (retry.length > 0) {
      // Пауза перед повтором: провайдер отдаёт 429 при массовой загрузке.
      await new Promise((r) => setTimeout(r, 1500));
      await runPass(retry, true);
    }
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
    aborted = true;
  }

  const progress: AreaProgress = { done, total: jobs.length, skipped, failed, bytes };
  // Отменили, ничего не скачав, — записывать нечего: в хранилище ничего нового.
  if (aborted && bytes === 0) return { region: null, progress, aborted };

  const region: DownloadedRegion = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: aborted ? (opts.partialName ?? opts.name) : opts.name,
    sourceId: AREA_SOURCES[0].id,
    sourceIds: AREA_SOURCES.map((s) => s.id),
    bbox: opts.bbox,
    minZoom: opts.minZoom,
    maxZoom: opts.maxZoom,
    tileCount: done,
    // Байты только за эту загрузку: пропущенные тайлы уже посчитаны в той
    // области, которая их скачала, и второй раз занимать место не должны.
    sizeBytes: bytes,
    createdAt: Date.now(),
    center: opts.center,
    radiusKm: opts.radiusKm,
    partial: aborted || undefined,
  };
  await saveRegion(region);
  return { region, progress, aborted };
}
