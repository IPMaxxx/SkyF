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

async function prefs() {
  const { Preferences } = await import("@capacitor/preferences");
  return Preferences;
}

/** Доступна ли биометрия на устройстве. */
export async function isBiometryAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
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
  if (!isNativeApp()) return true;
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
