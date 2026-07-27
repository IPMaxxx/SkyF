"use client";

/**
 * Экраны входа/регистрации/восстановления пароля WayBack.
 *
 * Серверная логика (Supabase, 2FA, подтверждение почты) повторяет общие
 * страницы — меняется только разметка на светлую схему «Widget Board».
 *
 * Ключевое отличие флейвора: вход **не обязателен**. Трек работает анонимно,
 * поэтому экран озаглавлен «Sign in to sync», помечен как optional и
 * позволяет уйти назад к треку в один тап. Давить на регистрацию нельзя —
 * это сломает главное преимущество продукта.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { authRedirectUrl } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  WayBackAuthDivider,
  WayBackSocialButtons,
} from "@/components/wayback/WayBackSocialButtons";
import {
  WbField,
  WbInput,
  WbLabel,
  WbPrimaryButton,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

const HOME = "/dashboard/track";

/* ------------------------------------------------------------------ */
/* Общие части                                                         */
/* ------------------------------------------------------------------ */

function Screen({
  children,
  bottom,
}: {
  children: React.ReactNode;
  bottom?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-4">
      <div className="flex-1">{children}</div>
      {bottom && (
        <div className="pt-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          {bottom}
        </div>
      )}
    </div>
  );
}

function ErrorTile({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="wb-tile-danger flex flex-col gap-1.5 px-5 py-4">
      <span className="text-[15px] font-extrabold text-wb-danger">{title}</span>
      {children}
    </div>
  );
}

/** Индикатор надёжности пароля: три сегмента, как в макете. */
function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations("wayback.auth");
  const score =
    value.length === 0
      ? 0
      : value.length < 8
        ? 1
        : /[^a-zA-Z0-9]/.test(value) && /\d/.test(value)
          ? 3
          : 2;
  if (!value) return null;
  const label = [t("strengthWeak"), t("strengthDecent"), t("strengthStrong")][
    score - 1
  ];
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 gap-1.5">
        {[1, 2, 3].map((i) => (
          <i
            key={i}
            className={cn(
              "h-1 flex-1 rounded-sm",
              i <= score ? "bg-wb-primary" : "bg-wb-border",
            )}
          />
        ))}
      </div>
      <span className="text-[12.5px] font-semibold text-wb-muted">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Вход                                                                */
/* ------------------------------------------------------------------ */

