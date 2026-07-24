"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const isNative = useIsNative();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState<null | boolean>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // Проверяем, есть ли активная сессия (после успешного verifyOtp / exchangeCodeForSession).
    // Если нет — значит ссылка из письма уже была использована, истекла или открыта в
    // другом браузере. Показываем понятную ошибку вместо «тихой» поломки updateUser.
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setSessionReady(Boolean(data.user));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setSessionReady(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordMin"));
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    }
    setLoading(false);
  };

  const inputClass = isNative
    ? "w-full rounded-[13px] border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[#6f8577] focus:border-primary-light focus:ring-1 focus:ring-primary-light"
    : "w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
  const errorClass = isNative
    ? "mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400"
    : "mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600";
  const accent = isNative ? "text-primary-light" : "text-emerald-500";

  return (
    <div
      className={
        isNative
          ? "flex min-h-screen items-center justify-center bg-[#0b120d] px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2.5rem)] text-foreground"
          : "flex min-h-screen items-center justify-center bg-muted px-4"
      }
    >
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <Link href="/">
            <Image
              src="/images/logo-square.png"
              alt="SkyForest"
              width={64}
              height={64}
              className={
                isNative
                  ? "mx-auto mb-4 h-16 w-16 rounded-[18px] border border-[rgba(120,220,150,0.25)]"
                  : "mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16 rounded-xl"
              }
            />
          </Link>
          <h1 className={isNative ? "font-heading text-2xl font-extrabold tracking-tight" : "text-xl sm:text-2xl font-bold"}>
            {t("resetTitle")}
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm text-muted-foreground">
            {t("resetSubtitle")}
          </p>
        </div>

        <div className={isNative ? "glass rounded-2xl p-5 sm:p-8" : "rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm"}>
          {done ? (
            <div className="text-center">
              <CheckCircle2 className={`mx-auto mb-4 h-12 w-12 ${accent}`} />
              <h2 className="mb-2 text-lg font-semibold">{t("passwordUpdated")}</h2>
              <p className="text-sm text-muted-foreground">{t("redirecting")}</p>
            </div>
          ) : sessionReady === null ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessionReady === false ? (
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
              <h2 className="mb-2 text-lg font-semibold">{t("resetLinkInvalidTitle")}</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("resetLinkInvalidBody")}
              </p>
              <Link
                href="/forgot-password"
                className={
                  isNative
                    ? "btn-primary inline-flex items-center justify-center rounded-[13px] px-4 py-2.5 text-sm"
                    : "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
                }
              >
                {t("resetLinkRequestNew")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className={errorClass}>{error}</div>}

              <div className="mb-4">
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  {t("newPasswordLabel")}
                </label>
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
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
                  {t("confirmPasswordLabel")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={
                  isNative
                    ? "btn-primary flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] disabled:opacity-50"
                    : "flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                }
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("setNewPassword")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
