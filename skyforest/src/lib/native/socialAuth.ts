/**
 * Нативный вход через Google / Apple внутри оболочки Capacitor.
 *
 * В браузере/PWA этот модуль не используется — там работает web-OAuth
 * (`supabase.auth.signInWithOAuth`, редирект на /auth/callback). Здесь же мы
 * получаем idToken нативным SDK (нативный выбор Google-аккаунта / системный
 * лист Apple ID) и обмениваем его на сессию Supabase через
 * `signInWithIdToken`, минуя веб-редирект.
 *
 * Клиентские ID берём из публичных env-переменных (см. отчёт / .env.local):
 *   - NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID  — Web OAuth client (нужен на всех платформах,
 *     именно его audience проверяет Supabase-провайдер Google);
 *   - NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID  — iOS OAuth client оболочки SkyForest;
 *   - NEXT_PUBLIC_APPLE_SERVICES_ID     — Apple Services ID (нужен только для Apple на Android).
 *
 * iOS-клиент Google привязан к bundle id, поэтому у каждой нативной оболочки он
 * свой: у флейворов — NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID_{CHECKER,WAYBACK}.
 * Обратная схема того же клиента должна лежать в CFBundleURLTypes оболочки.
 *
 * Плагин подгружается динамически, чтобы нативный код не попадал в серверный/веб-бандл.
 */

import { createClient } from "@/lib/supabase/client";
import { getClientFlavor, type AppFlavor } from "@/lib/appFlavor";
import { getPlatform } from "./capacitor";

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;

/** iOS OAuth client Google — свой на каждый bundle id нативной оболочки. */
const GOOGLE_IOS_CLIENT_ID_BY_FLAVOR: Record<AppFlavor, string | undefined> = {
  skyforest: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  checker: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID_CHECKER,
  wayback: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID_WAYBACK,
};

function googleIosClientId(): string | undefined {
  return GOOGLE_IOS_CLIENT_ID_BY_FLAVOR[getClientFlavor()];
}

/** Пользователь закрыл системный лист входа — это не ошибка, показывать нечего. */
export class SocialSignInCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialSignInCancelled";
  }
}

function isUserCancelled(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "USER_CANCELLED") return true;
  const msg = (e.message || "").toLowerCase();
  return (
    msg.includes("cancel") ||
    msg.includes("canceled") ||
    msg.includes("the user canceled") ||
    msg.includes("1001") // ASAuthorizationError.canceled
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Пара nonce по требованию Supabase:
 *   - rawNonce  → передаётся в `signInWithIdToken` (Supabase сам хеширует и сверяет);
 *   - nonceDigest (SHA-256, hex) → передаётся провайдеру, попадает в claim `nonce` idToken.
 */
async function getNoncePair(): Promise<{ rawNonce: string; nonceDigest: string }> {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const rawNonce = toHex(rawBytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
  const nonceDigest = toHex(new Uint8Array(digest));
  return { rawNonce, nonceDigest };
}

/**
 * Есть ли в idToken claim `nonce`.
 *
 * Supabase требует, чтобы nonce либо был с обеих сторон, либо отсутствовал с
 * обеих: иначе — «Passed nonce and nonce in id_token should either both exist
 * or not». Apple claim возвращает, а Google на iOS — нет: плагин не прокидывает
 * nonce в GIDSignIn. Поэтому смотрим на сам токен, а не на провайдера — если
 * плагин однажды начнёт его прокидывать, сверка включится сама.
 */
function hasNonceClaim(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return Boolean(JSON.parse(json)?.nonce);
  } catch {
    return false;
  }
}

/**
 * Устанавливаем сессию Supabase по idToken провайдера.
 *
 * Если провайдер nonce не вернул, не передаём его и мы. Защита от повторного
 * использования токена при этом слабее, но токен всё равно проверяется по
 * подписи, audience и сроку, а получен он нативным SDK внутри процесса, без
 * редиректов — перехватывать его негде.
 */
async function signInSupabase(
  provider: "google" | "apple",
  token: string,
  nonce?: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider,
    token,
    nonce: hasNonceClaim(token) ? nonce : undefined,
  });
  if (error) throw error;
}

/**
 * Нативный вход через Google. Возвращается только после установки сессии Supabase.
 * @throws SocialSignInCancelled — если пользователь закрыл окно выбора аккаунта.
 */
export async function nativeGoogleSignIn(): Promise<void> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured");
  }
  const platform = getPlatform();
  const iosClientId = googleIosClientId();
  if (platform === "ios" && !iosClientId) {
    // Без iOS-клиента плагин ушёл бы с web-клиентом и Google ответил бы
    // «Custom scheme URIs are not allowed for Web client type».
    throw new Error("Google iOS client id is not configured for this app");
  }
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  const { rawNonce, nonceDigest } = await getNoncePair();

  try {
    await SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        ...(platform === "ios" && iosClientId ? { iOSClientId: iosClientId } : {}),
        mode: "online", // нужен idToken
      },
    });

    const { result } = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"], nonce: nonceDigest },
    });

    if (result.responseType !== "online" || !result.idToken) {
      throw new Error("Google did not return an idToken");
    }
    await signInSupabase("google", result.idToken, rawNonce);
  } catch (err) {
    if (isUserCancelled(err)) throw new SocialSignInCancelled();
    throw err;
  }
}

/**
 * Нативный вход через Apple. На iOS используется системный лист Apple ID
 * (bundle id как clientId — берётся автоматически). На Android нужен Services ID
 * и работает redirect-поток провайдера.
 * @throws SocialSignInCancelled — если пользователь отменил вход.
 */
export async function nativeAppleSignIn(): Promise<void> {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  const platform = getPlatform();
  const { rawNonce, nonceDigest } = await getNoncePair();

  try {
    await SocialLogin.initialize({
      apple: {
        // iOS: clientId не нужен (используется bundle id). Android: Services ID.
        ...(platform === "android" && APPLE_SERVICES_ID
          ? { clientId: APPLE_SERVICES_ID, useBroadcastChannel: true }
          : {}),
      },
    });

    const { result } = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["name", "email"], nonce: nonceDigest },
    });

    if (!result.idToken) {
      throw new Error("Apple did not return an idToken");
    }
    await signInSupabase("apple", result.idToken, rawNonce);
  } catch (err) {
    if (isUserCancelled(err)) throw new SocialSignInCancelled();
    throw err;
  }
}

/** Показывать ли кнопку Apple: iOS всегда, Android — только если задан Services ID. */
export function isAppleSignInAvailable(): boolean {
  const platform = getPlatform();
  if (platform === "ios") return true;
  if (platform === "android") return Boolean(APPLE_SERVICES_ID);
  return false;
}
