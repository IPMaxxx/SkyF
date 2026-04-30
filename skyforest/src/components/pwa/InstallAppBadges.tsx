"use client";

import { useTranslations } from "next-intl";
import { usePwaInstall } from "@/lib/pwa/PwaInstallProvider";
import { AppStoreBadge } from "./AppStoreBadge";
import { GooglePlayBadge } from "./GooglePlayBadge";

export function InstallAppBadges() {
  const t = useTranslations("pwa.badges");
  const { promptInstall, openIosHelp, isStandalone, platform } = usePwaInstall();

  if (isStandalone) return null;

  const handleAppStore = () => {
    if (platform === "ios" || platform === "desktop" || platform === "other") {
      openIosHelp();
      return;
    }
    void promptInstall();
  };

  const handleGooglePlay = () => {
    void promptInstall();
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
