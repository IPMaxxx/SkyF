/**
 * Запись точек пути, которая продолжается со свёрнутым приложением и
 * выключенным экраном.
 *
 * Оболочка получает этот код с сайта (`server.url` в capacitor.config), то есть
 * он приезжает и в приложения, собранные до появления плагина. Там нативной
 * части в бинарнике нет, и вызов отвечает UNIMPLEMENTED — поэтому обращение
 * мягкое, а вызывающая сторона обязана уметь работать без фона (обычный
 * watchPosition, засыпающий вместе с приложением).
 *
 * Реализаций две, и порядок такой:
 *  1. своя служба переднего плана WayBack (track/foregroundService) — Android,
 *     оболочка versionCode 9 и новее. Полный контроль над уведомлением и
 *     честный ответ «поднялась / не поднялась»;
 *  2. плагин @capgo/background-geolocation — iOS (там уведомления нет вовсе,
 *     фон держат UIBackgroundModes) и уже установленные сборки Android без
 *     своей службы. Ломать их нельзя: веб к ним приезжает тот же самый.
 *
 * Фон на iOS включается самим фактом передачи `backgroundMessage`: плагин
 * выставляет `allowsBackgroundLocationUpdates` и просит «Always». Отказ от
 * «Always» запись не ломает — при «While Using» система продолжает отдавать
 * координаты, пока горит синий индикатор. На Android фон держит служба
 * переднего плана, и постоянное уведомление обязательно: без него система
 * службу убивает, поэтому его текст — обязательный параметр, а не опция.
 *
 * Накопленных за время сна точек плагин не отдаёт: координаты приходят живым
 * колбэком через мост, а нативного буфера у него нет. Значит запись держится на
 * том, что приложение с активным фоновым режимом система не усыпляет; страховка
 * на возвращении в приложение (одиночный замер в trackRecorder) остаётся.
 *
 * Главная ловушка этого плагина: `start()` объявлен колбэчным методом. Его
 * промис отдаёт идентификатор колбэка сразу и НЕ отклоняется, когда служба не
 * поднялась, — отказ приезжает вторым аргументом колбэка. «Await прошёл» здесь
 * не значит «запись идёт», и всё, что об этом судит, обязано смотреть на
 * колбэк.
 */

import { isNativeApp } from "@/lib/native/capacitor";
import {
  foregroundService,
  type ForegroundServicePlugin,
} from "@/lib/track/foregroundService";

/** Текст постоянного уведомления Android; приходит из словаря приложения. */
export interface BackgroundNotice {
  title: string;
  message: string;
}

/** Почему фоновая запись не идёт — в терминах, годных для текста человеку. */
export type BackgroundIssue =
  | "unsupported"
  | "notificationsBlocked"
  /** Разрешение на геолокацию не выдано вовсе (своя служба различает это точно). */
  | "locationDenied"
  | "preciseLocation"
  | "locationOff"
  | "failed";

export interface BackgroundWatchOptions {
  notice: BackgroundNotice;
  /** Сдвиг, после которого плагин отдаёт новую координату (метры). */
  distanceFilter: number;
  onPosition: (lat: number, lng: number, accuracy: number | null) => void;
  /**
   * Служба не поднялась или отвалилась уже после старта. `detail` — код и
   * текст ровно как их вернул плагин: без них причину приходится угадывать,
   * а Logcat у человека в лесу не спросишь.
   */
  onIssue: (issue: BackgroundIssue, detail: string | null) => void;
}

type BackgroundGeolocationPlugin =
  typeof import("@capgo/background-geolocation").BackgroundGeolocation;

let cachedPlugin: BackgroundGeolocationPlugin | null = null;
let pendingPlugin: Promise<BackgroundGeolocationPlugin | null> | null = null;

/**
 * Прокси плагина создаётся всегда, поэтому отсутствие нативной части видно
 * только по вызову. getPluginVersion — самый дешёвый из существующих.
 */
async function loadPlugin(): Promise<BackgroundGeolocationPlugin | null> {
  if (!isNativeApp()) return null;
  try {
    const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
    await BackgroundGeolocation.getPluginVersion();
    return BackgroundGeolocation;
  } catch {
    return null;
  }
}

