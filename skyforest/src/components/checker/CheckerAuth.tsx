"use client";

/**
 * Экраны входа/регистрации/восстановления пароля Mushroom Checker.
 *
 * Вся серверная логика (Supabase, 2FA, token_hash flow подтверждения почты)
 * повторяет общие страницы — меняется только разметка на светлую схему.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { authRedirectUrl } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { FLAVORS } from "@/lib/appFlavor";
import { cn } from "@/lib/utils";
import { CheckerBackButton } from "@/components/checker/CheckerTopBar";
import {
  CheckerAuthDivider,
  CheckerSocialButtons,
} from "@/components/checker/CheckerSocialButtons";
import {
  CkField,
  CkInput,
  CkPrimaryButton,
  CkScreen,
  CkStatusCard,
} from "@/components/checker/primitives";

/* ------------------------------------------------------------------ */
/* Общие части                                                         */
/* ------------------------------------------------------------------ */

function BrandMark() {
  return (
    <Image
      src={FLAVORS.checker.logoPath}
      alt=""
      width={128}
      height={128}
      className="h-16 w-16 rounded-[22px] object-cover shadow-[0_16px_30px_-16px_rgba(63,156,88,0.8)]"
    />
  );
}

/**
 * Возврат на предыдущий экран входа. Если истории нет (нативная оболочка
 * открыла этот экран первым), уводим на `fallback` — иначе кнопка молча
 * ничего не делает.
 */
