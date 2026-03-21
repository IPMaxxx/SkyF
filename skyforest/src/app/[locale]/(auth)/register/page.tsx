"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
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
          {refCode && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {t("refBonus")}
            </div>
          )}
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
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
