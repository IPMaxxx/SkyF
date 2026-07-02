"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { useIsNative } from "@/lib/native/useIsNative";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const t = useTranslations("auth");
  const isNative = useIsNative();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      setError(t("authFailed"));
    }
  }, [searchParams, t]);

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
          ? t("invalidCredentials")
          : authError.message
      );
      setLoading(false);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasTotp = factors?.totp?.some((f) => f.status === "verified");

    if (hasTotp) {
      router.push("/verify-mfa");
    } else {
      router.push(redirect);
    }
    router.refresh();
  };

  if (isNative) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0f1a12] px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2.5rem)] text-foreground">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 text-center">
            <Image
              src="/images/logo-square.png"
              alt="SkyForest"
              width={88}
              height={88}
              priority
              className="mx-auto mb-5 h-20 w-20 rounded-2xl shadow-lg shadow-black/30"
            />
            <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("nativeSlogan")}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Соц-вход — основной способ на первом экране */}
          <SocialLoginButtons redirect={redirect} hideDivider />

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("orWithEmail")}
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email-вход — вторичный */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password-native" className="text-sm font-medium">
                  {t("password")}
                </label>
                <Link href="/forgot-password" className="text-xs text-primary-light hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password-native"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("signIn")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="font-medium text-primary-light hover:underline"
            >
              {t("signUp")}
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
          <h1 className="text-xl sm:text-2xl font-bold">{t("loginTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

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
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                {t("password")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("signIn")}
          </button>

          <div className="mt-6">
            <SocialLoginButtons redirect={redirect} />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="font-medium text-primary hover:underline"
            >
              {t("signUp")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