/**
 * Удачную находку кешируем, неудачу — нет. Нативная часть либо есть в
 * бинарнике, либо нет, но провалиться проверка может и по случайности (мост
 * ещё не поднят на самом первом обращении), а запомненный навсегда отказ
 * означал бы поход без фоновой записи до перезапуска приложения.
 */
function plugin(): Promise<BackgroundGeolocationPlugin | null> {
  if (cachedPlugin) return Promise.resolve(cachedPlugin);
  pendingPlugin ??= loadPlugin().then((api) => {
    pendingPlugin = null;
    if (api) cachedPlugin = api;
    return api;
  });
  return pendingPlugin;
}

/**
 * Событие window: запись идёт, а постоянное уведомление человеку не
 * показывается. Слушает его приложение — только оно знает свои тексты.
 */
export const BACKGROUND_NOTICE_BLOCKED_EVENT = "sf:bg-notice-blocked";

/**
 * Спрашивает разрешение на уведомления, пока его ещё можно спросить.
 * Возвращает false, если уведомления запрещены.
 *
 * Сам плагин просит его только по пути, где не выдана геолокация, а в WayBack
 * она выдана задолго до похода (её просит карта на главном экране). Без этого
 * разрешения служба переднего плана на Android 13+ работает, но её уведомление
 * не показывается нигде — ни в шторке, ни на экране блокировки. Незаметная
 * запись геолокации — ровно то, чего требует не допускать политика Google, да
 * и человеку так нельзя. Второй раз система диалог не покажет, поэтому о таком
 * состоянии приложение обязано сказать вслух.
 */
async function ensureNotificationPermission(
  api: BackgroundGeolocationPlugin,
): Promise<boolean> {
  try {
    const status = await api.checkPermissions();
    // На iOS поля нет вовсе: там постоянного уведомления не существует, роль
    // видимой отметки играет синий индикатор геолокации.
    if (!status.notification || status.notification === "granted") return true;
    if (status.notification !== "denied") {
      const next = await api.requestPermissions({ permissions: ["notification"] });
      if (next.notification === "granted") return true;
    }
    window.dispatchEvent(new Event(BACKGROUND_NOTICE_BLOCKED_EVENT));
    return false;
  } catch {
    /* старая версия плагина без этих методов: запись важнее уведомления */
    return true;
  }
}

/**
 * Открывает системные настройки приложения — единственный путь вернуть
 * разрешение на уведомления после отказа.
 */
export async function openAppSettings(): Promise<void> {
  const service = await foregroundService();
  if (service) {
    try {
      await service.openSettings();
      return;
    } catch {
      /* не вышло — пробуем плагином ниже */
    }
  }
  const api = await plugin();
  if (!api) return;
  try {
    await api.openSettings();
  } catch {
    /* нативной части нет — открывать нечего */
  }
}

/**
 * Плагин различает два отказа одним кодом NOT_AUTHORIZED, а лечатся они
 * по-разному, поэтому смотрим на текст.
 *
 * «Denied location permission» — не обязательно полный запрет: алиас location
 * у плагина считается выданным, только когда выданы ОБА разрешения, грубое и
 * точное. С Android 12 человек может дать «приблизительное», и тогда обычный
 * watch работает (иконка геолокации горит), а служба стартовать отказывается.
 * Лечится переключателем «Точное местоположение», а не включением геолокации.
 */
