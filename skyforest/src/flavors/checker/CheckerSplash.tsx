"use client";

/**
 * Экран 01 дизайна: splash Mushroom Checker в нативной оболочке.
 *
 * Зелёный→canvas градиент (`ck-grad-splash` берёт цвета выбранной темы),
 * плитка логотипа 104px, три пульсирующие точки и моно-подпись внизу.
 * Тайминги и скрытие нативного splash — в общем хуке useSplashSequence.
 *
 * Оверлей рисуется поверх нативного splash из бинарника. Пока тот собран
 * светлым, у пользователя с тёмной темой между ними виден стык — лечится
 * только пересборкой оболочки (см. apps/mushroom-checker/capacitor.config.ts).
 */

import { useTranslations } from "next-intl";
import { FLAVORS } from "@/lib/appFlavor";
import { useIsNative } from "@/lib/native/useIsNative";
import { useSplashSequence } from "@/lib/native/useSplashSequence";

/* Три точки, растворяющиеся в холсте. Доли акцента, а не готовые цвета: на
   тёмной схеме фиксированное осветление дало бы обратный эффект — точки
   становились бы ярче, а не тише. */
const DOT_STRENGTHS = [100, 62, 34];

export function CheckerSplash() {
  const isNative = useIsNative();
  const t = useTranslations("flavor.checker");
  const { visible, fading, fadeMs, markReady } = useSplashSequence(isNative);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="ck-grad-splash font-ck fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${fadeMs}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FLAVORS.checker.logoPath}
        alt=""
        onLoad={markReady}
        onError={markReady}
        className="animate-sf-float rounded-[32px] object-cover shadow-[0_22px_40px_-18px_var(--ck-glow)]"
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
        {DOT_STRENGTHS.map((strength, i) => (
          <span
            key={strength}
            className="h-[7px] w-[7px] animate-sf-pulse-dot rounded-full"
            style={{
              background: `color-mix(in oklab, var(--ck-primary) ${strength}%, var(--ck-canvas))`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <p className="ck-mono absolute bottom-10 text-[10px] tracking-[0.14em] text-ck-muted-2">
        BY SKYFOREST
      </p>
    </div>
  );
}
