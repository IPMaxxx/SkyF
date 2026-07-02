"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isNativeApp } from "@/lib/native/capacitor";
import { authenticateBiometric, isLockEnabled } from "@/lib/native/biometricLock";

/**
 * Полноэкранный биометрический замок. Показывается поверх приложения, если
 * пользователь включил замок: при запуске и при возврате из фона.
 * В браузере/PWA не рендерится.
 */
export function BiometricLockGate() {
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "#0f1a12",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        color: "#e8f0ea",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600 }}>SkyForest</div>
      <p style={{ opacity: 0.7, maxWidth: 280 }}>Unlock the app to continue.</p>
      <button
        onClick={() => void tryUnlock()}
        disabled={authing}
        style={{
          background: "#62a863",
          color: "#0f1a12",
          border: "none",
          borderRadius: 12,
          padding: "12px 24px",
          fontSize: 16,
          fontWeight: 600,
          opacity: authing ? 0.6 : 1,
        }}
      >
        {authing ? "Authenticating…" : "Unlock"}
      </button>
    </div>
  );
}
