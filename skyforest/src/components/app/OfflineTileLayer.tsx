/**
 * Офлайн-осведомлённый тайловый слой Leaflet для карты Track.
 *
 * Для каждого тайла сначала пытается взять локальную копию (скачанную через
 * OfflineMapManager → tileStore), при её отсутствии и наличии сети — грузит из
 * сети, а без сети показывает пустой тайл. Так карта продолжает работать в лесу
 * без интернета по заранее скачанному региону.
 */

import L from "leaflet";
import {
  createTileLayerComponent,
  createElementObject,
  updateGridLayer,
  withPane,
  type LayerProps,
} from "@react-leaflet/core";
import { resolveTileUrl, type TileSource } from "@/lib/offline/tileStore";

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
    const online = typeof navigator === "undefined" ? true : navigator.onLine;

    void resolveTileUrl(source, { z: coords.z, x: coords.x, y: coords.y }, online)
      .then((url) => {
        const finalUrl = url ?? BLANK_TILE;
        const isBlob = finalUrl.startsWith("blob:");
        tile.onload = () => {
          if (isBlob) URL.revokeObjectURL(finalUrl);
          done(undefined, tile);
        };
        tile.onerror = () => {
          if (isBlob) URL.revokeObjectURL(finalUrl);
          // Локальный тайл битый — пробуем сеть, иначе оставляем пустым.
          if (finalUrl !== BLANK_TILE && online) tile.src = buildFallback(source, coords);
          done(undefined, tile);
        };
        tile.src = finalUrl;
      })
      .catch(() => {
        tile.src = BLANK_TILE;
        done(undefined, tile);
      });

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