export function WayBackLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || HOME;
  const t = useTranslations("wayback.auth");
  const tAuth = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError(tAuth("authFailed"));
    }
  }, [searchParams, tAuth]);

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
    <Screen
      bottom={
        <p className="text-center text-[13.5px] font-medium text-wb-muted">
          {t("noAccount")}{" "}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirect)}`}
            className="font-extrabold text-wb-primary"
          >
            {t("createOne")}
          </Link>
        </p>
      }
    >
      <WbTopBar
        title={t("signInTitle")}
        eyebrow={t("optional")}
        onBack={() => router.push(HOME)}
        backLabel={t("optional")}
      />
      <p className="pb-4 text-[14.5px] font-medium leading-[1.5] text-wb-body">
        {t("signInBody")}
      </p>

      <div className="flex flex-col gap-2.5">
        <WbTile className="px-4 py-4">
          <WayBackSocialButtons redirect={redirect} />
        </WbTile>

        <WayBackAuthDivider />

        <WbTile className="flex flex-col gap-3 px-4 py-4">
          <form
            id="wb-login"
            onSubmit={handleLogin}
            className="flex flex-col gap-3"
          >
            <WbField label={t("email")}>
              <WbInput
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </WbField>
            <WbField
              label={t("password")}
              hint={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[12.5px] font-bold text-wb-primary"
                >
                  {showPassword ? t("hide") : t("show")}
                </button>
              }
            >
              <WbInput
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </WbField>
            <Link
              href="/forgot-password"
              className="self-end text-[12.5px] font-bold text-wb-primary"
            >
              {t("forgot")}
            </Link>
            <WbPrimaryButton type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("signIn")}
            </WbPrimaryButton>
          </form>
        </WbTile>

        {error && <ErrorTile title={error} />}
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Регистрация                                                         */
/* ------------------------------------------------------------------ */

export function WayBackRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || HOME;
  const t = useTranslations("wayback.auth");
  const tAuth = useTranslations("auth");
  const tPaywall = useTranslations("wayback.paywall");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Supabase не отдаёт явную ошибку на повторную регистрацию — вычисляем.
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
      <Screen>
        <WbTopBar
          title={t("registerTitle")}
          onBack={() => router.push("/login")}
        />
        <WbTile tone="tint" className="flex flex-col gap-2.5 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wb-primary text-wb-on-primary">
            <Check className="h-[18px] w-[18px]" strokeWidth={3} />
          </span>
          <span className="text-[17px] font-extrabold text-wb-ink">
            {tAuth("checkEmail")}
          </span>
          <span className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
            {email}
          </span>
          <Link
            href="/login"
            className="mt-1 text-[13.5px] font-extrabold text-wb-primary"
          >
            {t("signIn")}
          </Link>
        </WbTile>
      </Screen>
    );
  }

  return (
    <Screen>
      <WbTopBar
        title={t("registerTitle")}
        onBack={() => router.push("/login")}
      />
      <p className="pb-4 text-[14.5px] font-medium leading-[1.5] text-wb-body">
        {t("registerBody")}
      </p>

      <div className="flex flex-col gap-2.5">
        <WbTile className="px-4 py-4">
          <WayBackSocialButtons redirect={redirect} />
        </WbTile>

        <WayBackAuthDivider />

        <WbTile className="flex flex-col gap-3 px-4 py-4">
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <WbField label={t("email")}>
              <WbInput
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </WbField>
            <WbField label={t("password")}>
              <WbInput
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordHint")}
                required
                minLength={6}
              />
            </WbField>
            <PasswordStrength value={password} />
            <WbPrimaryButton type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("createAccount")}
            </WbPrimaryButton>
          </form>

          <p className="text-center text-[12.5px] font-medium leading-[1.45] text-wb-muted">
            {t("legal")}
          </p>
          <div className="flex justify-center gap-4 text-[12px] font-bold text-wb-primary">
            <Link href="/offer" target="_blank">
              {tPaywall("terms")}
            </Link>
            <Link href="/privacy" target="_blank">
              {tPaywall("privacy")}
            </Link>
          </div>
        </WbTile>

        {/* Локальные походы не потеряются — снимаем главный страх анонима. */}
        <WbTile tone="tint" className="px-5 py-4">
          <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
            {t("uploadNote")}
          </p>
        </WbTile>

        {error && (
          <ErrorTile title={error}>
            {duplicate && (
              <div className="flex gap-4 text-[13px] font-extrabold text-wb-primary">
                <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>
                  {t("signIn")}
                </Link>
                <Link href="/forgot-password">{t("forgot")}</Link>
              </div>
            )}
          </ErrorTile>
        )}
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Забыли пароль                                                       */
/* ------------------------------------------------------------------ */

export function WayBackForgotPassword() {
  const router = useRouter();
  const t = useTranslations("wayback.auth");
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
    <Screen>
      <WbTopBar title={t("resetTitle")} onBack={() => router.push("/login")} />
      <p className="pb-4 text-[14.5px] font-medium leading-[1.5] text-wb-body">
        {t("resetBody")}
      </p>

      <div className="flex flex-col gap-2.5">
        {sent ? (
          <WbTile tone="tint" className="flex flex-col gap-2.5 px-5 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wb-primary text-wb-on-primary">
              <Check className="h-[18px] w-[18px]" strokeWidth={3} />
            </span>
            <span className="text-[17px] font-extrabold text-wb-ink">
              {t("linkSent")}
            </span>
            <span className="wb-mono text-[13px] text-wb-muted">{email}</span>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="self-start text-[13.5px] font-extrabold text-wb-primary"
            >
              {t("sendLink")}
            </button>
          </WbTile>
        ) : (
          <WbTile className="flex flex-col gap-3 px-4 py-4">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <WbField label={t("email")}>
                <WbInput
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </WbField>
              <WbPrimaryButton type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("sendLink")}
              </WbPrimaryButton>
            </form>
          </WbTile>
        )}

        {error && <ErrorTile title={error} />}
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Новый пароль (+ состояние «ссылка недействительна»)                 */
/* ------------------------------------------------------------------ */

export function WayBackResetPassword() {
  const router = useRouter();
  const t = useTranslations("wayback.auth");
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
      setError(tAuth("passwordMismatch"));
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
      setTimeout(() => router.push(HOME), 2000);
    }
    setLoading(false);
  };

  return (
    <Screen>
      <WbTopBar title={t("resetTitle")} onBack={() => router.push("/login")} />

      <div className="flex flex-col gap-2.5">
        {sessionReady === null ? (
          <div className="flex justify-center py-10">
            <Loader2
              className="h-5 w-5 animate-spin text-wb-primary"
              aria-hidden="true"
            />
          </div>
        ) : sessionReady === false ? (
          /* Ссылка из письма протухла — самый частый вход на этот экран. */
          <>
            <ErrorTile title={t("linkExpiredTitle")}>
              <p className="text-[13.5px] font-medium leading-[1.5] text-[#8d5150]">
                {t("linkExpiredBody")}
              </p>
            </ErrorTile>
            <WbTile className="flex flex-col gap-3 px-4 py-4">
              <Link href="/forgot-password" className="wb-btn wb-btn-primary">
                {t("sendLink")}
              </Link>
            </WbTile>
            <WbTile tone="quiet" className="px-5 py-4 opacity-60">
              <WbLabel>{t("newPasswordUnavailable")}</WbLabel>
              <div className="mt-2 flex flex-col gap-2">
                <i className="block h-[46px] rounded-[16px] bg-wb-surface-2" />
                <i className="block h-[46px] rounded-[16px] bg-wb-surface-2" />
              </div>
            </WbTile>
          </>
        ) : done ? (
          <WbTile tone="tint" className="flex flex-col gap-2.5 px-5 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wb-primary text-wb-on-primary">
              <Check className="h-[18px] w-[18px]" strokeWidth={3} />
            </span>
            <span className="text-[17px] font-extrabold text-wb-ink">
              {tAuth("passwordUpdated")}
            </span>
          </WbTile>
        ) : (
          <WbTile className="flex flex-col gap-3 px-4 py-4">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <WbField label={t("newPassword")}>
                <WbInput
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordHint")}
                  required
                  minLength={6}
                />
              </WbField>
              <PasswordStrength value={password} />
              <WbInput
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                placeholder={t("passwordHint")}
                required
                minLength={6}
              />
              <WbPrimaryButton type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("savePassword")}
              </WbPrimaryButton>
            </form>
          </WbTile>
        )}

        {error && <ErrorTile title={error} />}
      </div>
    </Screen>
  );
}
