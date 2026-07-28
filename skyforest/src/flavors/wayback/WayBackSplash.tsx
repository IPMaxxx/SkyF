"use client";

/**
 * Splash WayBack в нативной оболочке.
 *
 * Тёмная схема: холст #0b120d — тот же цвет, что у нативного splash в
 * apps/wayback/capacitor.config.ts, иначе на запуске мелькает стык. Плитка
 * логотипа 104px с радиусом 26 (как у остальных плиток), моно-подпись внизу.
 * Тайминги и скрытие нативного splash — в общем хуке useSplashSequence.
 *
 * Компонент обязателен в layout дерева `wb/*`: `SplashScreen.hide()`
 * вызывается только отсюда, и без него нативное приложение навсегда
 * останется на стартовом экране (см. .cursor/rules/flavors.mdc).
 */

import { useTranslations } from "next-intl";
import { FLAVORS } from "@/lib/appFlavor";
import { useIsNative } from "@/lib/native/useIsNative";
import { useSplashSequence } from "@/lib/native/useSplashSequence";

const DOTS = ["#5fb573", "#7fd48f", "#9ee0aa"];

export function WayBackSplash() {
  const isNative = useIsNative();
  const t = useTranslations("wayback.splash");
  const { visible, fading, fadeMs, markReady } = useSplashSequence(isNative);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-wb-canvas transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${fadeMs}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FLAVORS.wayback.logoPath}
        alt=""
        onLoad={markReady}
        onError={markReady}
        className="animate-sf-float rounded-[26px] object-cover shadow-[0_22px_40px_-18px_rgba(95,181,115,0.5)]"
        style={{ height: 104, width: 104 }}
      />
      <div className="flex flex-col items-center gap-2 px-8 text-center">
        <p className="text-[21px] font-extrabold tracking-[-0.02em] text-wb-ink">
          {FLAVORS.wayback.name}
        </p>
        <p className="text-[13.5px] font-medium leading-[1.45] text-wb-body">
          {t("tagline")}
        </p>
      </div>
      <div className="flex gap-1.5">
        {DOTS.map((color, i) => (
          <span
            key={color}
            className="animate-sf-pulse-dot h-[7px] w-[7px] rounded-full"
            style={{ background: color, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="wb-mono absolute bottom-10 text-[10px] tracking-[0.14em] text-wb-muted-2">
        {t("footer")}
      </p>
    </div>
  );
}
