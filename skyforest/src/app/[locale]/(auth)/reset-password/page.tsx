"use client";

import { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <Link href="/">
            <Image
              src="/images/logo-square.png"
              alt="SkyForest"
              width={64}
              height={64}
              className="mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16 rounded-xl"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">{t("resetTitle")}</h1>
          <p className="mt-1.5 sm:mt-2 text-sm text-muted-foreground">
            {t("resetSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
              <h2 className="mb-2 text-lg font-semibold">{t("passwordUpdated")}</h2>
              <p className="text-sm text-muted-foreground">{t("redirecting")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

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
                    className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
                {t("setNewPassword")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
