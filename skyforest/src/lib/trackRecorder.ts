/**
 * Глобальный сбор точек активного похода («Путь назад»).
 *
 * Единственная точка записи: guard от параллельных вызовов общий для всего
 * приложения (глобальный тикер в layout + мгновенный capture на странице
 * трека не конфликтуют). Результат каждого удачного замера рассылается
 * window-событием, чтобы открытая страница трека сразу обновила карту.
 */

import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import { loadTrack, appendPoint, type ActiveTrack } from "@/lib/trackState";

/** Интервал грубой записи точек пути при активном походе. */
export const TRACK_CAPTURE_INTERVAL_MS = 90_000;

/** Событие window после каждого удачного замера позиции. */
export const TRACK_CAPTURE_EVENT = "sf:track-capture";

export interface TrackCaptureDetail {
  track: ActiveTrack;
  position: Coords;
}

let capturing = false;

/**
 * Один грубый замер: обновляет трек в localStorage (фильтр сдвига >30 м —
 * внутри appendPoint) и оповещает подписчиков. Без активного похода — no-op.
 */
export async function captureTrackPoint(): Promise<void> {
  if (capturing) return;
  if (!loadTrack()) return;
  capturing = true;
  try {
    const position = await getCurrentPosition();
    // Перечитываем после await: поход могли завершить, пока ждали GPS.
    const track = loadTrack();
    if (!track) return;
    const next = appendPoint(track, position);
    window.dispatchEvent(
      new CustomEvent<TrackCaptureDetail>(TRACK_CAPTURE_EVENT, {
        detail: { track: next, position },
      }),
    );
  } catch {
    /* нет GPS в этот момент — просто пропускаем тик */
  } finally {
    capturing = false;
  }
}
