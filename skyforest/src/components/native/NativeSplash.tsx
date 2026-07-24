"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";
import { Trees } from "lucide-react";

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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[#0e1710] transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_12%,#16281c_0%,#0c150f_55%,#070d09_100%)]"
        aria-hidden="true"
      />
      <div
        className="relative flex h-28 w-28 animate-sf-float items-center justify-center rounded-[30px] border border-[rgba(120,220,150,0.3)] bg-gradient-to-br from-[#12261a] to-[#0b160f] shadow-[0_0_60px_-8px_rgba(95,181,115,0.55)]"
      >
        <Trees className="h-14 w-14 text-primary-light" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="relative text-center">
        <p className="font-heading text-[30px] font-extrabold tracking-tight text-foreground">
          SkyForest
        </p>
        <p className="mt-1 text-sm text-[#8aa090]">{t("splashTagline")}</p>
      </div>
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
