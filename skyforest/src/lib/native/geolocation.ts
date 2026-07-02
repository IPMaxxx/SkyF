/**
 * Единая точка получения текущих координат.
 *
 * В нативной оболочке приоритет — плагин Capacitor Geolocation (нативные
 * разрешения и точность). В браузере/PWA — стандартный navigator.geolocation
 * (тот же паттерн уже используется в маркетплейсе).
 */

import { isNativeApp } from "./capacitor";

export interface Coords {
  lat: number;
  lng: number;
}

export async function getCurrentPosition(): Promise<Coords> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      /* плагин недоступен — падаем в браузерный API ниже */
    }
  }

  return new Promise<Coords>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation_unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}
