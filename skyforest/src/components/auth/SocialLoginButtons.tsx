"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authRedirectUrl } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  nativeGoogleSignIn,
  nativeAppleSignIn,
  isAppleSignInAvailable,
  SocialSignInCancelled,
} from "@/lib/native/socialAuth";

type Provider = "google" | "apple";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.85 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M16.37 12.62c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.29 2-1.4 2.43-.36 6.02 1.01 7.99.67.96 1.47 2.04 2.52 2 1.01-.04 1.39-.65 2.62-.65 1.22 0 1.57.65 2.63.63 1.09-.02 1.78-.98 2.44-1.95.77-1.12 1.09-2.2 1.11-2.26-.02-.01-2.13-.82-2.15-3.25ZM14.4 6.66c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.97 1.56-.85 2.48.9.07 1.83-.46 2.39-1.13Z" />
    </svg>
  );
}

/**
 * Кнопки соц-входа для страниц login/register.
 *  - В нативной оболочке (Capacitor) вызываем нативный SDK → idToken → Supabase.
 *  - В браузере/PWA работает штатный web-OAuth Supabase с редиректом на /auth/callback.
 */
export function SocialLoginButtons({
  redirect,
  hideDivider = false,
}: {
  redirect: string;
  /** Скрыть верхний разделитель «или» (для native-логина, где соц-кнопки идут первыми). */
  hideDivider?: boolean;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  const native = isNativeApp();
  const showApple = native ? isAppleSignInAvailable() : true;

  const afterNativeSignIn = async () => {
    // Повторяем логику страницы входа: учитываем возможный 2FA.
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasTotp = factors?.totp?.some((f) => f.status === "verified");
    router.push(hasTotp ? "/verify-mfa" : redirect);
    router.refresh();
  };

  const handle = async (provider: Provider) => {
    setBusy(provider);
    setError("");
    try {
      if (native) {
        if (provider === "google") await nativeGoogleSignIn();
        else await nativeAppleSignIn();
        await afterNativeSignIn();
        return;
      }

      // Web: штатный OAuth-редирект Supabase (страница уходит на провайдера).
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRedirectUrl(
            `/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          ),
        },
      });
      if (oauthError) throw oauthError;
      // При успехе браузер уже уходит на провайдера — busy оставляем.
    } catch (err) {
      if (err instanceof SocialSignInCancelled) {
        setBusy(null);
        return;
      }
      setError((err as Error)?.message || t("socialError"));
      setBusy(null);
    }
  };

  return (
    <div className="mb-6">
      {!hideDivider && (
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("orContinueWith")}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => handle("google")}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {t("continueWithGoogle")}
        </button>

        {showApple && (
          <button
            type="button"
            onClick={() => handle("apple")}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-black bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
          >
            {busy === "apple" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <AppleIcon />
            )}
            {t("continueWithApple")}
          </button>
        )}
      </div>
    </div>
  );
}
