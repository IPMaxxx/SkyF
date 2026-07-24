"use client";

/**
 * Окно «доступна новая версия» для нативной оболочки.
 *
 * Оболочка Capacitor открывает боевой сайт skyforest.ai, поэтому веб всегда
 * свежий, а устаревать может только нативный бинарник из стора. Живой сайт
 * знает последнюю выпущенную версию (`NEXT_PUBLIC_APP_VERSION` = version из
 * package.json, который бампится вместе с нативным релизом). Сравниваем её с
 * установленной версией оболочки (`App.getInfo().version`) и, если установлена
 * более старая, показываем окно со ссылкой в стор.
 *
 * В обычном браузере/PWA компонент ничего не рендерит.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";
import { getPlatform } from "@/lib/native/capacitor";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=ai.skyforest.app";
// Заполнить, когда iOS выйдет из TestFlight в публичный App Store
// (например "https://apps.apple.com/app/id<APPLE_ID>"). Пока null — на iOS
// окно не показываем, т.к. вести в стор некуда (обновление идёт через TestFlight).
const APP_STORE_URL: string | null = null;

const DISMISS_KEY = "sf_update_dismissed_version";
/** Показываем окно после того, как отыграет брендовый splash. */
const SHOW_DELAY_MS = 2600;

/** Сравнение semver «a.b.c»: -1 если a<b, 0 если равны, 1 если a>b. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

function storeUrl(): string | null {
  const platform = getPlatform();
  if (platform === "android") return GOOGLE_PLAY_URL;
  if (platform === "ios") return APP_STORE_URL;
  return null;
}

async function getDismissed(): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: DISMISS_KEY });
    return value ?? null;
  } catch {
    return null;
  }
}

async function setDismissed(version: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: DISMISS_KEY, value: version });
  } catch {
    /* игнорируем */
  }
}

export function UpdatePrompt() {
  const isNative = useIsNative();
  const t = useTranslations("common");
  const [installed, setInstalled] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const latest = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

  useEffect(() => {
    if (!isNative || !latest || !storeUrl()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        const current = info.version;
        if (!current || compareVersions(current, latest) >= 0) return;

        const dismissed = await getDismissed();
        if (dismissed === latest) return; // уже отложили именно эту версию

        if (cancelled) return;
        setInstalled(current);
        timer = setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, SHOW_DELAY_MS);
      } catch {
        /* плагин недоступен — не показываем */
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isNative, latest]);

  const handleUpdate = () => {
    const url = storeUrl();
    setOpen(false);
    if (!url) return;
    void (async () => {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url });
      } catch {
        window.open(url, "_blank");
      }
    })();
  };

  const handleLater = () => {
    setOpen(false);
    void setDismissed(latest);
  };

  if (!isNative || !open || !installed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("updateTitle")}
      className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#101a13] shadow-2xl">
        <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-square.png"
            alt=""
            className="h-16 w-16 rounded-2xl object-contain shadow-[0_0_40px_-10px_rgba(95,181,115,0.6)]"
          />
          <h2 className="text-lg font-semibold text-white">{t("updateTitle")}</h2>
          <p className="text-sm leading-relaxed text-white/60">
            {t("updateBody", { current: installed, latest })}
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              {t("updateNow")}
            </button>
            <button
              type="button"
              onClick={handleLater}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-colors hover:text-white/80"
            >
              {t("updateLater")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
