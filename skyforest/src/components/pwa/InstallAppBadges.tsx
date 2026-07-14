"use client";

import { useTranslations } from "next-intl";
import { usePwaInstall } from "@/lib/pwa/PwaInstallProvider";
import { useIsNative } from "@/lib/native/useIsNative";
import { AppStoreBadge } from "./AppStoreBadge";
import { GooglePlayBadge } from "./GooglePlayBadge";

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=ai.skyforest.app";
// Заполнить, когда iOS-приложение выйдет из TestFlight в публичный App Store,
// например "https://apps.apple.com/app/id<APPLE_ID>". Пока null — бейдж
// открывает инструкцию по установке веб-приложения на iPhone.
const APP_STORE_URL: string | null = null;

export function InstallAppBadges() {
  const t = useTranslations("pwa.badges");
  const { promptInstall, openIosHelp, isStandalone, platform } = usePwaInstall();
  const native = useIsNative();

  // Внутри нативного приложения бейджи сторов не показываем: приложение уже
  // установлено, а упоминание Google Play в iOS-бинарнике запрещено (2.3.10).
  if (isStandalone || native) return null;

  const handleAppStore = () => {
    if (APP_STORE_URL) {
      window.open(APP_STORE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (platform === "ios" || platform === "desktop" || platform === "other") {
      openIosHelp();
      return;
    }
    void promptInstall();
  };

  const handleGooglePlay = () => {
    window.open(GOOGLE_PLAY_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/60">{t("hint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <AppStoreBadge
          topLine={t("appStoreTop")}
          bottomLine={t("appStoreBottom")}
          onClick={handleAppStore}
          aria-label={t("appStoreAria")}
        />
        <GooglePlayBadge
          topLine={t("googlePlayTop")}
          bottomLine={t("googlePlayBottom")}
          onClick={handleGooglePlay}
          aria-label={t("googlePlayAria")}
        />
      </div>
    </div>
  );
}
