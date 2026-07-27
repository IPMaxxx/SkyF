"use client";

/**
 * Экран 16 дизайна: «Мой аккаунт» Mushroom Checker.
 *
 * Из общего аккаунта SkyForest здесь остаются только профиль, безопасность,
 * подписка, документы и удаление — токенов, реферальной программы и истории
 * транзакций во флейворе нет. Настройки открываются нижними листами,
 * логика вызовов Supabase та же, что в общих компонентах.
 */

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp, storeName } from "@/lib/native/capacitor";
import {
  authenticateBiometric,
  isBiometryAvailable,
  isLockEnabled,
  setLockEnabled,
} from "@/lib/native/biometricLock";
import {
  formatFullDate,
  useCheckerSubscription,
} from "@/lib/checker/useSubscription";
import {
  CkDangerButton,
  CkInput,
  CkListCard,
  CkListRow,
  CkMono,
  CkPrimaryButton,
  CkScreen,
  CkSheet,
  CkStatusCard,
  CkToggle,
} from "@/components/checker/primitives";

type Sheet = "name" | "password" | "twofa" | "delete" | null;

export function CheckerAccount({
  email,
  initialName,
}: {
  email: string;
  initialName: string | null;
}) {
  const t = useTranslations("checker.account");
  const td = useTranslations("checker.deleteAccount");
  const locale = useLocale();
  const router = useRouter();
  const { subscription, left, limit } = useCheckerSubscription();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [name, setName] = useState(initialName ?? "");
  const [twoFa, setTwoFa] = useState(false);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [deleteAt, setDeleteAt] = useState<string | null>(null);

  const native = isNativeApp();
  const store = native ? storeName() : "App Store / Google Play";
  const initial = (name || email).trim().charAt(0).toUpperCase();

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
    fetch("/api/account/delete")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDeleteAt(d?.effective_at ?? null))
      .catch(() => {});
  }, []);

  const toggleLock = async (next: boolean) => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      if (next) {
        const ok = await authenticateBiometric(t("appLock"));
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
    router.push("/login");
    router.refresh();
  };

  const cancelDeletion = async () => {
    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (res.ok) setDeleteAt(null);
  };

  return (
    <CkScreen
      bottom={
        <button
          type="button"
          onClick={logout}
          className="flex h-[52px] w-full items-center justify-center rounded-[26px] border border-ck-danger-border bg-ck-surface text-[15px] font-extrabold text-ck-danger"
        >
          {t("logout")}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5 pt-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("back")}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-ck-border-4 bg-ck-surface text-[#41594a]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
            {t("title")}
          </h1>
        </div>

        {/* Профиль */}
        <div className="flex items-center gap-3.5 rounded-[26px] border border-ck-border bg-ck-surface p-[18px]">
          <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[18px] bg-ck-primary-tint text-xl font-extrabold text-ck-primary">
            {initial}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-base font-extrabold text-ck-ink">
              {name || t("displayNameEmpty")}
            </span>
            <span className="truncate text-[12.5px] font-medium text-ck-muted">
              {email}
            </span>
          </div>
        </div>

        {/* Подписка */}
        {subscription ? (
          <div className="flex items-center justify-between gap-3 rounded-[26px] border border-ck-primary-border bg-ck-primary-tint p-[18px]">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14.5px] font-extrabold text-ck-primary-deep">
                {t("premiumPlan", {
                  plan:
                    subscription.period === "yearly"
                      ? t("premiumYearly")
                      : t("premiumMonthly"),
                })}
              </span>
              <span className="text-[11.5px] font-medium text-ck-primary-mid">
                {t("idsLeft", { left: left ?? 0, limit: limit ?? 0 })}
              </span>
            </div>
            <Link
              href="/payment"
              className="flex-none text-[12.5px] font-extrabold text-ck-primary"
            >
              {t("manage")}
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-[26px] border border-ck-border bg-ck-surface p-[18px]">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14.5px] font-extrabold text-ck-ink-2">
                {t("noSubscription")}
              </span>
              <span className="text-[11.5px] font-medium text-ck-muted">
                {t("noSubscriptionHint")}
              </span>
            </div>
            <Link
              href="/payment"
              className="flex-none text-[12.5px] font-extrabold text-ck-primary"
            >
              {t("subscribe")}
            </Link>
          </div>
        )}

        {/* Настройки */}
        <CkListCard>
          <CkListRow
            first
            label={t("displayName")}
            value={name || t("displayNameEmpty")}
            onClick={() => setSheet("name")}
          />
          <CkListRow
            label={t("changePassword")}
            onClick={() => setSheet("password")}
          />
          {lockAvailable && (
            <CkListRow
              label={t("appLock")}
              sublabel={t("appLockHint")}
              right={
                <CkToggle
                  checked={lockEnabled}
                  onChange={toggleLock}
                  disabled={lockBusy}
                  label={t("appLock")}
                />
              }
            />
          )}
          <CkListRow
            label={t("twoFactor")}
            value={twoFa ? t("on") : t("off")}
            onClick={() => setSheet("twofa")}
          />
        </CkListCard>

        {/* Документы и удаление */}
        <CkListCard>
          <CkListRow
            first
            label={t("eula")}
            onClick={() => router.push("/offer")}
          />
          <CkListRow
            label={t("privacy")}
            onClick={() => router.push("/privacy")}
          />
          <CkListRow
            danger
            label={t("deleteAccount")}
            onClick={() => setSheet("delete")}
          />
        </CkListCard>

        {deleteAt && (
          <CkStatusCard
            variant="warn"
            icon="!"
            title={td("scheduledTitle")}
            body={td("scheduledBody", {
              date: formatFullDate(deleteAt, locale),
            })}
            action={
              <button
                type="button"
                onClick={cancelDeletion}
                className="flex h-12 w-full items-center justify-center rounded-3xl bg-ck-surface text-[14.5px] font-extrabold text-ck-amber-deep"
              >
                {td("undo")}
              </button>
            }
          />
        )}
      </div>

      {/* Листы монтируются только открытыми: состояние формы обнуляется
          размонтированием, без сбрасывающих эффектов. */}
      {sheet === "name" && (
        <NameSheet
          onClose={() => setSheet(null)}
          value={name}
          onSaved={setName}
        />
      )}
      {sheet === "password" && (
        <PasswordSheet onClose={() => setSheet(null)} />
      )}
      {sheet === "twofa" && (
        <TwoFactorSheet
          enabled={twoFa}
          onClose={() => setSheet(null)}
          onChanged={refreshTwoFa}
        />
      )}
      {sheet === "delete" && (
        <DeleteSheet
          email={email}
          store={store}
          onClose={() => setSheet(null)}
          onScheduled={logout}
        />
      )}
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Отображаемое имя                                                    */
/* ------------------------------------------------------------------ */

function NameSheet({
  onClose,
  value,
  onSaved,
}: {
  onClose: () => void;
  value: string;
  onSaved: (next: string) => void;
}) {
  const t = useTranslations("checker.account");
  const tp = useTranslations("account.profileName");
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: draft.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (updateError) {
      setError(tp("saveError"));
      return;
    }
    onSaved(draft.trim());
    onClose();
  };

  return (
    <CkSheet open onClose={onClose} label={t("close")}>
      <div className="flex flex-col gap-3.5 pt-1">
        <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {t("displayName")}
        </span>
        <CkInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tp("placeholder")}
          maxLength={60}
        />
        {error && <CkStatusCard variant="error" icon="!" title={error} />}
        <CkPrimaryButton onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("save")}
        </CkPrimaryButton>
      </div>
    </CkSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Смена пароля                                                        */
