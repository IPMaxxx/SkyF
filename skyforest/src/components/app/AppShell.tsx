"use client";

import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/marketing/Footer";
import { FlavorAppFooter } from "@/components/app/FlavorAppFooter";
import { ReferralApplier } from "@/components/app/ReferralApplier";
import { NativeTabBar } from "@/components/native/NativeTabBar";
import { CheckerHeader } from "@/components/checker/CheckerHeader";
import { usePathname } from "@/i18n/navigation";
import { useIsNative } from "@/lib/native/useIsNative";
import { useAppFlavor } from "@/lib/useAppFlavor";

const CHECKER_HEADERLESS = ["/payment", "/account"];

/**
 * Layout-оболочка кабинета `(app)`.
 *
 * Ветвление web/native через `useIsNative()`:
 *  - web (default, без изменений) — видео-фон + AppHeader + Footer;
 *  - native — тот же header, но без маркетингового футера, с нижним
 *    таб-баром и отступом <main> под таб-бар и safe-area.
 *
 * До гидрации и в браузере `useIsNative()` = false, поэтому веб-версия
 * рендерится идентично прежнему layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isNative = useIsNative();
  const flavor = useAppFlavor();
  const pathname = usePathname();
  // Во флейворах футер и реферальная механика SkyForest не нужны.
  const isFlavored = flavor !== "skyforest";

  // Mushroom Checker — светлая схема: непрозрачный холст вместо видео/фото
  // с блюром, своя шапка и никакого таб-бара (экран один).
  if (flavor === "checker") {
    // Пейволл и аккаунт по дизайну — «вложенные» экраны со своим крестиком
    // или стрелкой назад, шапка там дублировала бы навигацию.
    const withHeader = !CHECKER_HEADERLESS.some((p) => pathname.startsWith(p));
    return (
      <div
        className="flex min-h-screen flex-col bg-ck-canvas"
        style={
          withHeader
            ? ({
                // Высота шапки: 8px + 38px кнопка + 6px = 52px.
                "--ck-chrome": "calc(52px + env(safe-area-inset-top))",
                "--ck-safe-top": "0px",
              } as React.CSSProperties)
            : undefined
        }
      >
        {withHeader && <CheckerHeader />}
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  // WayBack — светлая схема «Widget Board»: холст без фонового изображения
  // (важно для читаемости на солнце и для батареи), общей шапки нет —
  // каждый экран рисует свою верхнюю панель, они слишком разные.
  if (flavor === "wayback") {
    return (
      <div className="flex min-h-screen flex-col bg-wb-canvas">
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Фон: на вебе — видео-анимация (как раньше), в native — статичное
          фото леса (легче для батареи/памяти WebView). Оверлеи одинаковые,
          чтобы читаемость контента не менялась. */}
      <div className="fixed inset-0 -z-10">
        {isNative ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/app-bg-forest.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/images/background.mp4" type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div
          className={
            isNative
              ? "absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(22,40,28,0.45)_0%,rgba(11,18,13,0.92)_55%,rgba(7,10,8,0.96)_100%)]"
              : "absolute inset-0 bg-gradient-to-b from-[#0a1f0f]/40 via-transparent to-[#0a1f0f]/60"
          }
        />
      </div>

      <AppHeader />
      {!isFlavored && <ReferralApplier />}

      <main
        id="main-content"
        className={
          isNative
            ? "flex-1 pt-[env(safe-area-inset-top)] pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
            : "flex-1"
        }
        tabIndex={-1}
      >
        {children}
      </main>

      {isNative ? <NativeTabBar /> : isFlavored ? <FlavorAppFooter /> : <Footer />}
    </div>
  );
}
