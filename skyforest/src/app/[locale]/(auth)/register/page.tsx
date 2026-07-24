"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { authRedirectUrl } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { Mail, Lock, User, Loader2, ScanSearch } from "lucide-react";
import { useTranslations } from "next-intl";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { useIsNative } from "@/lib/native/useIsNative";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const refCode = searchParams.get("ref") || "";
  const t = useTranslations("auth");
  const isNative = useIsNative();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDuplicate(false);

    if (refCode) {
      try {
        localStorage.setItem("skyforest_ref", refCode);
      } catch {
        /* noop */
      }
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // brand — сигнал для Send Email хука (src/app/api/auth/send-email):
        //   samplify → английское письмо + support@skyforest.ai
        //   skyforest → русское письмо + support@skyforest.by
        data: { full_name: fullName, brand: BRAND.id },
        // token_hash flow (см. /auth/confirm). Шаблон письма в Supabase должен иметь:
        //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{NEXT}}
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
      setError(t("alreadyRegistered"));
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth/log-signup-ip", { method: "POST" });
    } catch {
      /* non-critical */
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    if (isNative) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b120d] px-6 text-foreground">
          <div className="w-full max-w-md text-center">
            <div className="glass rounded-2xl p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary-light" />
              </div>
              <h2 className="mb-2 font-heading text-xl font-extrabold">{t("checkEmail")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("confirmEmailBefore")}
                <strong className="text-foreground">{email}</strong>
                {t("confirmEmailAfter")}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary-light hover:underline"
              >
                {t("goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-bold">{t("checkEmail")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("confirmEmailBefore")}
              <strong>{email}</strong>
              {t("confirmEmailAfter")}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("goToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isNative) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b120d] px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2.5rem)] text-foreground">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-[rgba(55,201,166,0.35)] bg-gradient-to-br from-[#0e2b26] to-[#0a1712] shadow-[0_0_44px_-8px_rgba(55,201,166,0.5)]">
              <ScanSearch className="h-9 w-9 text-identify" strokeWidth={1.6} aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">{t("registerTitle")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#8aa090]">
              {t("registerSubtitle")}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary-light">
              {refCode ? t("refBonus") : t("welcomeBonus")}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <p>{error}</p>
              {duplicate && (
                <div className="mt-2 flex gap-3 text-xs font-medium">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(redirect)}`}
                    className="text-primary-light hover:underline"
                  >
                    {t("signIn")}
                  </Link>
                  <Link href="/forgot-password" className="text-primary-light hover:underline">
                    {t("forgotPassword")}
                  </Link>
                </div>
              )}
            </div>
          )}

          <SocialLoginButtons redirect={redirect} hideDivider />

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("orWithEmail")}
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="name-native" className="mb-1.5 block text-sm font-medium">
                {t("fullName")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name-native"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  required
                  className="w-full rounded-[13px] border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[#6f8577] focus:border-primary-light focus:ring-1 focus:ring-primary-light"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-native" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email-native"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-[13px] border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[#6f8577] focus:border-primary-light focus:ring-1 focus:ring-primary-light"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-native" className="mb-1.5 block text-sm font-medium">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password-native"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  minLength={6}
                  className="w-full rounded-[13px] border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[#6f8577] focus:border-primary-light focus:ring-1 focus:ring-primary-light"
                />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("termsLead")}{" "}
              <Link href="/offer" target="_blank" className="text-primary-light hover:underline">
                {t("termsOffer")}
              </Link>{" "}
              {t("termsAnd")}{" "}
              <Link href="/privacy" target="_blank" className="text-primary-light hover:underline">
                {t("termsPrivacy")}
              </Link>
              .
            </p>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("createAccount")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="font-medium text-primary-light hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <Link href="/">
            <Image
              src="/images/logo-square.png"
              alt="SkyForest"
              width={64}
              height={64}
              className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-xl"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">{t("registerTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("registerSubtitle")}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {refCode ? t("refBonus") : t("welcomeBonus")}
          </div>
        </div>

        <form
          onSubmit={handleRegister}
          className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <p>{error}</p>
              {duplicate && (
                <div className="mt-2 flex gap-3 text-xs font-medium">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(redirect)}`}
                    className="text-primary hover:underline"
                  >
                    {t("signIn")}
                  </Link>
                  <Link href="/forgot-password" className="text-primary hover:underline">
                    {t("forgotPassword")}
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("fullName")}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
                className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
            {t("termsLead")}{" "}
            <Link href="/offer" target="_blank" className="text-primary hover:underline">
              {t("termsOffer")}
            </Link>{" "}
            {t("termsAnd")}{" "}
            <Link href="/privacy" target="_blank" className="text-primary hover:underline">
              {t("termsPrivacy")}
            </Link>
            .
          </p>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("createAccount")}
          </button>

          <div className="mt-6">
            <SocialLoginButtons redirect={redirect} />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="font-medium text-primary hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