/* ------------------------------------------------------------------ */

function PasswordSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("checker.account");
  const tp = useTranslations("account.pw");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
    <CkSheet open onClose={onClose} label={t("close")}>
      <div className="flex flex-col gap-3 pt-1">
        <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {t("changePassword")}
        </span>
        {done ? (
          <CkStatusCard
            variant="success"
            icon={<Check className="h-4 w-4" strokeWidth={3} />}
            title={tp("changed")}
          />
        ) : (
          <>
            <CkInput
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tp("newPlaceholder")}
            />
            <CkInput
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder={tp("confirmPlaceholder")}
            />
            {error && <CkStatusCard variant="error" icon="!" title={error} />}
            <CkPrimaryButton onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {tp("submit")}
            </CkPrimaryButton>
          </>
        )}
      </div>
    </CkSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Двухфакторная аутентификация                                        */
/* ------------------------------------------------------------------ */

function TwoFactorSheet({
  enabled,
  onClose,
  onChanged,
}: {
  enabled: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("checker.account");
  const t2 = useTranslations("account.twoFa");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      friendlyName: "Mushroom Checker",
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
    <CkSheet open onClose={onClose} label={t("close")}>
      <div className="flex flex-col gap-3.5 pt-1">
        <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {t("twoFactor")}
        </span>

        {enabled ? (
          <>
            <p className="text-[13px] font-medium leading-[1.5] text-ck-body-soft">
              {t2("protectedHint")}
            </p>
            <CkDangerButton onClick={disable} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t2("disable")}
            </CkDangerButton>
          </>
        ) : qr ? (
          <>
            <p className="text-[13px] font-medium leading-[1.5] text-ck-body-soft">
              {t2("scanQr")}
            </p>
            <Image
              src={qr}
              alt={t2("qrAlt")}
              width={180}
              height={180}
              unoptimized
              className="mx-auto rounded-[18px] border border-ck-border bg-white p-2"
            />
            {secret && (
              <div className="flex flex-col gap-1">
                <CkMono>{t2("manualKey")}</CkMono>
                <span className="ck-mono break-all rounded-2xl bg-ck-canvas px-4 py-3 text-[12px] text-ck-ink-2">
                  {secret}
                </span>
              </div>
            )}
            <CkInput
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder={t2("enterCode")}
              className="text-center tracking-[0.4em]"
            />
            {error && <CkStatusCard variant="error" icon="!" title={error} />}
            <CkPrimaryButton
              onClick={confirm}
              disabled={busy || code.length !== 6}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t2("enable")}
            </CkPrimaryButton>
          </>
        ) : (
          <>
            <p className="text-[13px] font-medium leading-[1.5] text-ck-body-soft">
              {t2("addHint")} {t2("appsHint")}
            </p>
            {error && <CkStatusCard variant="error" icon="!" title={error} />}
            <CkPrimaryButton onClick={enroll} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t2("enable")}
            </CkPrimaryButton>
          </>
        )}
      </div>
    </CkSheet>
  );
}

