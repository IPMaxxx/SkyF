"use client";

import { useEffect } from "react";
import { Share, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePwaInstall } from "@/lib/pwa/PwaInstallProvider";

export function IosInstallHelpModal() {
  const t = useTranslations("pwa.iosHelp");
  const { showIosHelp, closeIosHelp } = usePwaInstall();

  useEffect(() => {
    if (!showIosHelp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeIosHelp();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showIosHelp, closeIosHelp]);

  if (!showIosHelp) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={closeIosHelp}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-[#0f1a12] p-6 text-white shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={t("close")}
          onClick={closeIosHelp}
          className="absolute right-3 top-3 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="ios-install-title" className="mb-2 text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="mb-5 text-sm text-white/70">{t("subtitle")}</p>

        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              1
            </span>
            <span className="flex-1">
              {t.rich("step1", {
                share: () => (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 align-middle">
                    <Share className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("shareLabel")}</span>
                  </span>
                ),
              })}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              2
            </span>
            <span className="flex-1">
              {t.rich("step2", {
                add: () => (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 align-middle">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("addLabel")}</span>
                  </span>
                ),
              })}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              3
            </span>
            <span className="flex-1">{t("step3")}</span>
          </li>
        </ol>

        <p className="mt-4 text-xs text-white/50">{t("hint")}</p>

        <button
          type="button"
          onClick={closeIosHelp}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {t("gotIt")}
        </button>
      </div>
    </div>
  );
}
