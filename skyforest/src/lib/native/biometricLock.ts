/**
 * Биометрический замок приложения (Face ID / Touch ID / отпечаток).
 *
 * Это дополнительный нативный слой поверх Supabase MFA: если пользователь
 * включил замок, при запуске и возврате из фона приложение требует
 * биометрическую разблокировку. Настройка хранится локально в Preferences.
 *
 * В обычном браузере/PWA все функции — no-op (замок недоступен).
 */
import { isNativeApp } from "./capacitor";

const PREF_KEY = "biometric_lock_enabled";

/** Имя, под которым плагин биометрии регистрируется в Capacitor. */
const BIOMETRY_PLUGIN = "BiometricAuthNative";

/**
 * Собран ли плагин биометрии в текущую нативную оболочку.
 *
 * Проверка обязательна перед любым обращением к `BiometricAuth`: без нативной
 * части его прокси уходит в бесконечную рекурсию и намертво вешает главный
 * поток WebView. Конструктор `BiometricAuthNative` забирает метод у прокси
 * (`this.checkBiometry = proxy.checkBiometry`), а `@capacitor/core`, не найдя
 * `PluginHeaders`, подставляет реализацию из этого же прокси — вызов замыкается
 * сам на себя, каждый круг создаёт новый объект. Так замирал экран аккаунта
 * Mushroom Checker: в его оболочке (`apps/mushroom-checker`) плагина нет, как и
 * в оболочке WayBack; из продуктов он есть только у SkyForest.
 *
 * Спрашиваем именно `PluginHeaders` — список плагинов, реально собранных в
 * оболочку. `Capacitor.isPluginAvailable()` здесь не годится: он отвечает «да»
 * и на одну лишь JS-регистрацию, которая как раз и зацикливается.
 */
function hasNativeBiometry(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { PluginHeaders?: Array<{ name: string }> };
    }
  ).Capacitor;
  return Boolean(cap?.PluginHeaders?.some((header) => header.name === BIOMETRY_PLUGIN));
}

/**
 * Прокси плагина нельзя возвращать из async-функции напрямую: движок проверяет
 * у результата `.then` (thenable), а прокси Capacitor трактует это как вызов
 * метода плагина и падает («Preferences.then() is not implemented»). Поэтому
 * оборачиваем в объект.
 */
async function prefs() {
  const { Preferences } = await import("@capacitor/preferences");
  return {
    get: (options: { key: string }) => Preferences.get(options),
    set: (options: { key: string; value: string }) => Preferences.set(options),
  };
}

/** Доступна ли биометрия на устройстве. */
export async function isBiometryAvailable(): Promise<boolean> {
  if (!isNativeApp() || !hasNativeBiometry()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const info = await BiometricAuth.checkBiometry();
    return info.isAvailable;
  } catch {
    return false;
  }
}

export async function isLockEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const p = await prefs();
    const { value } = await p.get({ key: PREF_KEY });
    return value === "1";
  } catch {
    return false;
  }
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  if (!isNativeApp()) return;
  const p = await prefs();
  await p.set({ key: PREF_KEY, value: enabled ? "1" : "0" });
}

/**
 * Запросить биометрическую аутентификацию.
 * @returns true при успехе, false при отмене/ошибке.
 */
export async function authenticateBiometric(reason: string): Promise<boolean> {
  // Замка нет — считаем проверку пройденной, иначе оболочка без плагина
  // навсегда оставила бы пользователя на экране блокировки.
  if (!isNativeApp() || !hasNativeBiometry()) return true;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "SkyForest",
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}
