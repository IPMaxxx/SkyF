"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePwaInstall } from "@/lib/pwa/PwaInstallProvider";

const STORAGE_KEY = "sf-pwa-banner-dismissed-at";
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 7;
const APPEAR_DELAY_MS = 4000;

export function MobileInstallBanner() {
  const t = useTranslations("pwa.banner");
  const {
    isMobile,
    isStandalone,
    canInstallNow,
    isIosSafari,
    promptInstall,
    openIosHelp,
    platform,
  } = usePwaInstall();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone) return;
    if (!isMobile) return;

    const canShow = canInstallNow || isIosSafari;
    if (!canShow) return;

    let dismissedAt = 0;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      dismissedAt = raw ? Number(raw) || 0 : 0;
    } catch {
      dismissedAt = 0;
    }
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return;

    const id = window.setTimeout(() => setOpen(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [isStandalone, isMobile, canInstallNow, isIosSafari]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore quota / private mode */
    }
    setOpen(false);
  };

  const handleInstall = async () => {
    if (isIosSafari || (platform === "ios" && !canInstallNow)) {
      openIosHelp();
      setOpen(false);
      return;
    }
    const result = await promptInstall();
    if (result === "accepted" || result === "dismissed") {
      setOpen(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="pwa-banner-title"
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:hidden"
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0f1a12]/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <Image
            src="/images/logo-square.png"
            alt="SkyForest"
            width={48}
            height={48}
            className="h-12 w-12 flex-shrink-0 rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                id="pwa-banner-title"
                className="text-sm font-semibold text-white"
              >
                {t("title")}
              </h3>
              <button
                type="button"
                aria-label={t("close")}
                onClick={dismiss}
                className="-mr-1 -mt-1 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-white/70">{t("subtitle")}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("install")}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                {t("later")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
