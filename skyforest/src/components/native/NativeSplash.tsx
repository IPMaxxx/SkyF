"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";

/**
 * Брендовый сплэш поверх приложения при холодном запуске в нативной оболочке.
 *
 * Нативный сплэш Capacitor (до загрузки WebView) — «вшитая» картинка с логотипом
 * без подписи. Этот оверлей продолжает тот же тёмно-зелёный экран уже внутри
 * WebView, добавляя под логотип подпись, и плавно скрывается. В вебе/PWA не
 * рендерится (useIsNative до гидрации и в браузере даёт false).
 *
 * Показывается один раз за запуск: locale-layout переживает клиентскую
 * навигацию, поэтому модульный флаг не даёт оверлею всплывать при переходах.
 */
let shownOnce = false;

const VISIBLE_MS = 1500;
const FADE_MS = 500;

export function NativeSplash() {
  const isNative = useIsNative();
  const t = useTranslations("common");
  const [gone, setGone] = useState(shownOnce);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isNative || shownOnce) return;
    shownOnce = true;
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const goneTimer = setTimeout(() => setGone(true), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, [isNative]);

  if (!isNative || gone) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[#0f1a12] transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <Image
        src="/images/logo-square.png"
        alt=""
        width={128}
        height={128}
        priority
        className="h-28 w-28 rounded-2xl"
      />
      <p className="text-sm font-medium tracking-wide text-white/55">{t("splashTagline")}</p>
    </div>
  );
}
