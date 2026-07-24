"use client";

/**
 * Единый брендовый splash для нативной оболочки.
 *
 * Плавная последовательность запуска без морганий:
 *  1. Нативный splash (Capacitor) — тот же логотип на тёмном фоне — висит с
 *     холодного старта и не прячется автоматически (launchAutoHide: false),
 *     перекрывая загрузку боевого сайта.
 *  2. Когда этот оверлей отрисовал логотип, мы прячем нативный splash с
 *     затуханием — переход бесшовный (одинаковый логотип и фон, без «белой»
 *     вспышки пустого WebView).
 *  3. Оверлей держится ещё немного (пока идёт редирект на /dashboard или
 *     /login) и плавно затухает, открывая готовый экран.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";

let shownOnce = false;

const VISIBLE_MS = 1300;
const FADE_MS = 500;
/** Подстраховка: продолжаем, даже если логотип не загрузился (нет сети/кеша). */
const SAFETY_MS = 3000;

export function NativeSplash() {
  const isNative = useIsNative();
  const t = useTranslations("common");
  const [gone, setGone] = useState(shownOnce);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isNative || shownOnce) return;
    shownOnce = true;
    const safety = setTimeout(() => setReady(true), SAFETY_MS);
    return () => clearTimeout(safety);
  }, [isNative]);

  // Как только логотип отрисован — прячем нативный splash и запускаем таймеры
  // затухания брендового оверлея.
  useEffect(() => {
    if (!ready) return;
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {});
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const goneTimer = setTimeout(() => setGone(true), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, [ready]);

  if (!isNative || gone) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#0e1710] transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_12%,#16281c_0%,#0c150f_55%,#070d09_100%)]"
        aria-hidden="true"
      />
      {/* Тот же логотип, что и в нативном splash — бесшовный переход. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-square.png"
        alt=""
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
        className="relative h-40 w-40 animate-sf-float rounded-[28px] object-contain shadow-[0_0_60px_-8px_rgba(95,181,115,0.5)]"
      />
      <p className="relative -mt-1 text-base font-medium text-[#8aa090]">{t("splashTagline")}</p>
      <div className="absolute bottom-11 flex gap-1.5" aria-hidden="true">
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-sf-pulse-dot rounded-full bg-primary-light"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}
