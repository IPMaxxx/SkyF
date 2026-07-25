/**
 * Офлайн-осведомлённый тайловый слой Leaflet для карты Track.
 *
 * Для каждого тайла сначала пытается взять локальную копию (скачанную через
 * OfflineMapManager → tileStore), при её отсутствии и наличии сети — грузит из
 * сети, а без сети показывает увеличенный фрагмент ближайшего родительского
 * тайла (чтобы карта не белела на пешеходных зумах) либо пустой тайл. Так карта
 * продолжает работать в лесу без интернета по заранее скачанному региону.
 */

import L from "leaflet";
import {
  createTileLayerComponent,
  createElementObject,
  updateGridLayer,
  withPane,
  type LayerProps,
} from "@react-leaflet/core";
import {
  resolveParentTile,
  resolveTileUrl,
  upscaleFromParent,
  type TileSource,
} from "@/lib/offline/tileStore";

/** Прозрачный 1×1 GIF — заглушка для тайла, которого нет офлайн. */
const BLANK_TILE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

interface OfflineTileLayerOptions extends L.TileLayerOptions {
  sfSource: TileSource;
}

class OfflineTileLayerClass extends L.TileLayer {
  declare options: OfflineTileLayerOptions;

  constructor(options: OfflineTileLayerOptions) {
    // URL-шаблон не используется — createTile резолвит источник сам.
    super("", options);
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement("img");
    tile.setAttribute("role", "presentation");
    tile.alt = "";

    const source = this.options.sfSource;
    const coord = { z: coords.z, x: coords.x, y: coords.y };
    const online = typeof navigator === "undefined" ? true : navigator.onLine;

    let finished = false;
    let triedParent = false;
    let triedNetwork = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done(undefined, tile);
    };
    const show = (src: string) => {
      const isBlob = src.startsWith("blob:");
      tile.onload = () => {
        if (isBlob) URL.revokeObjectURL(src);
        finish();
      };
      tile.onerror = () => {
        if (isBlob) URL.revokeObjectURL(src);
        if (src === BLANK_TILE) {
          finish();
        } else if (online && !triedNetwork && !src.startsWith("data:")) {
          // Локальный тайл битый — пробуем сеть напрямую.
          triedNetwork = true;
          show(buildFallback(source, coords));
        } else if (!triedParent) {
          tryParent();
        } else {
          finish();
        }
      };
      tile.src = src;
    };
    // Тайла нужного зума нет офлайн — показываем увеличенный фрагмент
    // ближайшего родительского тайла вместо белого поля.
    const tryParent = () => {
      triedParent = true;
      void resolveParentTile(source, coord)
        .then((hit) => (hit ? upscaleFromParent(coord, hit) : null))
        .then((dataUrl) => show(dataUrl ?? BLANK_TILE))
        .catch(() => show(BLANK_TILE));
    };

    void resolveTileUrl(source, coord, { online, autoCache: true })
      .then((url) => {
        if (url) show(url);
        else tryParent();
      })
      .catch(() => tryParent());

    return tile;
  }
}

function buildFallback(source: TileSource, coords: L.Coords): string {
  const s = source.subdomains[(coords.x + coords.y) % source.subdomains.length] || "a";
  return source.urlTemplate
    .replace("{s}", s)
    .replace("{z}", String(coords.z))
    .replace("{x}", String(coords.x))
    .replace("{y}", String(coords.y));
}

interface OfflineTileLayerProps extends LayerProps {
  source: TileSource;
  maxZoom?: number;
  maxNativeZoom?: number;
}

export const OfflineTileLayer = createTileLayerComponent<
  OfflineTileLayerClass,
  OfflineTileLayerProps
>(
  function createOfflineTileLayer({ source, ...options }, context) {
    const layer = new OfflineTileLayerClass(
      withPane({ ...options, sfSource: source }, context) as OfflineTileLayerOptions,
    );
    return createElementObject(layer, context);
  },
  function updateOfflineTileLayer(layer, props, prevProps) {
    updateGridLayer(layer, props, prevProps);
  },
);
