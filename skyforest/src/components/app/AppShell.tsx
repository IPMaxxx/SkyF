"use client";

import { AppHeader } from "@/components/app/AppHeader";
import { Footer } from "@/components/marketing/Footer";
import { ReferralApplier } from "@/components/app/ReferralApplier";
import { NativeTabBar } from "@/components/native/NativeTabBar";
import { useIsNative } from "@/lib/native/useIsNative";

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

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Video background */}
      <div className="fixed inset-0 -z-10">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/images/background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1f0f]/40 via-transparent to-[#0a1f0f]/60" />
      </div>

      <AppHeader />
      <ReferralApplier />

      <main
        id="main-content"
        className={
          isNative
            ? "flex-1 pt-[env(safe-area-inset-top)] pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
            : "flex-1"
        }
        tabIndex={-1}
      >
        {children}
      </main>

      {isNative ? <NativeTabBar /> : <Footer />}
    </div>
  );
}
