/**
 * Глобальный сбор точек активного похода («Путь назад»).
 *
 * Основной источник точек — непрерывный watchPosition, пока приложение
 * активно (в фоне WebView геолокация не работает, поэтому watch честно
 * останавливается — разрывы дорисовываются пунктиром на карте).
 * Дополнительно остаётся редкий одиночный замер: страховочный тик таймера
 * и мгновенный capture при возврате из фона / открытии страницы трека.
 *
 * Единственная точка записи — appendPoint (фильтр минимального сдвига
 * внутри). Каждый удачный замер рассылается window-событием, чтобы
 * открытая страница трека сразу обновила карту.
 */

import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import { isNativeApp } from "@/lib/native/capacitor";
import { loadTrack, appendPoint, type ActiveTrack } from "@/lib/trackState";

/** Интервал страховочного одиночного замера при активном походе. */
export const TRACK_CAPTURE_INTERVAL_MS = 90_000;

/** Замеры с погрешностью хуже этой отбрасываем (метры). */
export const MAX_ACCURACY_M = 50;

/** Событие window после каждого удачного замера позиции. */
export const TRACK_CAPTURE_EVENT = "sf:track-capture";

export interface TrackCaptureDetail {
  track: ActiveTrack;
  position: Coords;
}

function recordPosition(position: Coords): void {
  const track = loadTrack();
  if (!track) return;
  const next = appendPoint(track, position);
  window.dispatchEvent(
    new CustomEvent<TrackCaptureDetail>(TRACK_CAPTURE_EVENT, {
      detail: { track: next, position },
    }),
  );
}

let capturing = false;

/**
 * Один одиночный замер: обновляет трек в localStorage и оповещает
 * подписчиков. Без активного похода — no-op.
 */
export async function captureTrackPoint(): Promise<void> {
  if (capturing) return;
  if (!loadTrack()) return;
  capturing = true;
  try {
    const position = await getCurrentPosition();
    // Перечитываем после await: поход могли завершить, пока ждали GPS.
    if (!loadTrack()) return;
    recordPosition(position);
  } catch {
    /* нет GPS в этот момент — просто пропускаем тик */
  } finally {
    capturing = false;
  }
}

/* ------------------------------------------------------------------ */
/* Непрерывный watchPosition (только пока приложение активно)          */
/* ------------------------------------------------------------------ */

let stopWatch: (() => void) | null = null;
let watchStarting = false;
let watchWanted = false;

function onWatchPosition(lat: number, lng: number, accuracy: number | null | undefined) {
  if (!loadTrack()) {
    // Поход завершили, а watch ещё жив — глушим.
    stopTrackWatch();
    return;
  }
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return;
  recordPosition({ lat, lng });
}

async function startTrackWatch(): Promise<void> {
  if (stopWatch || watchStarting) return;
  watchStarting = true;
  try {
    if (isNativeApp()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (pos) => {
            if (pos) onWatchPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          },
        );
        stopWatch = () => void Geolocation.clearWatch({ id });
        return;
      } catch {
        /* плагин недоступен — падаем в браузерный API ниже */
      }
    }
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => onWatchPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        () => {
          /* временная ошибка GPS — watch продолжит сам */
        },
        { enableHighAccuracy: true, maximumAge: 5_000 },
      );
      stopWatch = () => navigator.geolocation.clearWatch(id);
    }
  } finally {
    watchStarting = false;
    // Пока ждали старт, поход могли завершить или приложение ушло в фон.
    if (stopWatch && !watchWanted) stopTrackWatch();
  }
}

export function stopTrackWatch(): void {
  watchWanted = false;
  stopWatch?.();
  stopWatch = null;
}

/**
 * Приводит watchPosition к нужному состоянию: включён только когда есть
 * активный поход И приложение на переднем плане (экономия батареи; в фоне
 * WebView всё равно не получает координаты).
 */
export function syncTrackWatch(appActive: boolean): void {
  watchWanted = appActive && !!loadTrack();
  if (watchWanted) void startTrackWatch();
  else stopTrackWatch();
}