function BackBar({ fallback, label }: { fallback: string; label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1.5">
      <CheckerBackButton fallback={fallback} label={label} />
      <span className="text-sm font-bold text-ck-ink-3">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Вход                                                           */
/* ------------------------------------------------------------------ */

export function CheckerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard/identify";
  const t = useTranslations("checker.auth");
  const tAuth = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Провал OAuth-редиректа приходит как ?error=auth_failed — показываем его
  // до первой отправки формы, дальше приоритет у ошибки логина.
  const shownError =
    error ||
    (searchParams.get("error") === "auth_failed" ? tAuth("authFailed") : "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? tAuth("invalidCredentials")
          : authError.message,
      );
      setLoading(false);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasTotp = factors?.totp?.some((f) => f.status === "verified");
    router.push(hasTotp ? "/verify-mfa" : redirect);
    router.refresh();
  };

  return (
    <CkScreen
      padding="px-6"
      bottom={
        <div className="flex flex-col gap-3">
          <CkPrimaryButton
            type="submit"
            form="ck-login"
            disabled={loading}
            aria-label={t("signInCta")}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("signInCta")}
          </CkPrimaryButton>
          <p className="text-center text-[13px] font-medium text-[#6a7a70]">
            {t("noAccount")}{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="font-extrabold text-ck-primary"
            >
              {t("createAccount")}
            </Link>
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-[18px] pt-[26px]">
        <div className="flex flex-col items-start gap-3">
          <BrandMark />
          <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
            {t("signInTitle")}
          </h1>
          <p className="text-[13.5px] font-medium leading-[1.45] text-ck-body-soft">
            {t("signInSubtitle")}
          </p>
        </div>

        <CheckerSocialButtons redirect={redirect} />
        <CheckerAuthDivider />

        <form
          id="ck-login"
          onSubmit={handleLogin}
          className="flex flex-col gap-2.5"
        >
          <CkField label={t("email")}>
            <CkInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
            />
          </CkField>
          <CkField label={t("password")}>
            <CkInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </CkField>
          <Link
            href="/forgot-password"
            className="self-end text-[12.5px] font-bold text-ck-primary"
          >
            {t("forgot")}
          </Link>
        </form>

        {shownError && (
          <CkStatusCard variant="error" icon="!" title={shownError} />
        )}
      </div>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Регистрация                                                    */
/* ------------------------------------------------------------------ */

export function CheckerRegister() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard/identify";
  const t = useTranslations("checker.auth");
  const tAuth = useTranslations("auth");
  const tLegal = useTranslations("checker.paywall");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError(t("consentRequired"));
      return;
    }
    if (password !== repeat) {
      setError(t("passwordsDiffer"));
      return;
    }
    setLoading(true);
    setError("");
    setDuplicate(false);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { brand: BRAND.id },
        emailRedirectTo: authRedirectUrl(
          `/auth/confirm?next=${encodeURIComponent(redirect)}`,
        ),
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const isExistingUser =
      data.user &&
      (data.user.identities?.length === 0 ||
        (data.user.created_at &&
          new Date(data.user.created_at).getTime() < Date.now() - 10_000));

    if (isExistingUser) {
      setDuplicate(true);
      setError(tAuth("alreadyRegistered"));
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth/log-signup-ip", { method: "POST" });
    } catch {
      /* некритично */
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <CkScreen padding="px-6">
        <BackBar fallback="/login" label={t("signIn")} />
        <div className="flex flex-col gap-5 pt-6">
          <CkStatusCard
            variant="success"
            icon={<Check className="h-4 w-4" strokeWidth={3} />}
            title={t("sentTitle")}
            body={t("sentBody", { email })}
          />
          <Link
            href="/login"
            className="text-center text-[13px] font-extrabold text-[#2f7d4f]"
          >
            {t("signIn")}
          </Link>
        </div>
      </CkScreen>
    );
  }

  return (
    <CkScreen
      padding="px-6"
      bottom={
        <div className="flex flex-col gap-2.5">
          <CkPrimaryButton type="submit" form="ck-register" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("registerCta")}
          </CkPrimaryButton>
          <p className="text-center text-[11px] font-medium leading-[1.4] text-ck-muted">
            {t("confirmEmailNote")}
          </p>
        </div>
      }
    >
      <BackBar fallback="/login" label={t("backToSignIn")} />

      <div className="flex flex-col gap-4 pt-5">
        <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
          {t("registerTitle")}
        </h1>

        <CheckerSocialButtons redirect={redirect} />
        <CheckerAuthDivider />

        <form
          id="ck-register"
          onSubmit={handleRegister}
          className="flex flex-col gap-2.5"
        >
          <CkInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            required
          />
          <div className="relative">
            <CkInput
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              required
              minLength={6}
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#a8b6ac]">
              {t("minSix")}
            </span>
          </div>
          <CkInput
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder={t("repeatPassword")}
            required
            minLength={6}
          />
        </form>

        <button
          type="button"
          onClick={() => setConsent((v) => !v)}
          aria-pressed={consent}
          className="flex items-start gap-3 rounded-[20px] border border-ck-border-2 bg-ck-surface px-4 py-3.5 text-left"
        >
          <i
            className={cn(
              "mt-px flex h-5 w-5 flex-none items-center justify-center rounded-md border",
              consent
                ? "border-ck-primary bg-ck-primary text-white"
                : "border-ck-border-3 bg-white",
            )}
          >
            {consent && <Check className="h-3 w-3" strokeWidth={3.5} />}
          </i>
          <span className="text-xs font-medium leading-[1.45] text-ck-body-soft">
            {t("consent", {
              eula: tLegal("eula"),
              privacy: tLegal("privacy"),
            })}
          </span>
        </button>

        <div className="flex gap-4 text-[11.5px] font-bold text-ck-primary">
          <Link href="/offer" target="_blank">
            {tLegal("eula")}
          </Link>
          <Link href="/privacy" target="_blank">
            {tLegal("privacy")}
          </Link>
        </div>

        {error && (
          <CkStatusCard
            variant="error"
            icon="!"
            title={error}
            action={
              duplicate && (
                <div className="flex gap-4 text-[12.5px] font-extrabold text-ck-primary">
                  <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>
                    {t("signIn")}
                  </Link>
                  <Link href="/forgot-password">{t("forgot")}</Link>
                </div>
              )
            }
          />
        )}
      </div>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Забыли пароль                                                  */
/* ------------------------------------------------------------------ */

export function CheckerForgotPassword() {
  const t = useTranslations("checker.auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: authRedirectUrl("/auth/confirm?next=/reset-password") },
    );
    if (resetError) setError(resetError.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <CkScreen padding="px-6">
      <BackBar fallback="/login" label={t("signIn")} />

      <div className="flex flex-col gap-5 pt-6">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ck-ink">
            {t("forgotTitle")}
          </h1>
          <p className="text-[13.5px] font-medium leading-[1.5] text-ck-body-soft">
            {t("forgotBody")}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-start gap-2.5 rounded-[24px] border border-ck-primary-border bg-ck-primary-tint p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ck-primary text-white">
              <Check className="h-[18px] w-[18px]" strokeWidth={3} />
            </span>
            <span className="text-base font-extrabold text-ck-primary-deep">
              {t("sentTitle")}
            </span>
            <span className="text-[13px] font-medium leading-[1.45] text-ck-primary-mid">
              {t("sentBody", { email })}
            </span>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-[13px] font-extrabold text-[#2f7d4f]"
            >
              {t("resend")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <CkInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
            />
            <CkPrimaryButton type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("sendLink")}
            </CkPrimaryButton>
            {error && <CkStatusCard variant="error" icon="!" title={error} />}
          </form>
        )}
      </div>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Новый пароль (+ состояние «ссылка недействительна»)            */
/* ------------------------------------------------------------------ */

export function CheckerResetPassword() {
  const router = useRouter();
  const t = useTranslations("checker.auth");
  const tAuth = useTranslations("auth");

  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState<null | boolean>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setSessionReady(Boolean(data.user));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session?.user) setSessionReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) {
      setError(t("passwordsDiffer"));
      return;
    }
    if (password.length < 6) {
      setError(tAuth("passwordMin"));
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard/identify"), 2000);
    }
    setLoading(false);
  };

  // Ссылка из письма протухла/уже использована — самый частый вход на экран.
  if (sessionReady === false) {
    return (
      <CkScreen padding="px-6">
        <BackBar fallback="/login" label={t("signIn")} />
        <div className="flex flex-col gap-3 pt-6">
          <span className="ck-mono text-[10px] tracking-[0.14em] text-ck-muted-2">
            {t("invalidLinkState")}
          </span>
          <div className="flex flex-col items-start gap-2.5 rounded-[24px] border border-ck-danger-border bg-ck-danger-tint p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ck-danger text-xl font-extrabold text-white">
              !
            </span>
            <span className="text-base font-extrabold text-ck-danger-deep">
              {t("invalidTitle")}
            </span>
            <span className="text-[13px] font-medium leading-[1.45] text-ck-danger-mid">
              {t("invalidBody")}
            </span>
            <Link
              href="/forgot-password"
              className="flex h-12 w-full items-center justify-center rounded-3xl bg-ck-danger text-[15px] font-extrabold text-white"
            >
              {t("requestNewLink")}
            </Link>
          </div>
        </div>
      </CkScreen>
    );
  }

  return (
    <CkScreen padding="px-6">
      <BackBar fallback="/login" label={t("signIn")} />
      <div className="flex flex-col gap-5 pt-6">
        <h1 className="text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ck-ink">
          {t("resetTitle")}
        </h1>

        {sessionReady === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-ck-muted" />
          </div>
        ) : done ? (
          <CkStatusCard
            variant="success"
            icon={<Check className="h-4 w-4" strokeWidth={3} />}
            title={t("passwordSaved")}
          />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <div className="relative">
              <CkInput
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("newPassword")}
                required
                minLength={6}
                className="pr-16"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#a8b6ac]">
                {t("minSix")}
              </span>
            </div>
            <CkInput
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder={t("repeatNewPassword")}
              required
              minLength={6}
            />
            <CkPrimaryButton type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("savePassword")}
            </CkPrimaryButton>
            {error && <CkStatusCard variant="error" icon="!" title={error} />}
          </form>
        )}
      </div>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* 06 · Двухфакторная аутентификация                                   */
