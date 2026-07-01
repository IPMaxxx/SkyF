/**
 * Тонкая обёртка над Capacitor для безопасной работы в двух режимах:
 *  - обычный браузер / PWA (Capacitor отсутствует → все хелперы no-op);
 *  - нативная оболочка iOS/Android (Capacitor доступен → работают плагины).
 *
 * Всё загружается динамически, чтобы не ломать SSR и не тянуть нативный код
 * в серверный бандл. Проверяйте isNativeApp() перед вызовом нативных фич.
 */

export type NativePlatform = "ios" | "android" | "web";

let cachedPlatform: NativePlatform | null = null;

/** Синхронная проверка: выполняемся ли мы внутри нативной оболочки Capacitor. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Текущая платформа: ios | android | web. */
export function getPlatform(): NativePlatform {
  if (cachedPlatform) return cachedPlatform;
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.() as NativePlatform | undefined;
  cachedPlatform = p ?? "web";
  return cachedPlatform;
}

export const isIos = () => getPlatform() === "ios";
export const isAndroid = () => getPlatform() === "android";
