"use client";

/**
 * Соц-вход в схеме WayBack «Widget Board»: Google — светлая кнопка на
 * поверхности #f4f6f3, Apple — тёмная (#141a15). Логика идентична общему
 * SocialLoginButtons: в нативе — SDK → idToken → Supabase, в вебе — OAuth
 * с редиректом.
 */

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
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
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
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.37 12.62c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.29 2-1.4 2.43-.36 6.02 1.01 7.99.67.96 1.47 2.04 2.52 2 1.01-.04 1.39-.65 2.62-.65 1.22 0 1.57.65 2.63.63 1.09-.02 1.78-.98 2.44-1.95.77-1.12 1.09-2.2 1.11-2.26-.02-.01-2.13-.82-2.15-3.25ZM14.4 6.66c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.97 1.56-.85 2.48.9.07 1.83-.46 2.39-1.13Z" />
    </svg>
  );
}

export function WayBackSocialButtons({ redirect }: { redirect: string }) {
  const t = useTranslations("wayback.auth");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  const native = isNativeApp();
  const showApple = native ? isAppleSignInAvailable() : true;

  const handle = async (provider: Provider) => {
    setBusy(provider);
    setError("");
    try {
      if (native) {
        if (provider === "google") await nativeGoogleSignIn();
        else await nativeAppleSignIn();
        const supabase = createClient();
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasTotp = factors?.totp?.some((f) => f.status === "verified");
        router.push(hasTotp ? "/verify-mfa" : redirect);
        router.refresh();
        return;
      }

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
    } catch (err) {
      if (err instanceof SocialSignInCancelled) {
        setBusy(null);
        return;
      }
      setError((err as Error)?.message || tAuth("socialError"));
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {error && (
        <div className="wb-tile-danger px-4 py-3 text-[13.5px] font-bold text-wb-danger">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => handle("google")}
        disabled={busy !== null}
        className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[18px] bg-wb-surface-2 text-[15px] font-bold text-wb-ink disabled:opacity-55"
      >
        {busy === "google" ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {t("google")}
      </button>

      {showApple && (
        <button
          type="button"
          onClick={() => handle("apple")}
          disabled={busy !== null}
          className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[18px] bg-wb-ink text-[15px] font-bold text-white disabled:opacity-55"
        >
          {busy === "apple" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AppleIcon />
          )}
          {t("apple")}
        </button>
      )}
    </div>
  );
}

/** Разделитель «OR WITH EMAIL». */
export function WayBackAuthDivider() {
  const t = useTranslations("wayback.auth");
  return (
    <div className="flex items-center gap-3 py-1">
      <i className="h-px flex-1 bg-wb-border" />
      <span className="wb-mono text-[10px] tracking-[0.12em] text-wb-muted-2">
        {t("orWithEmail")}
      </span>
      <i className="h-px flex-1 bg-wb-border" />
    </div>
  );
}
