"use client";

/**
 * Брендовый splash нативной оболочки SkyForest и WayBack.
 *
 * Тайминги и скрытие нативного splash Capacitor — в useSplashSequence.
 * У Mushroom Checker светлая схема и своя разметка: он монтирует
 * flavors/checker/CheckerSplash из своего layout (src/app/[locale]/ck).
 */

import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";
import { useSplashSequence } from "@/lib/native/useSplashSequence";
import { useFlavorBrand } from "@/lib/useFlavorBrand";

export function NativeSplash() {
  const isNative = useIsNative();
  const t = useTranslations("common");
  // Логотип и тег-лайн своего приложения, чтобы флейвор не открывался
  // «чужим» брендом SkyForest.
  const brand = useFlavorBrand();
  const { visible, fading, fadeMs, markReady } = useSplashSequence(isNative);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#0e1710] transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${fadeMs}ms` }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_12%,#16281c_0%,#0c150f_55%,#070d09_100%)]"
        aria-hidden="true"
      />
      {/* Тот же логотип, что и в нативном splash — бесшовный переход. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logoPath}
        alt=""
        onLoad={markReady}
        onError={markReady}
        className="relative h-40 w-40 animate-sf-float rounded-[28px] object-contain shadow-[0_0_60px_-8px_rgba(95,181,115,0.5)]"
      />
      {brand.isFlavored && (
        <p className="relative -mt-2 font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {brand.name}
        </p>
      )}
      <p className="relative -mt-1 text-base font-medium text-[#8aa090]">
        {brand.isFlavored ? brand.text("tagline") : t("splashTagline")}
      </p>
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
