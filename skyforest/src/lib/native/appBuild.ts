/**
 * Версия установленной оболочки: versionName и versionCode (на iOS — короткая
 * версия и номер сборки).
 *
 * Нужна не из любви к цифрам. Веб приезжает в оболочку по воздуху, а нативная
 * часть меняется только переустановкой, и эти две версии живут независимо.
 * Разбор каждой поломки фоновой записи начинался с вопроса «а какой у вас
 * бинарник?» — и ответа не было ни у нас, ни у человека. Теперь ответ виден
 * в меню, рядом с версией сайта.
 */

import { isNativeApp } from "@/lib/native/capacitor";
import { appPlugin } from "@/lib/native/plugins";
import { withTimeout } from "@/lib/offline/deadline";

export interface NativeBuild {
  /** versionName оболочки, например «1.1.3». */
  version: string;
  /** versionCode Android или номер сборки iOS, например «10». */
  build: string;
}

let cached: NativeBuild | null = null;
let pending: Promise<NativeBuild | null> | null = null;

async function load(): Promise<NativeBuild | null> {
  if (!isNativeApp()) return null;
  try {
    // Со сроком, и это не перестраховка: версию оболочки спрашивает журнал
    // диагностики, а он открывается как раз тогда, когда что-то работает не
    // так. Вечное ожидание здесь однажды показало человеку пустой журнал при
    // полном — то есть отняло у нас единственный источник данных.
    const { App } = await appPlugin();
    const info = await withTimeout(App.getInfo(), INFO_TIMEOUT_MS, "App.getInfo");
    return { version: info.version, build: info.build };
  } catch {
    // В браузере плагина нет — и версии оболочки тоже нет.
    return null;
  }
}

const INFO_TIMEOUT_MS = 3_000;

export function nativeBuild(): Promise<NativeBuild | null> {
  if (cached) return Promise.resolve(cached);
  pending ??= load().then((info) => {
    pending = null;
    if (info) cached = info;
    return info;
  });
  return pending;
}

/** «1.1.3 (10)» либо null, если приложение открыто в браузере. */
export function formatNativeBuild(info: NativeBuild | null): string | null {
  return info ? `${info.version} (${info.build})` : null;
}
