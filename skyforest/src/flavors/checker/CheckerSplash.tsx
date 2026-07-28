"use client";

/**
 * Экран 01 дизайна: splash Mushroom Checker в нативной оболочке.
 *
 * Светлая схема: зелёный→canvas градиент, плитка логотипа 104px, три
 * пульсирующие точки и моно-подпись внизу. Тайминги и скрытие нативного
 * splash — в общем хуке useSplashSequence.
 */

import { useTranslations } from "next-intl";
import { FLAVORS } from "@/lib/appFlavor";
import { useIsNative } from "@/lib/native/useIsNative";
import { useSplashSequence } from "@/lib/native/useSplashSequence";

const DOTS = ["#3F9C58", "#9ECFA9", "#CFE4D3"];

export function CheckerSplash() {
  const isNative = useIsNative();
  const t = useTranslations("flavor.checker");
  const { visible, fading, fadeMs, markReady } = useSplashSequence(isNative);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="font-ck fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[linear-gradient(180deg,#E7F4E9_0%,#F3F7F1_100%)] transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${fadeMs}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FLAVORS.checker.logoPath}
        alt=""
        onLoad={markReady}
        onError={markReady}
        className="animate-sf-float rounded-[32px] object-cover shadow-[0_22px_40px_-18px_rgba(63,156,88,0.8)]"
        style={{ height: 104, width: 104 }}
      />
      <div className="flex flex-col items-center gap-2">
        <p className="text-[21px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {FLAVORS.checker.name}
        </p>
        <p className="text-[13.5px] font-medium text-ck-body-soft">
          {t("tagline")}
        </p>
      </div>
      <div className="flex gap-1.5">
        {DOTS.map((color, i) => (
          <span
            key={color}
            className="h-[7px] w-[7px] animate-sf-pulse-dot rounded-full"
            style={{ background: color, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="ck-mono absolute bottom-10 text-[10px] tracking-[0.14em] text-ck-muted-2">
        BY SKYFOREST
      </p>
    </div>
  );
}
