"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { authRedirectUrl } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/client";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const isNative = useIsNative();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        // Используется token_hash flow (см. /auth/confirm). Шаблон письма в Supabase
        // должен иметь ссылку:
        //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
        redirectTo: authRedirectUrl("/auth/confirm?next=/reset-password"),
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (isNative) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0b120d] px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2.5rem)] text-foreground">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-7 text-center">
            <Link href="/">
              <Image
                src="/images/logo-square.png"
                alt="SkyForest"
                width={64}
                height={64}
                className="mx-auto mb-4 h-16 w-16 rounded-[18px] border border-[rgba(120,220,150,0.25)]"
              />
            </Link>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">{t("forgotTitle")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#8aa090]">
              {t("forgotSubtitle")}
            </p>
          </div>

          {sent ? (
            <div className="glass rounded-2xl p-6 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary-light" />
              <h2 className="mb-2 font-heading text-lg font-bold">{t("forgotSentTitle")}</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("forgotSentBefore")}
                <strong className="text-foreground">{email}</strong>
                {t("forgotSentAfter")}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-light hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="mb-6">
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

              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("sendLink")}
              </button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-medium text-primary-light hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("forgotBack")}
                </Link>
              </p>
            </form>
          )}
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
              className="mx-auto mb-4 h-16 w-16 rounded-xl"
            />
          </Link>
          <h1 className="text-2xl font-bold">{t("forgotTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("forgotSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
              <h2 className="mb-2 text-lg font-semibold">{t("forgotSentTitle")}</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("forgotSentBefore")}
                <strong>{email}</strong>
                {t("forgotSentAfter")}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
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

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("sendLink")}
              </button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("forgotBack")}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
