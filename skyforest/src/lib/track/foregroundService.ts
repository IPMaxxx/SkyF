/**
 * Своя служба переднего плана Android (`WayBackTrack` в оболочке WayBack).
 *
 * Появилась вместо службы плагина фоновой геолокации, потому что за один день
 * та показала три отказа подряд, и каждый стоил похода:
 *  - уведомление служба собирала без FOREGROUND_SERVICE_IMMEDIATE и без
 *    VISIBILITY_PUBLIC, то есть первые десять секунд его не было, а на экране
 *    блокировки не было содержимого. Уведомление здесь — не украшение: без
 *    видимой службы переднего плана Android забирает геолокацию;
 *  - координаты она просила только у GPS_PROVIDER, поэтому в помещении не
 *    отдавала ни точки;
 *  - об отказе старта сообщала не отклонённым промисом, а колбэком, так что
 *    «фоновая запись включена» ничего не значило.
 *
 * Здесь `start()` — обычный промис: он отклоняется с кодом, если службу поднять
 * не удалось, и разрешается только после того, как служба встала. Координаты
 * приходят событием `location`.
 *
 * Нативная часть есть только в оболочке WayBack, начиная с versionCode 9. В
 * остальных сборках (iOS, старые Android, SkyForest, Checker) вызов отвечает
 * UNIMPLEMENTED, и вызывающая сторона возвращается к плагину.
 */

import { isNativeApp } from "@/lib/native/capacitor";

export interface ForegroundServiceStatus {
  /** Служба действительно поднята — не «вызов зарегистрирован». */
  running: boolean;
  /** Выдано ли точное местоположение; без него след получается грубым. */
  precise: boolean;
  location: boolean;
  /** Видно ли постоянное уведомление (Android 13+ спрашивает отдельно). */
  notifications: boolean;
}

interface ServicePosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  time: number;
}

interface ListenerHandle {
  remove: () => Promise<void>;
}

export interface ForegroundServicePlugin {
  start(options: {
    title: string;
    message: string;
    distanceFilter: number;
  }): Promise<ForegroundServiceStatus>;
  stop(): Promise<ForegroundServiceStatus>;
  status(): Promise<ForegroundServiceStatus>;
  openSettings(): Promise<void>;
  addListener(
    event: "location",
    handler: (position: ServicePosition) => void,
  ): Promise<ListenerHandle>;
  removeAllListeners(): Promise<void>;
}

let cached: ForegroundServicePlugin | null = null;
let pending: Promise<ForegroundServicePlugin | null> | null = null;

async function load(): Promise<ForegroundServicePlugin | null> {
  if (!isNativeApp()) return null;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const api = registerPlugin<ForegroundServicePlugin>("WayBackTrack");
    // Прокси создаётся всегда, поэтому отсутствие нативной части видно только
    // по вызову: без неё мост отвечает UNIMPLEMENTED.
    await api.status();
    return api;
  } catch {
    return null;
  }
}

/**
 * Удачную находку кешируем, неудачу — нет: провалиться проверка может и по
 * случайности (мост ещё не поднят на первом обращении), а запомненный навсегда
 * отказ означал бы поход без фоновой записи до перезапуска приложения.
 */
export function foregroundService(): Promise<ForegroundServicePlugin | null> {
  if (cached) return Promise.resolve(cached);
  pending ??= load().then((api) => {
    pending = null;
    if (api) cached = api;
    return api;
  });
  return pending;
}