/* ------------------------------------------------------------------ */
/* 17 · Удаление аккаунта                                              */
/* ------------------------------------------------------------------ */

function DeleteSheet({
  email,
  store,
  onClose,
  onScheduled,
}: {
  email: string;
  store: string;
  onClose: () => void;
  onScheduled: () => Promise<void>;
}) {
  const t = useTranslations("checker.deleteAccount");
  const ta = useTranslations("checker.account");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    <CkSheet open onClose={onClose} label={ta("close")}>
      <div className="flex flex-col gap-3.5 pt-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-ck-danger-tint text-2xl font-extrabold text-ck-danger">
          !
        </span>
        <span className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ck-ink">
          {t("title")}
        </span>
        <p className="text-[13px] font-medium leading-[1.5] text-ck-body-soft">
          {t.rich("body", {
            days: (chunks) => (
              <b className="font-extrabold text-ck-ink">{chunks}</b>
            ),
          })}
        </p>
        <p className="rounded-[18px] bg-ck-canvas px-4 py-3 text-[11.5px] font-medium leading-[1.45] text-ck-muted">
          {t("storeNote", { store })}
        </p>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-bold text-ck-body-soft">
            {t("confirmLabel")}
          </span>
          <CkInput
            type="email"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={email}
            className="border-[#e6c9c3]"
          />
        </div>

        {error && <CkStatusCard variant="error" icon="!" title={error} />}

        <CkDangerButton onClick={submit} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("cta")}
        </CkDangerButton>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[52px] w-full items-center justify-center rounded-[26px] bg-ck-canvas text-[15px] font-bold text-ck-ink-2"
        >
          {t("keep")}
        </button>
      </div>
    </CkSheet>
  );
}
