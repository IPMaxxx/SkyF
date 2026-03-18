"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";

export default function VerifyMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.[0];
      if (!totp) {
        router.replace("/dashboard");
        return;
      }
      setFactorId(totp.id);
      inputsRef.current[0]?.focus();
    };
    init();
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "") && next.join("").length === 6) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setCode(next);
    if (pasted.length === 6) {
      handleVerify(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  const handleVerify = async (otp: string) => {
    if (!factorId || loading) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeErr || !challenge) {
      setError("Ошибка верификации. Попробуйте ещё раз.");
      setLoading(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: otp,
    });

    if (verifyErr) {
      setError("Неверный код. Попробуйте ещё раз.");
      setCode(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/">
            <Image
              src="/images/logo-square.png"
              alt="SkyForest"
              width={64}
              height={64}
              className="mx-auto mb-4 h-14 w-14 rounded-xl"
            />
          </Link>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Двухфакторная проверка</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Введите 6-значный код из приложения-аутентификатора
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="h-12 w-10 rounded-lg border border-border bg-white text-center text-lg font-bold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
            ))}
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Проверка...
            </div>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Откройте Google Authenticator, Authy или другое приложение и введите текущий код
          </p>

          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти и войти другим способом
          </button>
        </div>
      </div>
    </div>
  );
}
