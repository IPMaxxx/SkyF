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
 */

import { isNativeApp } from "@/lib/native/capacitor";

/** Текст постоянного уведомления Android; приходит из словаря приложения. */
export interface BackgroundNotice {
  title: string;
  message: string;
}

export interface BackgroundWatchOptions {
  notice: BackgroundNotice;
  /** Сдвиг, после которого плагин отдаёт новую координату (метры). */
  distanceFilter: number;
  onPosition: (lat: number, lng: number, accuracy: number | null) => void;
}

type BackgroundGeolocationPlugin =
  typeof import("@capgo/background-geolocation").BackgroundGeolocation;

let pluginPromise: Promise<BackgroundGeolocationPlugin | null> | null = null;

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

function plugin(): Promise<BackgroundGeolocationPlugin | null> {
  pluginPromise ??= loadPlugin();
  return pluginPromise;
}

/** Есть ли в этой сборке нативная часть фоновой записи. */
export async function backgroundWatchAvailable(): Promise<boolean> {
  return (await plugin()) != null;
}

/**
 * Спрашивает разрешение на уведомления, пока его ещё можно спросить.
 *
 * Сам плагин просит его только по пути, где не выдана геолокация, а в WayBack
 * она выдана задолго до похода (её просит карта на главном экране). Без этого
 * разрешения служба переднего плана на Android 13+ работает, но её уведомление
 * человеку не показывается — то есть запись идёт молча, без объяснения.
 */
async function ensureNotificationPermission(
  api: BackgroundGeolocationPlugin,
): Promise<void> {
  try {
    const status = await api.checkPermissions();
    // На iOS поля нет; «denied» второй раз спрашивать бессмысленно — система
    // диалог не покажет.
    if (!status.notification || status.notification === "granted") return;
    if (status.notification === "denied") return;
    await api.requestPermissions({ permissions: ["notification"] });
  } catch {
    /* отказ или старая версия плагина: запись важнее уведомления */
  }
}

/**
 * Включает фоновую запись. Возвращает false, если нативной части нет или плагин
 * отказался стартовать — тогда вызывающая сторона остаётся на обычном watch.
 */
export async function startBackgroundWatch(
  options: BackgroundWatchOptions,
): Promise<boolean> {
  const api = await plugin();
  if (!api) return false;
  await ensureNotificationPermission(api);

  const run = () =>
    api.start(
      {
        backgroundTitle: options.notice.title,
        backgroundMessage: options.notice.message,
        requestPermissions: true,
        distanceFilter: options.distanceFilter,
        stale: false,
      },
      (position, error) => {
        if (error || !position) return;
        options.onPosition(position.latitude, position.longitude, position.accuracy ?? null);
      },
    );

  try {
    await run();
    return true;
  } catch {
    // Служба переднего плана живёт вне JS-контекста, поэтому после перезагрузки
    // страницы посреди похода она ещё пишет, а её колбэк потерян вместе с
    // прежним контекстом — плагин отвечает ALREADY_STARTED. Поднимаем заново,
    // иначе до перезапуска приложения точки в фоне будут уходить в никуда.
    try {
      await api.stop();
      await run();
      return true;
    } catch {
      return false;
    }
  }
}

export async function stopBackgroundWatch(): Promise<void> {
  const api = await plugin();
  if (!api) return;
  try {
    await api.stop();
  } catch {
    /* службы нет — останавливать нечего */
  }
}
