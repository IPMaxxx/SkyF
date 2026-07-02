"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  authenticateBiometric,
  isBiometryAvailable,
  isLockEnabled,
  setLockEnabled,
} from "@/lib/native/biometricLock";

/**
 * Настройка биометрического замка. Рендерится только в нативном приложении
 * при наличии биометрии; в браузере/PWA возвращает null (карточки нет).
 */
export function BiometricLockSetting() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    (async () => {
      const avail = await isBiometryAvailable();
      setAvailable(avail);
      if (avail) setEnabled(await isLockEnabled());
    })();
  }, []);

  if (!available) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!enabled) {
        const ok = await authenticateBiometric("Confirm to enable app lock");
        if (!ok) return;
        await setLockEnabled(true);
        setEnabled(true);
      } else {
        await setLockEnabled(false);
        setEnabled(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass mb-6 rounded-2xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Fingerprint className="h-5 w-5 text-primary" />
        App Lock
      </h2>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Require Face ID / fingerprint to open the app.
        </p>
        <button
          onClick={toggle}
          disabled={busy}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-white/20"
          } ${busy ? "opacity-60" : ""}`}
          aria-pressed={enabled}
          aria-label="Toggle app lock"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
