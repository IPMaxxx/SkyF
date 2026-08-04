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
import { plainApi } from "@/lib/native/plainApi";
import { trackLog } from "@/lib/track/trackLog";
import {
  CHUNK_TIMEOUT_MS,
  loadChunk,
  withTimeout,
  type NativeCallFailure,
} from "@/lib/offline/deadline";

/**
 * Срок и его обёртка переехали в offline/deadline: та же беда — вечное
 * ожидание — обнаружилась не только у моста, но и у карты, у истории походов
 * и у гейта подписки. Реэкспорт оставлен, чтобы не переписывать вызывающих.
 */
export { withTimeout };
export type { NativeCallFailure };

/**
 * Сколько ждём ответа моста, прежде чем считать вызов провалившимся.
 *
 * Ждать бесконечно нельзя, и это не перестраховка. Capacitor вызывает метод
 * плагина внутри try/catch, который на любом исключении только пишет в лог
 * («Serious error executing plugin», Bridge.callPluginMethod) и НЕ отклоняет
 * вызов: промис в JS остаётся висеть навсегда. Любая нативная осечка без
 * таймаута превращается в вечное «настраиваем запись» на экране — ровно то,
 * что человек и увидел.
 *
 * Четыре секунды на проверку, а не одна: где нативной части нет, мост отвечает
 * UNIMPLEMENTED сразу, и срок не расходуется вовсе. Расходуется он там, где мост
 * ещё просыпается на холодном старте, и поспешный вывод «службы нет» стоил бы
 * похода без фоновой записи.
 */
const DETECT_TIMEOUT_MS = 4_000;
/**
 * Старт больше не ждёт подъёма службы — он отвечает по факту приёма команды, и
 * на устройстве это десятки миллисекунд. Восемь секунд остались от прежней
 * конструкции, где внутри ждали флага; теперь такой запас только оттягивает
 * исход. Подъём службы подтверждается отдельно, опросом status().
 *
 * Системный диалог внутри старта возможен только один — геолокация, и она в
 * WayBack выдана задолго до похода.
 */
const START_TIMEOUT_MS = 5_000;
const CALL_TIMEOUT_MS = 3_000;
/**
 * Опрос «встала ли служба» задаётся много раз подряд, поэтому срок у него
 * короче обычного: иначе дюжина неотвеченных вопросов складывается в полминуты.
 */
const CONFIRM_TIMEOUT_MS = 2_000;

export const FOREGROUND_SERVICE_TIMEOUTS = {
  detect: DETECT_TIMEOUT_MS,
  start: START_TIMEOUT_MS,
  call: CALL_TIMEOUT_MS,
  confirm: CONFIRM_TIMEOUT_MS,
  load: CHUNK_TIMEOUT_MS,
};

export interface ForegroundServiceStatus {
  /** Служба действительно поднята — не «вызов зарегистрирован». */
  running: boolean;
  /** Выдано ли точное местоположение; без него след получается грубым. */
  precise: boolean;
  location: boolean;
  /** Видно ли постоянное уведомление (Android 13+ спрашивает отдельно). */
  notifications: boolean;
  /**
   * Почему служба не поднялась, словами самой службы. Она падает уже после
   * того, как метод плагина вернул управление, поэтому в отказ вызова эта
   * причина попасть не может — только сюда. В оболочках до versionCode 11 поля
   * нет, и это не отличается от «причина неизвестна».
   */
  failure?: string | null;
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
  /** Спрашивает разрешение на уведомления; вызывается уже после старта службы. */
  requestNotifications(): Promise<ForegroundServiceStatus>;
  openSettings(): Promise<void>;
  addListener(
    event: "location",
    handler: (position: ServicePosition) => void,
  ): Promise<ListenerHandle>;
  removeAllListeners(): Promise<void>;
}

let cached: ForegroundServicePlugin | null = null;
let pending: Promise<ForegroundServicePlugin | null> | null = null;

/**
 * Методы, которые нам нужны от службы. Список нужен, чтобы отдать наружу
 * обычный объект вместо прокси: почему это обязательно — в native/plainApi.
 */
const METHODS = [
  "start",
  "stop",
  "status",
  "requestNotifications",
  "openSettings",
  "addListener",
  "removeAllListeners",
] as const;

async function load(): Promise<ForegroundServicePlugin | null> {
  if (!isNativeApp()) return null;
  const began = Date.now();
  try {
    const { registerPlugin } = await loadChunk("@capacitor/core", () => import("@capacitor/core"));
    const api = registerPlugin<ForegroundServicePlugin>("WayBackTrack");
    // Прокси создаётся всегда, поэтому отсутствие нативной части видно только
    // по вызову: без неё мост отвечает UNIMPLEMENTED. С таймаутом, потому что
    // «нативной части нет» — штатное положение дел для сборок из Play, и
    // зависнуть на этой проверке приложение права не имеет.
    await withTimeout(api.status(), DETECT_TIMEOUT_MS, "WayBackTrack.status");
    trackLog("bg.detect", `WayBackTrack in ${Date.now() - began} ms`);
    return plainApi(api, METHODS);
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    trackLog(
      "bg.detect",
      `no WayBackTrack in ${Date.now() - began} ms — ${failure?.code ?? ""} ${failure?.message ?? error}`.trim(),
    );
    return null;
  }
}

/**
 * Удачную находку кешируем, неудачу — нет: провалиться проверка может и по
 * случайности (мост ещё не поднят на первом обращении), а запомненный навсегда
 * отказ означал бы поход без фоновой записи до перезапуска приложения.
 */
/**
 * Нашлась ли своя служба — синхронно и без обращения к мосту. Нужно тем, кто
 * опрашивает состояние по таймеру: там, где нативной части нет, спрашивать
 * нечего и незачем.
 */
export function foregroundServiceFound(): boolean {
  return cached !== null;
}

export function foregroundService(): Promise<ForegroundServicePlugin | null> {
  if (cached) return Promise.resolve(cached);
  pending ??= load().then((api) => {
    pending = null;
    if (api) cached = api;
    return api;
  });
  return pending;
}
