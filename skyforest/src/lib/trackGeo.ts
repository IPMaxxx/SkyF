/**
 * Чистая гео-математика для функции Track (без побочных эффектов и хранилищ).
 *
 * Вынесена отдельно, чтобы переиспользоваться и в приложении (см. trackState),
 * и в автономном офлайн-экране (mobile/shell/offline-track.js — там мини-копия
 * этих же формул, т.к. тот экран не проходит через сборку Next).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Минимальное смещение между базовой и текущей точкой, чтобы курс движения
 * (course over ground) считался надёжным. Меньше — тонет в шуме GPS.
 */
export const MIN_COURSE_DISTANCE_M = 12;

/** Насколько старой может быть точка в буфере курса движения (мс). */
export const MAX_COURSE_AGE_MS = 45_000;

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Расстояние между двумя точками в метрах (haversine). */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Азимут (0–360°, 0 = север) от точки a к точке b. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Курс движения (0–360°, 0 = север) по буферу последних позиций.
 *
 * Идём от самой свежей точки к старым и берём первую, отстоящую от текущей
 * не меньше MIN_COURSE_DISTANCE_M: азимут от неё к текущей и есть направление
 * движения. Так курс строится по реальному смещению по земле (course over
 * ground) в той же системе отсчёта (истинный север), что и азимут на якорь, —
 * без магнитометра и без рассинхронизации «магнитный ↔ истинный север».
 * Возвращает null, если человек фактически стоит на месте.
 */
export function courseOverGround(samples: LatLng[]): number | null {
  if (samples.length < 2) return null;
  const cur = samples[samples.length - 1];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (haversineM(samples[i], cur) >= MIN_COURSE_DISTANCE_M) {
      return bearingDeg(samples[i], cur);
    }
  }
  return null;
}

/**
 * Плавное смешивание углов (градусы): сдвигает prev к next на долю factor,
 * корректно проходя через 0/360. Гасит дёрганье курса на шуме GPS.
 */
export function smoothAngle(prev: number | null, next: number, factor = 0.35): number {
  if (prev == null || Number.isNaN(prev)) return next;
  const diff = ((next - prev + 540) % 360) - 180;
  return (((prev + diff * factor) % 360) + 360) % 360;
}

/** Точка на расстоянии distanceM (м) по азимуту bearing (град) от исходной. */
export function destinationPoint(from: LatLng, bearing: number, distanceM: number): LatLng {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearing);
  const φ1 = toRad(from.lat);
  const λ1 = toRad(from.lng);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

export type CompassDir = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

/** Грубая сторона света по азимуту — для текстового fallback без компаса. */
export function compassDir(bearing: number): CompassDir {
  const dirs: CompassDir[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  return dirs[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}
