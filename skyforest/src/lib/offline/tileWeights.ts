/**
 * Средний вес тайла — общий для всех экранов предсохранения карты.
 *
 * Числа замерены на 45 реальных тайлах зумов 11–16, а не взяты по памяти:
 * тропы 25.9 КБ, спутник 16.6 КБ. Прежние 14 и 25 КБ занижали загрузку троп
 * почти вдвое, а карту качают в лесу на мобильном интернете — обманутое
 * ожидание тут дороже лишней цифры на экране.
 *
 * Файл общий намеренно. Экран офлайн-карт есть и в SkyForest
 * (components/app/OfflineMapManager), и в WayBack (WayBackOfflineScreen,
 * lib/wayback/offlineArea), а импортировать дерево WayBack из SkyForest нельзя
 * (см. .cursor/rules/flavors.mdc). Пока веса лежали в дереве WayBack, копия в
 * SkyForest тихо разошлась с оригиналом — здесь она разойтись не может.
 *
 * Веса живут отдельно от tileStore осознанно: tileStore — рабочий код
 * хранилища, которым пользуются оба продукта, и трогать его ради двух
 * констант не нужно.
 */

import { OUTDOOR_SOURCE, SATELLITE_SOURCE } from "@/lib/offline/tileStore";

/** Средний вес тайла троп (Thunderforest Outdoors, PNG). */
export const AVG_OUTDOOR_TILE_BYTES = Math.round(25.9 * 1024);
/** Средний вес спутникового тайла (Esri World Imagery, JPEG). */
export const AVG_SATELLITE_TILE_BYTES = Math.round(16.6 * 1024);

const AVG_BYTES_BY_SOURCE: Record<string, number> = {
  [OUTDOOR_SOURCE.id]: AVG_OUTDOOR_TILE_BYTES,
  [SATELLITE_SOURCE.id]: AVG_SATELLITE_TILE_BYTES,
};

/** Средний вес тайла источника; для незнакомого берём более тяжёлые тропы. */
export function avgTileBytes(sourceId: string): number {
  return AVG_BYTES_BY_SOURCE[sourceId] ?? AVG_OUTDOOR_TILE_BYTES;
}
