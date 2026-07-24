/**
 * «Вернуться к точке входа»: состояние активного похода.
 *
 * Активный трек живёт в localStorage устройства. Якорь ставится одним
 * getCurrentPosition() при старте; точки пути пишет watchPosition, пока
 * приложение активно (см. trackRecorder). Завершённые походы сохраняются
 * в историю (см. trackHistory).
 *
 * В нативной оболочке активный трек дополнительно зеркалируется в Capacitor
 * Preferences — так автономный офлайн-экран (mobile/shell/offline-track), у
 * которого другой origin и нет доступа к localStorage сайта, читает актуальный
 * путь и якорь при холодном старте без сети.
 *
 * Гео-математика вынесена в ./trackGeo и реэкспортируется отсюда для
 * обратной совместимости импортов.
 */

import { isNativeApp } from "./native/capacitor";

export {
  haversineM,
  bearingDeg,
  courseOverGround,
  smoothAngle,
  destinationPoint,
  compassDir,
  MIN_COURSE_DISTANCE_M,
  MAX_COURSE_AGE_MS,
  type CompassDir,
} from "./trackGeo";

import { haversineM } from "./trackGeo";

export interface TrackPoint {
  lat: number;
  lng: number;
  /** Unix ms */
  t: number;
}

export interface ActiveTrack {
  /** Точка входа в лес — цель возврата. */
  anchor: TrackPoint;
  startedAt: number;
  /** Грубые точки пути (без якоря). */
  points: TrackPoint[];
}

/** Ключ хранилища активного трека — один и тот же в localStorage и Preferences. */
export const ACTIVE_TRACK_KEY = "sf_active_track";
const STORAGE_KEY = ACTIVE_TRACK_KEY;

/** Минимальный сдвиг от последней точки, чтобы записать новую (шум GPS). */
export const MIN_POINT_DISTANCE_M = 20;

/**
 * Событие window при старте/завершении похода — глобальный recorder по нему
 * включает и выключает watchPosition, не опрашивая localStorage.
 */
export const TRACK_STATE_EVENT = "sf:track-state-change";

function notifyStateChange() {
  try {
    window.dispatchEvent(new Event(TRACK_STATE_EVENT));
  } catch {
    /* SSR/тесты */
  }
}

/**
 * Зеркалирует активный трек в нативное хранилище (Preferences), доступное
 * офлайн-экрану с другого origin. Fire-and-forget: не блокирует запись в
 * localStorage и никогда не бросает.
 */
function mirrorToNative(track: ActiveTrack | null) {
  if (!isNativeApp()) return;
  void (async () => {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      if (track) await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(track) });
      else await Preferences.remove({ key: STORAGE_KEY });
    } catch {
      /* плагин недоступен — офлайн-экран останется без свежих данных */
    }
  })();
}

function isValidTrack(parsed: unknown): parsed is ActiveTrack {
  const p = parsed as ActiveTrack | null;
  return (
    typeof p?.anchor?.lat === "number" &&
    typeof p?.anchor?.lng === "number" &&
    Array.isArray(p?.points)
  );
}

export function loadTrack(): ActiveTrack | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTrack;
    return isValidTrack(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Подхватывает поход, начатый в автономном офлайн-экране (другой origin, нет
 * доступа к localStorage сайта). Такой трек лежит только в Capacitor
 * Preferences. Если в localStorage сайта активного трека нет, но в Preferences
 * он есть — переносим его сюда, чтобы при появлении сети и заходе в приложение
 * поход и точка входа не потерялись, а продолжились штатно.
 *
 * Возвращает восстановленный трек либо null (нечего переносить). Никогда не
 * затирает уже существующий локальный трек.
 */
export async function hydrateTrackFromNative(): Promise<ActiveTrack | null> {
  if (typeof window === "undefined" || !isNativeApp()) return null;
  if (loadTrack()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as ActiveTrack;
    if (!isValidTrack(parsed)) return null;
    // Ещё раз убеждаемся, что за время await локально ничего не появилось.
    if (loadTrack()) return null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      /* квота/приватный режим — трек продолжит жить в памяти вызвавшего */
    }
    notifyStateChange();
    return parsed;
  } catch {
    return null;
  }
}

function saveTrack(track: ActiveTrack) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(track));
  } catch {
    /* квота/приватный режим — трек продолжит жить в памяти страницы */
  }
  mirrorToNative(track);
}

export function startTrack(coords: { lat: number; lng: number }): ActiveTrack {
  const now = Date.now();
  const track: ActiveTrack = {
    anchor: { lat: coords.lat, lng: coords.lng, t: now },
    startedAt: now,
    points: [],
  };
  saveTrack(track);
  notifyStateChange();
  return track;
}

/**
 * Добавляет точку пути, если сдвиг от последней записанной (или якоря)
 * больше MIN_POINT_DISTANCE_M. Возвращает обновлённый трек либо прежний
 * объект, если точка отброшена как шум.
 */
export function appendPoint(
  track: ActiveTrack,
  coords: { lat: number; lng: number },
): ActiveTrack {
  const last = track.points[track.points.length - 1] ?? track.anchor;
  if (haversineM(last, coords) < MIN_POINT_DISTANCE_M) return track;

  const next: ActiveTrack = {
    ...track,
    points: [...track.points, { lat: coords.lat, lng: coords.lng, t: Date.now() }],
  };
  saveTrack(next);
  return next;
}

export function clearTrack() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  mirrorToNative(null);
  notifyStateChange();
}

/** Суммарная длина пути по точкам (якорь → точки), в метрах. */
export function trackDistanceM(track: ActiveTrack): number {
  let total = 0;
  let prev: { lat: number; lng: number } = track.anchor;
  for (const p of track.points) {
    total += haversineM(prev, p);
    prev = p;
  }
  return total;
}
