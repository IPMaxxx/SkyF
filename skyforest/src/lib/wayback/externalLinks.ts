"use client";

/**
 * Ссылки на соседние приложения из панели «Ещё» WayBack.
 *
 * В нативной оболочке открываем системный браузер (@capacitor/browser — он уже
 * собран в бинарнике WayBack, см. apps/wayback/package.json). Если открыть
 * такую ссылку прямо в WebView, приложение подменится чужим сайтом, и выйти
 * оттуда будет нечем: шапки и кнопки «назад» у WayBack нет.
 */

import { getPlatform, isNativeApp } from "@/lib/native/capacitor";

/** Состояние в сторах проверено 28.07.2026. */
export const SKYFOREST_SITE = "https://skyforest.ai";
export const SKYFOREST_APP_STORE =
  "https://apps.apple.com/us/app/skyforest-ai-mushroom-app/id6786255697";
export const SKYFOREST_GOOGLE_PLAY =
  "https://play.google.com/store/apps/details?id=ai.skyforest.app";

/**
 * У Mushroom Checker записи в сторах ещё не опубликованы (в проекте нет ни
 * номера в App Store, ни страницы Google Play), поэтому на всех платформах
 * ведём на сайт продукта. Как только записи выйдут, здесь появятся ссылки на
 * магазины — по той же схеме, что у SkyForest ниже.
 */
export const CHECKER_SITE = "https://checker.skyforest.ai";

/**
 * Куда вести на SkyForest: в нативном приложении — в магазин своей платформы
 * (Apple спокойно относится к ссылкам на свои же приложения в App Store, но
 * упоминать Google Play на iOS нельзя — guideline 2.3.10), в вебе — на сайт.
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
