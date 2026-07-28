"use client";

/**
 * Внешние ссылки панели «Ещё» в Mushroom Checker.
 *
 * В нативной оболочке открываем системный браузер (@capacitor/browser) — так
 * пользователь остаётся в приложении и возвращается кнопкой «Готово», а не
 * уходит в WebView без навигации. Раньше юридические документы открывались
 * прямо в WebView, и с них не было выхода: `/offer` и `/privacy` — общие
 * страницы SkyForest, шапки и кнопки «назад» Checker там нет.
 */

import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPlatform, isNativeApp } from "@/lib/native/capacitor";

/** Другие приложения SkyForest. Состояние в сторах проверено 28.07.2026. */
export const SKYFOREST_SITE = "https://skyforest.ai";
export const SKYFOREST_APP_STORE =
  "https://apps.apple.com/us/app/skyforest-ai-mushroom-app/id6786255697";
export const SKYFOREST_GOOGLE_PLAY =
  "https://play.google.com/store/apps/details?id=ai.skyforest.app";
/**
 * У WayBack записи в сторах ещё не опубликованы (App Store Connect —
 * PREPARE_FOR_SUBMISSION, страницы Google Play нет), поэтому на всех
 * платформах ведём на сайт продукта.
 */
export const WAYBACK_SITE = "https://wayback.skyforest.ai";

/** Поддержка Checker: приложение международное, домен .ai (SAMPLIFY FZCO). */
export const CHECKER_SUPPORT_EMAIL = "support@skyforest.ai";

/**
 * Куда вести на SkyForest: в нативном приложении — в магазин своей платформы
 * (на iOS упоминать Google Play нельзя, guideline 2.3.10), в вебе — на сайт.
 */
export function skyforestLink(): string {
  if (!isNativeApp()) return SKYFOREST_SITE;
  const platform = getPlatform();
  if (platform === "ios") return SKYFOREST_APP_STORE;
  if (platform === "android") return SKYFOREST_GOOGLE_PLAY;
  return SKYFOREST_SITE;
}

/** Открыть ссылку вне приложения: системный браузер в нативе, вкладка в вебе. */
export async function openExternal(url: string): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch {
      /* плагин недоступен — открываем обычным способом */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Юридический документ (`/offer`, `/privacy`) — общая страница SkyForest:
 * разметки Checker и кнопки «назад» там нет, поэтому открываем её снаружи.
 */
export function openCheckerDoc(href: "/offer" | "/privacy", locale: string) {
  void openExternal(
    `${window.location.origin}${getPathname({ href, locale: locale as Locale })}`,
  );
}
