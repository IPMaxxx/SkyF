/**
 * Глобальный сбор точек активного похода («Путь назад»).
 *
 * Источников точек два, и они складываются, а не заменяют друг друга (почему
 * именно так — в track/watchController). Обычный watch работает, пока идёт
 * поход и приложение открыто; в фоне WebView координат не получает, поэтому там
 * он снимается. Фоновая служба (см. track/backgroundWatch) добавляется, если
 * оболочка её умеет, и пишет с погашенным экраном; если не умеет — остаётся
 * прежнее поведение, а разрывы дорисовываются пунктиром на карте.
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
  startBackgroundWatch,
  type BackgroundIssue,
  type BackgroundNotice,
} from "@/lib/track/backgroundWatch";
import { createWatchController } from "@/lib/track/watchController";

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
/* Непрерывный watch: обычный на переднем плане плюс фоновый, если есть  */
/* ------------------------------------------------------------------ */

let notice: BackgroundNotice | null = null;
let backgroundIssue: BackgroundIssue | null = null;
let backgroundDetail: string | null = null;
let backgroundStarting = false;
let foreground = true;

/** Что сейчас пишет точки и что мешает фону. */
export interface TrackWatchStatus {
  hasTrack: boolean;
  /** Открыто ли приложение: с погашенным экраном о записи не судят. */
  appForeground: boolean;
  /** Идёт ли запись хоть каким-то источником. */
  recording: boolean;
  /** Обычный watch: только пока приложение открыто. */
  plain: boolean;
  /** Фоновая служба: пишет и с погашенным экраном. */
  background: boolean;
  /**
   * Прямо сейчас идёт попытка поднять фон. Отличает «ещё выясняем» от «выяснили
   * и не вышло»: без этого «настраиваем запись» висело бы и там, где попытки
   * вообще не было, — например пока приложение не сообщило текст уведомления.
   */
  backgroundStarting: boolean;
  /** Почему фона нет; null — вопросов нет либо он ещё не пробовал стартовать. */
  backgroundIssue: BackgroundIssue | null;
  /** Код и текст отказа ровно как их вернул плагин — для пересылки в саппорт. */
  backgroundDetail: string | null;
}

/** Событие window после каждой смены состояния источников записи. */
export const TRACK_WATCH_STATUS_EVENT = "sf:track-watch-status";

function onWatchPosition(lat: number, lng: number, accuracy: number | null | undefined) {
  if (!loadTrack()) {
    // Поход завершили, а watch ещё жив — глушим.
    stopTrackWatch();
    return;
  }
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return;
  recordPosition({ lat, lng });
}

async function startPlainWatch(): Promise<(() => void) | null> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (pos) => {
          if (pos) onWatchPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
      );
      return () => void Geolocation.clearWatch({ id });
    } catch {
      /* плагин недоступен — падаем в браузерный API ниже */
    }
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  const id = navigator.geolocation.watchPosition(
    (pos) => onWatchPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
    () => {
      /* временная ошибка GPS — watch продолжит сам */
    },
    { enableHighAccuracy: true, maximumAge: 5_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

async function startBackgroundSlot(): Promise<(() => void) | null> {
  const current = notice;
  if (!current) return null;
  // Сбрасываем до попытки, а не после: об отказе служба сообщает уже во время
  // старта, и сброс «после» стирал бы только что полученную причину.
  backgroundIssue = null;
  backgroundDetail = null;
  backgroundStarting = true;
  emitStatus();
  try {
    return await launchBackground(current);
  } finally {
    backgroundStarting = false;
    emitStatus();
  }
}

async function launchBackground(notice: BackgroundNotice): Promise<(() => void) | null> {
  return startBackgroundWatch({
    notice,
    distanceFilter: BACKGROUND_DISTANCE_FILTER_M,
    onPosition: onWatchPosition,
    onIssue: (issue, detail) => {
      backgroundIssue = issue;
      backgroundDetail = detail;
      // Служба отвалилась уже после старта — контроллер должен об этом знать,
      // иначе он будет считать её работающей и не попробует поднять снова.
      if (issue !== "notificationsBlocked") controller.markStopped("background");
      emitStatus();
    },
  });
}

function emitStatus(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TrackWatchStatus>(TRACK_WATCH_STATUS_EVENT, {
      detail: trackWatchStatus(),
    }),
  );
}

const controller = createWatchController(
  { plain: startPlainWatch, background: startBackgroundSlot },
  emitStatus,
);

export function trackWatchStatus(): TrackWatchStatus {
  const plain = controller.running("plain");
  const background = controller.running("background");
  return {
    hasTrack: !!loadTrack(),
    appForeground: foreground,
    recording: plain || background,
    plain,
    background,
    backgroundStarting,
    backgroundIssue,
    backgroundDetail,
  };
}

function sync(patch?: { appForeground?: boolean; backgroundAllowed?: boolean }): void {
  if (patch?.appForeground != null) foreground = patch.appForeground;
  controller.update({ hasTrack: !!loadTrack(), ...patch });
}

/**
 * Текст постоянного уведомления Android, без которого фоновую запись включать
 * нельзя. Приложение задаёт его из своего словаря; пока текста нет, работает
 * только обычный watch и запись останавливается вместе с приложением.
 */
export function setBackgroundNotice(next: BackgroundNotice): void {
  notice = next;
  sync({ backgroundAllowed: true });
}

export function stopTrackWatch(): void {
  controller.stopAll();
}

export function syncTrackWatch(appActive: boolean): void {
  sync({ appForeground: appActive });
}

/** Только для проверок: дождаться, пока сверки источников закончатся. */
export function trackWatchSettled(): Promise<void> {
  return controller.settled();
}
