"use client";

import { useEffect, useState } from "react";

/**
 * Тайминги брендового splash нативной оболочки — общие для всех приложений,
 * разметка у каждого своя (см. NativeSplash и flavors/checker/CheckerSplash).
 *
 * Последовательность запуска без морганий:
 *  1. Нативный splash Capacitor висит с холодного старта (launchAutoHide:
 *     false) и перекрывает загрузку сайта.
 *  2. Как только оверлей отрисовал логотип (`markReady`), нативный splash
 *     прячется с затуханием — переход бесшовный.
 *  3. Оверлей держится ещё VISIBLE_MS (идёт редирект на домашнюю или /login)
 *     и плавно затухает.
 *
 * ВАЖНО: `SplashScreen.hide()` вызывается только здесь. Экран, на котором не
 * смонтирован ни один splash-оверлей, оставит нативное приложение висеть на
 * splash навсегда.
 */

/** Оверлей показывается один раз за жизнь WebView, а не на каждой навигации. */
let shownOnce = false;

const VISIBLE_MS = 1300;
export const SPLASH_FADE_MS = 500;
/** Подстраховка: продолжаем, даже если логотип не загрузился (нет сети/кеша). */
const SAFETY_MS = 3000;

export function useSplashSequence(active: boolean) {
  const [gone, setGone] = useState(shownOnce);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!active || shownOnce) return;
    shownOnce = true;
    const safety = setTimeout(() => setReady(true), SAFETY_MS);
    return () => clearTimeout(safety);
  }, [active]);

  useEffect(() => {
    if (!ready) return;
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {});
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const goneTimer = setTimeout(() => setGone(true), VISIBLE_MS + SPLASH_FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, [ready]);

  return {
    visible: active && !gone,
    fading,
    fadeMs: SPLASH_FADE_MS,
    /** Вызывать из onLoad/onError логотипа. */
    markReady: () => setReady(true),
  };
}