/* ------------------------------------------------------------------ */

const EMPTY_CODE = ["", "", "", "", "", ""];

export function CheckerVerifyMfa() {
  const router = useRouter();
  const t = useTranslations("checker.auth");
  const tAuth = useTranslations("auth");

  const [code, setCode] = useState(EMPTY_CODE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.[0];
      if (!totp) {
        router.replace("/dashboard/identify");
        return;
      }
      setFactorId(totp.id);
      inputsRef.current[0]?.focus();
    });
  }, [router]);

  const verify = async (otp: string) => {
    if (!factorId || loading) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeErr || !challenge) {
      setError(tAuth("mfaError"));
      setLoading(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: otp,
    });

    if (verifyErr) {
      setError(tAuth("mfaInvalid"));
      setCode(EMPTY_CODE);
      inputsRef.current[0]?.focus();
      setLoading(false);
      return;
    }

    router.push("/dashboard/identify");
    router.refresh();
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) verify(next.join(""));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = EMPTY_CODE.map((_, i) => pasted[i] || "");
    setCode(next);
    if (pasted.length === 6) verify(pasted);
    else inputsRef.current[pasted.length]?.focus();
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <CkScreen padding="px-6">
      <div className="flex flex-col gap-5 pt-8">
        <div className="flex flex-col items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ck-primary-tint text-ck-primary">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ck-ink">
            {t("mfaTitle")}
          </h1>
          <p className="text-[13.5px] font-medium leading-[1.5] text-ck-body-soft">
            {t("mfaBody")}
          </p>
        </div>

        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={`otp-${i}`}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              aria-label={`${t("mfaCode")} ${i + 1}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !code[i] && i > 0) {
                  inputsRef.current[i - 1]?.focus();
                }
              }}
              disabled={loading}
              className="h-[58px] w-full rounded-[18px] border border-ck-border-4 bg-ck-surface text-center text-xl font-extrabold text-ck-ink outline-none disabled:opacity-55"
            />
          ))}
        </div>

        {loading && (
          <span className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ck-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tAuth("mfaChecking")}
          </span>
        )}

        {error && <CkStatusCard variant="error" icon="!" title={error} />}

        <button
          type="button"
          onClick={logout}
          className="text-center text-[12.5px] font-bold text-ck-muted"
        >
          {tAuth("mfaLogoutOther")}
        </button>
      </div>
    </CkScreen>
  );
}
