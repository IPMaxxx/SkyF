/**
 * «Вернуться к точке входа»: состояние активного похода.
 *
 * Активный трек живёт в localStorage устройства. Якорь ставится одним
 * getCurrentPosition() при старте; точки пути пишет watchPosition, пока
 * приложение активно (см. trackRecorder). Завершённые походы сохраняются
 * в историю (см. trackHistory).
 */

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

const STORAGE_KEY = "sf_active_track";

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

export function loadTrack(): ActiveTrack | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTrack;
    if (
      typeof parsed?.anchor?.lat !== "number" ||
      typeof parsed?.anchor?.lng !== "number" ||
      !Array.isArray(parsed.points)
    ) {
      return null;
    }
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

/* ------------------------------------------------------------------ */
/* Гео-математика                                                      */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Расстояние между двумя точками в метрах (haversine). */
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Азимут (0–360°, 0 = север) от точки a к точке b. */
export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export type CompassDir = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

/** Грубая сторона света по азимуту — для текстового fallback без компаса. */
export function compassDir(bearing: number): CompassDir {
  const dirs: CompassDir[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  return dirs[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}
