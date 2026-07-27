"use client";

/**
 * «Мой аккаунт» WayBack.
 *
 * Из общего аккаунта SkyForest остаются только профиль, подписка,
 * безопасность и удаление: токенов, рефералов и маркетплейса во флейворе нет.
 *
 * Отдельная плитка «Walks on this device» существует потому, что история
 * WayBack по умолчанию локальная. Пользователь должен видеть перед удалением
 * аккаунта, что походы с телефона никуда не денутся — иначе удаление читается
 * как потеря всех треков.
 */

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp, storeName } from "@/lib/native/capacitor";
import {
  authenticateBiometric,
  isBiometryAvailable,
  isLockEnabled,
  setLockEnabled,
} from "@/lib/native/biometricLock";
import { countLocalTracks } from "@/lib/trackHistory";
import {
  formatWaybackDate,
  initialsFrom,
  useWaybackAccount,
} from "@/lib/wayback/useWaybackAccount";
import {
  WbDangerButton,
  WbDangerSoftButton,
  WbField,
  WbInput,
  WbLabel,
  WbModal,
  WbPrimaryButton,
  WbQuietButton,
  WbRowTile,
  WbScreen,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

type Sheet = "password" | "twofa" | "delete" | null;

export function WayBackAccount({
  email,
  initialName,
}: {
  email: string;
  initialName: string | null;
}) {
  const t = useTranslations("wayback.account");
  const td = useTranslations("wayback.deleteAccount");
  const tp = useTranslations("wayback.paywall");
  const locale = useLocale();
  const router = useRouter();
  const { subscription } = useWaybackAccount();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [twoFa, setTwoFa] = useState(false);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [localCount, setLocalCount] = useState<number | null>(null);

  const native = isNativeApp();
  const store = native
    ? storeName()
    : `${tp("storeApple")} / ${tp("storeGoogle")}`;
  const lockMethod = t("biometry");

  const refreshTwoFa = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setTwoFa(Boolean(data?.totp?.some((f) => f.status === "verified")));
  }, []);

  useEffect(() => {
    void refreshTwoFa();
  }, [refreshTwoFa]);

  useEffect(() => {
    if (!isNativeApp()) return;
    (async () => {
      const avail = await isBiometryAvailable();
      setLockAvailable(avail);
      if (avail) setLockEnabledState(await isLockEnabled());
    })();
  }, []);

  useEffect(() => {
    setLocalCount(countLocalTracks());
  }, []);

  const toggleLock = async (next: boolean) => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      if (next) {
        const ok = await authenticateBiometric(
          t("appLock", { method: lockMethod }),
        );
        if (!ok) return;
        await setLockEnabled(true);
        setLockEnabledState(true);
      } else {
        await setLockEnabled(false);
        setLockEnabledState(false);
      }
    } finally {
      setLockBusy(false);
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/track");
    router.refresh();
  };

  return (
    <WbScreen
      bottom={
        <WbQuietButton onClick={logout}>{t("logout")}</WbQuietButton>
      }
    >
      <WbTopBar title={t("title")} onBack={() => router.back()} />

      <div className="flex flex-col gap-2.5">
        <WbTile className="flex items-center gap-3.5 px-5 py-[18px]">
          <span className="wb-mono flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-wb-primary-tint text-[15px] font-bold text-wb-primary">
            {initialsFrom(email, initialName)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {initialName && (
              <span className="truncate text-[16px] font-extrabold text-wb-ink">
                {initialName}
              </span>
            )}
            <span className="truncate text-[13.5px] font-medium text-wb-muted">
              {email}
            </span>
          </div>
        </WbTile>

        {subscription ? (
          <WbTile
            tone="tint"
            className="flex items-center justify-between gap-3 px-5 py-[18px]"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-extrabold text-wb-primary-deep">
                {t("premiumActive")}
              </span>
              <span className="wb-mono text-[12px] text-wb-muted">
                {t("premiumUntil", {
                  date: formatWaybackDate(
                    subscription.current_period_end,
                    locale,
                  ),
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/payment")}
              className="flex-none text-[13px] font-extrabold text-wb-primary"
            >
              {t("manage")}
            </button>
          </WbTile>
        ) : (
          <WbTile className="flex items-center justify-between gap-3 px-5 py-[18px]">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-extrabold text-wb-ink">
                {t("noSubscription")}
              </span>
              <span className="text-[12.5px] font-medium text-wb-muted">
                {t("noSubscriptionHint")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/payment")}
              className="flex-none text-[13px] font-extrabold text-wb-primary"
            >
              {t("subscribe")}
            </button>
          </WbTile>
        )}

        <WbRowTile
          label={t("password")}
          sublabel={t("passwordNever")}
          value={t("change")}
          onClick={() => setSheet("password")}
        />
        <WbRowTile
          label={t("twoFactor")}
          sublabel={twoFa ? t("twoFactorOn") : t("twoFactorOff")}
          value={twoFa ? t("change") : t("setUp")}
          onClick={() => setSheet("twofa")}
        />

        {lockAvailable && (
          <WbTile className="flex items-center justify-between gap-3 px-5 py-[18px]">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[16px] font-bold text-wb-ink">
                {t("appLock", { method: lockMethod })}
              </span>
              <span className="text-[12.5px] font-medium text-wb-muted">
                {t("appLockBody", { method: lockMethod })}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={lockEnabled}
              aria-label={t("appLock", { method: lockMethod })}
              disabled={lockBusy}
              onClick={() => toggleLock(!lockEnabled)}
              className={`relative h-[30px] w-[52px] flex-none rounded-full transition-colors disabled:opacity-50 ${
                lockEnabled ? "bg-wb-primary" : "bg-wb-border"
              }`}
            >
              <span
                className={`absolute top-[3px] h-6 w-6 rounded-full bg-white transition-all ${
                  lockEnabled ? "left-[25px]" : "left-[3px]"
                }`}
              />
            </button>
          </WbTile>
        )}

        {/* Локальная история не удаляется вместе с аккаунтом — говорим заранее. */}
        <WbTile tone="quiet" className="flex flex-col gap-1.5 px-5 py-[18px]">
          <WbLabel>{t("localTitle")}</WbLabel>
          <span className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
            {localCount ? t("localBody", { count: localCount }) : t("localNone")}
          </span>
        </WbTile>

        <WbDangerSoftButton onClick={() => setSheet("delete")}>
          {t("deleteAccount")}
        </WbDangerSoftButton>
      </div>

      <PasswordSheet
        open={sheet === "password"}
        onClose={() => setSheet(null)}
      />
      <TwoFactorSheet
        open={sheet === "twofa"}
        enabled={twoFa}
        onClose={() => setSheet(null)}
        onChanged={refreshTwoFa}
      />
      <DeleteSheet
        open={sheet === "delete"}
        email={email}
        store={store}
        onClose={() => setSheet(null)}
        onScheduled={logout}
      />
    </WbScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Смена пароля                                                        */
/* ------------------------------------------------------------------ */

function PasswordSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("wayback.account");
  const ta = useTranslations("wayback.auth");
  const tp = useTranslations("account.pw");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setRepeat("");
      setError("");
      setDone(false);
    }
  }, [open]);

  const save = async () => {
    if (password.length < 6) {
      setError(tp("minChars"));
      return;
    }
    if (password !== repeat) {
      setError(tp("mismatch"));
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  return (
    <WbModal open={open} onClose={onClose} label={t("close")}>
      <div className="flex flex-col gap-3">
        <span className="text-[20px] font-extrabold tracking-[-0.02em] text-wb-ink">
          {t("password")}
        </span>
        {done ? (
          <span className="flex items-center gap-2 text-[14.5px] font-bold text-wb-primary">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            {tp("changed")}
          </span>
        ) : (
          <>
            <WbField label={ta("newPassword")}>
              <WbInput
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={ta("passwordHint")}
              />
            </WbField>
            <WbInput
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder={tp("confirmPlaceholder")}
            />
            {error && (
              <span className="text-[13px] font-bold text-wb-danger">
                {error}
              </span>
            )}
            <WbPrimaryButton onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {ta("savePassword")}
            </WbPrimaryButton>
          </>
        )}
      </div>
    </WbModal>
  );
}

/* ------------------------------------------------------------------ */
/* Двухфакторная аутентификация                                        */
/* ------------------------------------------------------------------ */

function TwoFactorSheet({
  open,
  enabled,
  onClose,
  onChanged,
}: {
  open: boolean;
  enabled: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("wayback.account");
  const t2 = useTranslations("account.twoFa");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQr(null);
      setSecret(null);
      setFactorId(null);
      setCode("");
      setError("");
    }
  }, [open]);

  const enroll = async () => {
    setBusy(true);
    setError("");
    const supabase = createClient();

    // Незавершённые попытки блокируют новый enroll — снимаем их.
    const existing = (await supabase.auth.mfa.listFactors()).data?.totp ?? [];
    for (const f of existing) {
      if ((f.status as string) === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "WayBack",
    });
    setBusy(false);
    if (enrollError || !data) {
      setError(enrollError?.message || t2("enableError"));
      return;
    }
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const confirm = async () => {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setBusy(false);
      setError(t2("verifyError"));
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError(t2("wrongCode"));
      setCode("");
      return;
    }
    await onChanged();
    onClose();
  };

  const disable = async () => {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const factors = (await supabase.auth.mfa.listFactors()).data?.totp ?? [];
    for (const f of factors) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    setBusy(false);
    await onChanged();
    onClose();
  };

  return (
    <WbModal open={open} onClose={onClose} label={t("close")}>
      <div className="flex flex-col gap-3">
        <span className="text-[20px] font-extrabold tracking-[-0.02em] text-wb-ink">
          {t("twoFactor")}
        </span>

        {enabled ? (
          <>
            <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
              {t2("protectedHint")}
            </p>
            <WbDangerButton onClick={disable} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t2("disable")}
            </WbDangerButton>
          </>
        ) : qr ? (
          <>
            <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
              {t2("scanQr")}
            </p>
            <Image
              src={qr}
              alt={t2("qrAlt")}
              width={180}
              height={180}
              unoptimized
              className="mx-auto rounded-[18px] bg-white p-2"
            />
            {secret && (
              <div className="flex flex-col gap-1">
                <WbLabel>{t2("manualKey")}</WbLabel>
                <span className="wb-mono rounded-[16px] bg-wb-surface-2 px-4 py-3 text-[12px] break-all text-wb-ink-2">
                  {secret}
                </span>
              </div>
            )}
            <WbInput
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder={t2("enterCode")}
              className="text-center tracking-[0.4em]"
            />
            {error && (
              <span className="text-[13px] font-bold text-wb-danger">
                {error}
              </span>
            )}
            <WbPrimaryButton
              onClick={confirm}
              disabled={busy || code.length !== 6}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t2("enable")}
            </WbPrimaryButton>
          </>
        ) : (
          <>
            <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
              {t2("addHint")} {t2("appsHint")}
            </p>
            {error && (
              <span className="text-[13px] font-bold text-wb-danger">
                {error}
              </span>
            )}
            <WbPrimaryButton onClick={enroll} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t2("enable")}
            </WbPrimaryButton>
          </>
        )}
      </div>
    </WbModal>
  );
}

