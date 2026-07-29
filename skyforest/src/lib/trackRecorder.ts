/**
 * Глобальный сбор точек активного похода («Путь назад»).
 *
 * Источник точек — непрерывный watch, и он бывает двух видов. Если оболочка
 * умеет фоновую запись (см. track/backgroundWatch), watch не выключается на
 * свёрнутом приложении и погасшем экране: на Android его держит служба
 * переднего плана, на iOS — фоновый режим геолокации. Если не умеет — остаётся
 * прежнее поведение: watch честно глохнет при уходе в фон, а разрывы
 * дорисовываются пунктиром на карте.
 *
 * Оба вида должны сосуществовать: веб приезжает в оболочку с сайта, поэтому
 * этот же код работает и в приложениях, собранных без нативной части.
 *
 * Дополнительно остаётся редкий одиночный замер: страховочный тик таймера
 * и мгновенный capture при возврате из фона / открытии страницы трека.
 *
 * Единственная точка записи — appendPoint (фильтр минимального сдвига
 * внутри). Каждый удачный замер рассылается window-событием, чтобы
 * открытая страница трека сразу обновила карту.
 */

import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import { isNativeApp } from "@/lib/native/capacitor";
import { rememberPosition } from "@/lib/lastKnownPosition";
import { loadTrack, appendPoint, type ActiveTrack } from "@/lib/trackState";
import {
  backgroundWatchAvailable,
  startBackgroundWatch,
  stopBackgroundWatch,
  type BackgroundNotice,
} from "@/lib/track/backgroundWatch";

/** Интервал страховочного одиночного замера при активном походе. */
export const TRACK_CAPTURE_INTERVAL_MS = 90_000;

/** Замеры с погрешностью хуже этой отбрасываем (метры). */
export const MAX_ACCURACY_M = 50;

/**
 * Сдвиг, после которого фоновый плагин отдаёт координату. Стоит между двумя
 * порогами: выше MIN_COURSE_DISTANCE_M (12 м), иначе перестанет считаться курс
 * движения и стрелка замрёт, и ниже MIN_POINT_DISTANCE_M (20 м), иначе точки
 * пути начнёт отбрасывать уже appendPoint.
 */
const BACKGROUND_DISTANCE_FILTER_M = 10;

/** Событие window после каждого удачного замера позиции. */
export const TRACK_CAPTURE_EVENT = "sf:track-capture";

export interface TrackCaptureDetail {
  track: ActiveTrack;
  position: Coords;
}

function recordPosition(position: Coords): void {
  rememberPosition(position);
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
/* Непрерывный watch: фоновый, если оболочка умеет, иначе обычный       */
/* ------------------------------------------------------------------ */

let stopWatch: (() => void) | null = null;
let watchWanted = false;
let watchIsBackground = false;
let appForeground = true;
let notice: BackgroundNotice | null = null;

/**
 * Текст постоянного уведомления Android, без которого фоновую запись включать
 * нельзя. Приложение задаёт его из своего словаря; пока текста нет, фоновый
 * режим не запускается и watch ведёт себя по-старому.
 */
export function setBackgroundNotice(next: BackgroundNotice): void {
  notice = next;
  scheduleReconcile();
}

function onWatchPosition(lat: number, lng: number, accuracy: number | null | undefined) {
  if (!loadTrack()) {
    // Поход завершили, а watch ещё жив — глушим.
    stopTrackWatch();
    return;
  }
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return;
  recordPosition({ lat, lng });
}

function teardownWatch(): void {
  stopWatch?.();
  stopWatch = null;
  watchIsBackground = false;
}

async function startForegroundWatch(): Promise<void> {
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
}

async function startBackground(): Promise<boolean> {
  if (!notice) return false;
  const ok = await startBackgroundWatch({
    notice,
    distanceFilter: BACKGROUND_DISTANCE_FILTER_M,
    onPosition: onWatchPosition,
  });
  if (!ok) return false;
  stopWatch = () => void stopBackgroundWatch();
  watchIsBackground = true;
  return true;
}

/**
 * Приводит watch к нужному состоянию. Фоновая запись нужна, пока идёт поход, —
 * независимо от того, на экране приложение или нет. Обычный watch включается
 * только на переднем плане: в фоне WebView координат не получает, и держать его
 * там незачем.
 */
async function reconcileWatch(): Promise<void> {
  const hasTrack = !!loadTrack();
  const background = hasTrack && notice != null && (await backgroundWatchAvailable());
  watchWanted = hasTrack && (appForeground || background);

  if (!watchWanted) {
    teardownWatch();
    return;
  }
  // Источник уже поднят и он же нужен — не трогаем: перезапуск фоновой службы
  // роняет постоянное уведомление и на секунду теряет координаты.
  if (stopWatch && watchIsBackground === background) return;
  teardownWatch();

  if (background && (await startBackground())) {
    if (!watchWanted) teardownWatch();
    return;
  }
  // Фоновый слой не поднялся (нет плагина, отказ в разрешении, выключена
  // геолокация). Обычный watch в фоне координат не даёт, поэтому там его и не
  // заводим; следующее событие попробует поднять фоновый снова.
  if (!appForeground) return;
  await startForegroundWatch();
  // Пока поднимали watch, поход могли завершить или приложение ушло в фон.
  if (stopWatch && !watchWanted) teardownWatch();
}

/**
 * Сверки выполняются по очереди: события старта похода, смены видимости и
 * появления текста уведомления приходят пачками, а внутри есть await — без
 * очереди два прохода успевают поднять по watch каждый.
 */
let reconciling: Promise<void> = Promise.resolve();

function scheduleReconcile(): void {
  reconciling = reconciling.then(reconcileWatch).catch(() => {
    /* сверку повторит следующее событие */
  });
}

export function stopTrackWatch(): void {
  watchWanted = false;
  teardownWatch();
}

export function syncTrackWatch(appActive: boolean): void {
  appForeground = appActive;
  scheduleReconcile();
}
