/**
 * Какими словами WayBack рассказывает о записи пути — по возможностям ТОЙ
 * сборки, в которой этот текст читают.
 *
 * Веб приезжает в оболочку с сайта, то есть один и тот же текст одновременно
 * показывается и в свежей сборке со своей службой переднего плана, и в
 * приложении из Play, собранном до неё, и в браузере. Обещание «запись идёт с
 * погашенным экраном» верно только в первой; в остальных это прямая ложь — и
 * ложь, которую первым читает ревьюер магазина.
 *
 * Поэтому строк две, и выбор между ними делается по факту, а не по нашей вере
 * в то, что все обновились. Признак берётся у нативной части
 * (track/foregroundService), а значит приезжает с задержкой: до ответа
 * показывается нейтральный вариант. Мигнуть сильным обещанием и забрать его
 * назад хуже, чем сказать меньше.
 *
 * Модуль намеренно без импортов: выбор проверяется в Node без браузера —
 * см. fastlane/.recording-copy-check.mjs.
 */

export type BackgroundSupport =
  /** Нативную часть ещё не спросили. Считаем, что фона нет. */
  | "unknown"
  /** Спросили: своей службы в этой сборке нет. */
  | "absent"
  /** Служба есть — запись переживает погашенный экран. */
  | "present";

export interface RecordingCopyKeys {
  /** Ключ в словаре `wayback.home` — шаг «как это работает» про запись пути. */
  how2: "how2" | "how2Background";
  /** Ключ в словаре `wayback.active` — легенда пунктира под картой похода. */
  gapHint: "gapHint" | "gapHintBackground";
}

/** Что ответила нативная часть: объект службы либо null, если её нет. */
export function backgroundSupportFrom(service: unknown): BackgroundSupport {
  return service ? "present" : "absent";
}

export function recordingCopy(support: BackgroundSupport): RecordingCopyKeys {
  return support === "present"
    ? { how2: "how2Background", gapHint: "gapHintBackground" }
    : { how2: "how2", gapHint: "gapHint" };
}