/* ------------------------------------------------------------------ */
/* Удаление аккаунта                                                   */
/* ------------------------------------------------------------------ */

function DeleteSheet({
  open,
  email,
  store,
  onClose,
  onScheduled,
}: {
  open: boolean;
  email: string;
  store: string;
  onClose: () => void;
  onScheduled: () => Promise<void>;
}) {
  const t = useTranslations("wayback.deleteAccount");
  const ta = useTranslations("wayback.account");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirm("");
      setError("");
    }
  }, [open]);

  const submit = async () => {
    if (confirm.trim().toLowerCase() !== email.toLowerCase()) {
      setError(t("mismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_email: confirm.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("failed"));
        return;
      }
      await onScheduled();
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WbModal open={open} onClose={onClose} label={ta("close")}>
      <div className="flex flex-col gap-3">
        <span className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em] text-wb-ink">
          {t("title")}
        </span>
        <div className="flex flex-col gap-1 rounded-[18px] bg-wb-primary-tint px-4 py-3.5">
          <span className="text-[14px] font-extrabold text-wb-primary-deep">
            {t("graceTitle")}
          </span>
          <span className="text-[13px] font-medium leading-[1.5] text-wb-body">
            {t("graceBody")}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-[18px] bg-wb-surface-2 px-4 py-3.5">
          <span className="text-[14px] font-extrabold text-wb-ink">
            {t("localTitle")}
          </span>
          <span className="text-[13px] font-medium leading-[1.5] text-wb-body">
            {t("localBody")}
          </span>
        </div>

        <WbField label={t("confirmLabel")}>
          <WbInput
            type="email"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={email}
          />
        </WbField>

        {error && (
          <span className="text-[13px] font-bold text-wb-danger">{error}</span>
        )}

        <WbDangerButton onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("schedule")}
        </WbDangerButton>
        <WbQuietButton onClick={onClose}>{t("keep")}</WbQuietButton>
        <p className="text-center text-[12px] font-medium leading-[1.45] text-wb-muted">
          {t("storeNote", { store })}
        </p>
      </div>
    </WbModal>
  );
}
