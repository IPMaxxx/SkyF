/**
 * Единая точка получения текущих координат.
 *
 * В нативной оболочке приоритет — плагин Capacitor Geolocation (нативные
 * разрешения и точность). В браузере/PWA — стандартный navigator.geolocation
 * (тот же паттерн уже используется в маркетплейсе).
 */

import { isNativeApp } from "./capacitor";
import { geolocationPlugin } from "./plugins";
import { withTimeout } from "@/lib/offline/deadline";
import { rememberPosition } from "@/lib/lastKnownPosition";

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Каждый удачный замер запоминаем — им центрируем карты без GPS-фикса.
 *
 * Обычным импортом, хотя раньше был ленивый: тридцать строк работы с
 * localStorage не стоят отдельного куска бандла, зато в лесу этот кусок за
 * ним не приезжал — и замер, который GPS уже отдал, не доходил до вызвавшего.
 */
function remember(pos: Coords): Coords {
  rememberPosition(pos);
  return pos;
}

/**
 * Сколько ждём замер от плагина. Ровно столько же ждёт браузерный API ниже,
 * плюс запас на холодный старт GPS.
 *
 * Срок обязателен не ради GPS (у него свой), а ради моста: ответ нативного
 * вызова теряется (см. offline/deadline), а этот замер стоит за защёлкой
 * `capturing` в trackRecorder — одно потерянное обещание навсегда выключило бы
 * страховочные замеры на весь поход.
 */
const FIX_TIMEOUT_MS = 20_000;

export async function getCurrentPosition(): Promise<Coords> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await geolocationPlugin();
      const pos = await withTimeout(
        Geolocation.getCurrentPosition({ enableHighAccuracy: true }),
        FIX_TIMEOUT_MS,
        "Geolocation.getCurrentPosition",
      );
      return remember({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      /* плагина нет или его кусок не приехал — падаем в браузерный API ниже */
    }
  }

  return new Promise<Coords>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation_unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve(remember({ lat: pos.coords.latitude, lng: pos.coords.longitude })),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}
