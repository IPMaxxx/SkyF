"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

type Step = "idle" | "enrolling" | "confirming" | "disabling";

export function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.filter((f) => f.status === "verified") ?? [];
    setEnabled(verified.length > 0);
    if (verified.length > 0) setFactorId(verified[0].id);
    setLoading(false);
  };

  const handleEnroll = async () => {
    setStep("enrolling");
    setError("");
    setSuccess("");
    const supabase = createClient();

    const allFactors = (await supabase.auth.mfa.listFactors()).data?.totp ?? [];
    for (const f of allFactors) {
      if ((f.status as string) === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "SkyForest",
    });

    if (enrollErr || !data) {
      setError(enrollErr?.message || "Ошибка подключения 2FA");
      setStep("idle");
      return;
    }

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep("confirming");
    setTimeout(() => inputsRef.current[0]?.focus(), 100);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) {
      confirmEnroll(next.join(""));
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
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    if (pasted.length === 6) confirmEnroll(pasted);
    else inputsRef.current[pasted.length]?.focus();
  };

  const confirmEnroll = async (otp: string) => {
    if (!factorId || verifying) return;
    setVerifying(true);
    setError("");

    const supabase = createClient();
    const { data: challenge, error: chErr } =
      await supabase.auth.mfa.challenge({ factorId });

    if (chErr || !challenge) {
      setError("Ошибка верификации");
      setVerifying(false);
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: otp,
    });

    if (vErr) {
      setError("Неверный код. Попробуйте ещё раз.");
      setCode(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      setVerifying(false);
      return;
    }

    setEnabled(true);
    setStep("idle");
    setQrCode(null);
    setSecret(null);
    setSuccess("Двухфакторная аутентификация включена");
    setVerifying(false);
  };

  const handleDisable = async () => {
    if (!factorId) return;
    setStep("disabling");
    setError("");
    setSuccess("");

    const supabase = createClient();
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId });

    if (unenrollErr) {
      setError(unenrollErr.message || "Ошибка отключения 2FA");
      setStep("idle");
      return;
    }

    setEnabled(false);
    setFactorId(null);
    setStep("idle");
    setSuccess("Двухфакторная аутентификация отключена");
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка...
      </div>
    );
  }

  return (
    <div>
      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && step === "idle" && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === "idle" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <ShieldOff className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">
                {enabled ? "2FA включена" : "2FA отключена"}
              </p>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? "Аккаунт защищён приложением-аутентификатором"
                  : "Добавьте дополнительную защиту аккаунта"}
              </p>
            </div>
          </div>
          {enabled ? (
            <button
              onClick={handleDisable}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Отключить
            </button>
          ) : (
            <button
              onClick={handleEnroll}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Включить
            </button>
          )}
        </div>
      )}

      {step === "confirming" && qrCode && (
        <div>
          <p className="mb-3 text-sm font-medium">
            Отсканируйте QR-код в приложении-аутентификаторе
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Google Authenticator, Authy или другое TOTP-приложение
          </p>

          <div className="mb-4 flex justify-center rounded-xl bg-white p-4">
            <img src={qrCode} alt="QR-код для 2FA" className="h-48 w-48" />
          </div>

          {secret && (
            <div className="mb-4">
              <p className="mb-1 text-xs text-muted-foreground">
                Или введите ключ вручную:
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <code className="flex-1 break-all text-xs font-mono text-gray-700">
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="mb-3 text-sm font-medium">Введите код из приложения</p>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="mb-4 flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifying}
                className="h-11 w-9 rounded-lg border border-border bg-white text-center text-lg font-bold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
            ))}
          </div>

          {verifying && (
            <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Проверка...
            </div>
          )}

          <button
            onClick={() => {
              setStep("idle");
              setQrCode(null);
              setSecret(null);
              setCode(["", "", "", "", "", ""]);
              setError("");
            }}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      )}

      {step === "disabling" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Отключение 2FA...
        </div>
      )}

      {step === "enrolling" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Подготовка...
        </div>
      )}
    </div>
  );
}
