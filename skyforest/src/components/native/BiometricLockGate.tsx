"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Fingerprint } from "lucide-react";
import { isNativeApp } from "@/lib/native/capacitor";
import { authenticateBiometric, isLockEnabled } from "@/lib/native/biometricLock";

export function BiometricLockGate() {
  const t = useTranslations("account.biometric");
  const [locked, setLocked] = useState(false);
  const [authing, setAuthing] = useState(false);
  const enabledRef = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (authing) return;
    setAuthing(true);
    const ok = await authenticateBiometric("Unlock SkyForest");
    setAuthing(false);
    if (ok) setLocked(false);
  }, [authing]);

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const enabled = await isLockEnabled();
      enabledRef.current = enabled;
      if (!enabled) return;
      setLocked(true);
      void tryUnlock();

      const { App } = await import("@capacitor/app");
      const sub = await App.addListener("appStateChange", ({ isActive }) => {
        if (disposed || !enabledRef.current) return;
        if (!isActive) {
          setLocked(true);
        } else {
          setLocked((cur) => {
            if (cur) void tryUnlock();
            return cur;
          });
        }
      });
      cleanups.push(() => void sub.remove());
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center gap-6 bg-[#081009] px-6 text-center text-foreground"
    >
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_40%,#0f2418_0%,#081009_70%)]" aria-hidden="true" />
      <div className="relative flex h-[120px] w-[120px] items-center justify-center">
        <div className="absolute inset-0 animate-sf-pulse-dot rounded-full border border-primary/30" aria-hidden="true" />
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] border border-[rgba(120,220,150,0.3)] bg-gradient-to-br from-[#12261a] to-[#0b160f]">
          <Fingerprint className="h-11 w-11 text-primary-light" strokeWidth={1.5} aria-hidden="true" />
        </div>
      </div>
      <div className="relative max-w-[280px]">
        <p className="font-heading text-[23px] font-extrabold tracking-tight">{t("lockTitle")}</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#8aa090]">{t("lockBody")}</p>
      </div>
      <button
        type="button"
        onClick={() => void tryUnlock()}
        disabled={authing}
        className="relative mt-2 rounded-[14px] border border-white/15 bg-white/[0.05] px-6 py-3 text-[14px] font-bold text-foreground/90 disabled:opacity-60"
      >
        {authing ? t("authenticating") : t("unlock")}
      </button>
    </div>
  );
}