function issueFromError(error: { code?: string; message?: string } | undefined): BackgroundIssue {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`;
  if (/disabled/i.test(text)) return "locationOff";
  if (/permission|NOT_AUTHORIZED/i.test(text)) return "preciseLocation";
  return "failed";
}

function errorDetail(error: { code?: string; message?: string } | undefined): string | null {
  const detail = [error?.code, error?.message].filter(Boolean).join(": ");
  return detail || null;
}

/**
 * Включает фоновую запись. Возвращает функцию остановки либо null, если
 * нативной части нет или служба не поднялась, — вызывающая сторона обязана
 * остаться при обычном watch.
 */
export async function startBackgroundWatch(
  options: BackgroundWatchOptions,
): Promise<(() => void) | null> {
  const service = await foregroundService();
  if (service) return startWithService(service, options);
  return startWithPlugin(options);
}

/**
 * Своя служба. Повторный вызов посреди похода — штатный случай (перезагрузка
 * страницы): служба уже поднята, а слушатель потерян вместе с прежним
 * контекстом, поэтому подписываемся заново и обновляем текст уведомления.
 * Второй службы при этом не появляется.
 */
async function startWithService(
  service: ForegroundServicePlugin,
  options: BackgroundWatchOptions,
): Promise<(() => void) | null> {
  let stopped = false;
  try {
    // Подписки прежнего контекста страницы мост хранит по идентификаторам
    // колбэков; после перезагрузки они мертвы, и снимать их некому.
    await service.removeAllListeners();
    const handle = await service.addListener("location", (position) => {
      if (stopped) return;
      options.onPosition(position.latitude, position.longitude, position.accuracy ?? null);
    });
    const status = await service.start({
      title: options.notice.title,
      message: options.notice.message,
      distanceFilter: options.distanceFilter,
    });
    if (!status.notifications) {
      // Служба работает, но человек не видит, что идёт запись геолокации.
      // Молчать об этом нельзя ни по политике Google, ни по-человечески.
      window.dispatchEvent(new Event(BACKGROUND_NOTICE_BLOCKED_EVENT));
      options.onIssue("notificationsBlocked", null);
    }
    return () => {
      stopped = true;
      void handle.remove();
      void service.stop();
    };
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    void service.removeAllListeners();
    options.onIssue(serviceIssue(failure), errorDetail(failure));
    return null;
  }
}

/**
 * Коды отказа своей службы; в отличие от плагина, каждый значит ровно одно.
 * NOT_AUTHORIZED здесь — «геолокация не разрешена совсем», а не «разрешена
 * приблизительно»: службе хватает и грубого разрешения.
 */
function serviceIssue(error: { code?: string; message?: string }): BackgroundIssue {
  return error.code === "NOT_AUTHORIZED" ? "locationDenied" : "failed";
}

async function startWithPlugin(
  options: BackgroundWatchOptions,
): Promise<(() => void) | null> {
  const api = await plugin();
  if (!api) {
    options.onIssue("unsupported", null);
    return null;
  }
  const notificationsOk = await ensureNotificationPermission(api);

  let stopped = false;
  let retried = false;

  const run = (): Promise<unknown> =>
    api.start(
      {
        backgroundTitle: options.notice.title,
        backgroundMessage: options.notice.message,
        requestPermissions: true,
        distanceFilter: options.distanceFilter,
        stale: false,
      },
      (position, error) => {
        if (stopped) return;
        if (error) {
          handleError(error);
          return;
        }
        if (!position) return;
        options.onPosition(position.latitude, position.longitude, position.accuracy ?? null);
      },
    );

  function handleError(error: { code?: string; message?: string }): void {
    // Служба переднего плана живёт вне JS-контекста, поэтому после перезагрузки
    // страницы посреди похода она ещё пишет, а её колбэк потерян вместе с
    // прежним контекстом — плагин отвечает ALREADY_STARTED. Поднимаем заново,
    // иначе до перезапуска приложения точки в фоне будут уходить в никуда.
    if (!retried && /ALREADY_STARTED/i.test(`${error.code ?? ""} ${error.message ?? ""}`)) {
      retried = true;
      void (async () => {
        try {
          await api!.stop();
          await run();
        } catch {
          options.onIssue("failed", errorDetail(error));
        }
      })();
      return;
    }
    // Служба могла успеть частично подняться и держать GPS — глушим, иначе
    // батарея тратится на запись, которой нет.
    void stopBackgroundWatch();
    options.onIssue(issueFromError(error), errorDetail(error));
  }

  try {
    await run();
  } catch {
    // Сюда попадают только отказы самого моста; отказ службы приходит колбэком.
    options.onIssue("failed", null);
    return null;
  }

  if (!notificationsOk) options.onIssue("notificationsBlocked", null);

  return () => {
    stopped = true;
    void stopBackgroundWatch();
  };
}

export async function stopBackgroundWatch(): Promise<void> {
  const service = await foregroundService();
  if (service) {
    try {
      await service.stop();
    } catch {
      /* службы нет — останавливать нечего */
    }
    return;
  }
  const api = await plugin();
  if (!api) return;
  try {
    await api.stop();
  } catch {
    /* службы нет — останавливать нечего */
  }
}
