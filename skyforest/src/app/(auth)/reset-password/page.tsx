"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
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
        <div className="mb-8 text-center">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="Skyforest"
              width={160}
              height={50}
              className="mx-auto mb-4 h-12 w-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold">Новый пароль</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Придумайте новый пароль для вашего аккаунта
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
              <h2 className="mb-2 text-lg font-semibold">Пароль обновлён</h2>
              <p className="text-sm text-muted-foreground">
                Перенаправляем в кабинет...
              </p>
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
                  Новый пароль
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
                  Подтвердите пароль
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
                Установить новый пароль
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
