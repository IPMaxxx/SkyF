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
import { trackLog } from "@/lib/track/trackLog";
import {
  foregroundService,
  foregroundServiceFound,
  FOREGROUND_SERVICE_TIMEOUTS,
  withTimeout,
  type ForegroundServicePlugin,
  type ForegroundServiceStatus,
} from "@/lib/track/foregroundService";
import { confirmServiceStart } from "@/lib/track/serviceStartup";

/** Есть ли у оболочки своя служба, у которой вообще можно спросить состояние. */
export { foregroundServiceFound as backgroundWatchNative };

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
    // Со сроком: сам import() — это запрос за куском бандла по сети, и в лесу
    // он не отваливается по ошибке, а просто не завершается никогда.
    const { BackgroundGeolocation } = await withTimeout(
      import("@capgo/background-geolocation"),
      FOREGROUND_SERVICE_TIMEOUTS.load,
      "import @capgo/background-geolocation",
    );
    await withTimeout(
      BackgroundGeolocation.getPluginVersion(),
      FOREGROUND_SERVICE_TIMEOUTS.detect,
      "BackgroundGeolocation.getPluginVersion",
    );
    return BackgroundGeolocation;
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    trackLog("bg.plugin", `unavailable — ${failure?.code ?? ""} ${failure?.message ?? error}`.trim());
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
    const status = await withTimeout(
      api.checkPermissions(),
      FOREGROUND_SERVICE_TIMEOUTS.call,
      "BackgroundGeolocation.checkPermissions",
    );
    // На iOS поля нет вовсе: там постоянного уведомления не существует, роль
    // видимой отметки играет синий индикатор геолокации.
    if (!status.notification || status.notification === "granted") return true;
    if (status.notification !== "denied") {
      const next = await withTimeout(
        api.requestPermissions({ permissions: ["notification"] }),
        FOREGROUND_SERVICE_TIMEOUTS.start,
        "BackgroundGeolocation.requestPermissions",
      );
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
 * Что о себе говорит нативная часть: работает ли служба прямо сейчас и какие
 * разрешения выданы.
 *
 * Спрашивать её напрямую нужно потому, что состояние записи нельзя держать
 * только в памяти JS: при погашенном экране WebView замораживается, а при
 * нехватке памяти выгружается, тогда как служба продолжает работать. После
 * пробуждения истина — у службы, а не у наших переменных.
 */
export async function backgroundWatchState(): Promise<{
  running: boolean;
  location: boolean;
  precise: boolean;
  notifications: boolean;
  failure: string | null;
} | null> {
  const service = await foregroundService();
  if (!service) return null;
  try {
    const status = await withTimeout(
      service.status(),
      FOREGROUND_SERVICE_TIMEOUTS.call,
      "WayBackTrack.status",
    );
    return {
      running: status.running,
      location: status.location,
      precise: status.precise,
      notifications: status.notifications,
      failure: status.failure ?? null,
    };
  } catch {
    return null;
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
      await withTimeout(
        service.openSettings(),
        FOREGROUND_SERVICE_TIMEOUTS.call,
        "WayBackTrack.openSettings",
      );
      return;
    } catch {
      /* не вышло — пробуем плагином ниже */
    }
  }
  const api = await plugin();
  if (!api) return;
  try {
    await withTimeout(
      api.openSettings(),
      FOREGROUND_SERVICE_TIMEOUTS.call,
      "BackgroundGeolocation.openSettings",
    );
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
  trackLog("bg.impl", service ? "WayBackTrack" : "capgo/plugin");
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
  let handle: { remove: () => Promise<void> } | null = null;
  const stopper = () => {
    stopped = true;
    handle?.remove().catch(() => {});
    service.stop().catch(() => {});
  };

  try {
    // Подписки прежнего контекста страницы мост хранит по идентификаторам
    // колбэков; после перезагрузки они мертвы, и снимать их некому.
    await withTimeout(
      service.removeAllListeners(),
      FOREGROUND_SERVICE_TIMEOUTS.call,
      "WayBackTrack.removeAllListeners",
    );
    handle = await withTimeout(
      service.addListener("location", (position) => {
        if (stopped) return;
        options.onPosition(position.latitude, position.longitude, position.accuracy ?? null);
      }),
      FOREGROUND_SERVICE_TIMEOUTS.call,
      "WayBackTrack.addListener",
    );
    const began = Date.now();
    const accepted = await withTimeout(
      service.start({
        title: options.notice.title,
        message: options.notice.message,
        distanceFilter: options.distanceFilter,
      }),
      FOREGROUND_SERVICE_TIMEOUTS.start,
      "WayBackTrack.start",
    );
    trackLog("bg.start", `accepted in ${Date.now() - began} ms`);
    // «Команду приняли» и «служба работает» — разные вещи, и вторую мы
    // выясняем сами, переспрашивая службу. Это надёжнее ожидания внутри
    // нативного метода: каждый вопрос имеет свой срок, поэтому исход у попытки
    // есть всегда, даже когда ответ на start теряется по дороге.
    const status = await confirmRunning(service, accepted);
    if (!status.running) {
      trackLog("bg.start", `service is not up — ${status.failure ?? "no reason given"}`);
      throw {
        code: "SERVICE_FAILED",
        message: status.failure ?? "the recording service did not start",
      };
    }
    trackLog("bg.started", `confirmed in ${Date.now() - began} ms`);
    afterStart(service, status, options, () => stopped);
    return stopper;
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    trackLog("bg.start", `no answer — ${failure?.code ?? ""} ${failure?.message ?? error}`.trim());
    // Ответа на start нет — но это ещё не значит, что записи нет. Ответ мог
    // потеряться по дороге: Capacitor вызывает метод плагина внутри try/catch,
    // который на исключении только пишет в лог и промис не отклоняет. Истина о
    // записи — у самой службы, а не у нашего промиса, поэтому спрашиваем её.
    const state = await backgroundWatchState();
    if (state?.running) {
      trackLog("bg.start", "service is running anyway — adopted");
      afterStart(service, state, options, () => stopped);
      return stopper;
    }
    service.removeAllListeners().catch(() => {});
    // Служба могла подняться частично и держать GPS — глушим, иначе батарея
    // тратится на запись, которой в JS нет.
    service.stop().catch(() => {});
    options.onIssue(serviceIssue(failure, state), errorDetail(failure));
    return null;
  }
}

/**
 * Переспрашивает службу, встала ли она. Между командой и подъёмом проходит
 * доля секунды, поэтому первый ответ обычно отрицательный, и это нормально.
 * Правило вынесено в отдельный модуль, чтобы проверяться без телефона.
 */
function confirmRunning(
  service: ForegroundServicePlugin,
  first: ForegroundServiceStatus,
): Promise<ForegroundServiceStatus> {
  return confirmServiceStart(
    first,
    async () => {
      try {
        return await withTimeout(
          service.status(),
          FOREGROUND_SERVICE_TIMEOUTS.call,
          "WayBackTrack.status",
        );
      } catch {
        return null;
      }
    },
    (ms) => new Promise((done) => setTimeout(done, ms)),
  ) as Promise<ForegroundServiceStatus>;
}

/**
 * Разрешение на уведомления досматривается после старта и без ожидания ответа:
 * диалог человек читает секунды, а служба уже пишет путь. Без разрешения запись
 * идёт, но её не видно — молчать об этом нельзя ни по политике Google, ни
 * по-человечески.
 */
function afterStart(
  service: ForegroundServicePlugin,
  status: { notifications: boolean; precise: boolean },
  options: BackgroundWatchOptions,
  stopped: () => boolean,
): void {
  if (!status.precise) trackLog("bg.precise", "approximate location only");
  if (status.notifications) return;
  service
    .requestNotifications()
    .catch(() => status)
    .then((next) => {
      if (stopped() || next.notifications) return;
      window.dispatchEvent(new Event(BACKGROUND_NOTICE_BLOCKED_EVENT));
      options.onIssue("notificationsBlocked", null);
    });
}

/**
 * Коды отказа своей службы; в отличие от плагина, каждый значит ровно одно.
 * NOT_AUTHORIZED — «геолокация не разрешена совсем».
 *
 * Отдельный случай — «разрешено приблизительно». По документации службе
 * переднего плана типа location хватает и грубого разрешения, но проверить это
 * на всех оболочках мы не можем, а разница между эмулятором с полными правами и
 * телефоном человека объясняется этим лучше всего. Поэтому если старт не удался
 * и при этом точное местоположение не выдано — называем причиной именно его:
 * она хотя бы поправима одним переключателем, в отличие от «не получилось».
 */
function serviceIssue(
  error: { code?: string; message?: string },
  state: { location: boolean; precise: boolean } | null,
): BackgroundIssue {
  if (error.code === "NOT_AUTHORIZED" || state?.location === false) return "locationDenied";
  if (state && !state.precise) return "preciseLocation";
  return "failed";
}

async function startWithPlugin(
  options: BackgroundWatchOptions,
): Promise<(() => void) | null> {
  const api = await plugin();
  if (!api) {
    options.onIssue("unsupported", null);
    return null;
  }

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
    await withTimeout(run(), FOREGROUND_SERVICE_TIMEOUTS.start, "BackgroundGeolocation.start");
  } catch {
    // Сюда попадают только отказы самого моста; отказ службы приходит колбэком.
    options.onIssue("failed", null);
    return null;
  }

  // Разрешение на уведомления — рядом со стартом, а не до него: внутри может
  // открыться системный диалог, и человек отвечает на него секунды. Ждать его
  // на пути запуска значит держать поход без записи всё это время.
  void ensureNotificationPermission(api).then((ok) => {
    if (!ok && !stopped) options.onIssue("notificationsBlocked", null);
  });

  return () => {
    stopped = true;
    void stopBackgroundWatch();
  };
}

export async function stopBackgroundWatch(): Promise<void> {
  const service = await foregroundService();
  if (service) {
    try {
      await withTimeout(service.stop(), FOREGROUND_SERVICE_TIMEOUTS.call, "WayBackTrack.stop");
    } catch {
      /* службы нет — останавливать нечего */
    }
    return;
  }
  const api = await plugin();
  if (!api) return;
  try {
    await withTimeout(api.stop(), FOREGROUND_SERVICE_TIMEOUTS.call, "BackgroundGeolocation.stop");
  } catch {
    /* службы нет — останавливать нечего */
  }
}
