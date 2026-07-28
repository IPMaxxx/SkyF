import type { EmailOtpType } from "@supabase/supabase-js";
import { flavorFromHost } from "@/lib/appFlavor";
import { crossHostAuthTarget, resolveAuthNext } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Token-hash based email confirmation (Supabase recommended SSR pattern).
 *
 * Письма (recovery, signup confirmation, magic-link и т.п.) шлются с шаблоном вида:
 *   {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery
 * где `{{ .RedirectTo }}` — переданный при регистрации emailRedirectTo, то есть
 * /auth/confirm?next=… на том хосте, с которого пользователь регистрировался.
 *
 * В отличие от PKCE-flow ?code=..., здесь:
 *   - ссылка не одноразовая по факту скана (token_hash верифицируется именно при verifyOtp),
 *     поэтому Gmail/Outlook сканеры не «съедают» сессию;
 *   - не нужен code_verifier из cookies браузера — работает даже если письмо
 *     открыто в другом браузере / встроенном webview.
 *
 * Проект Auth один на три домена, поэтому `next` в письме может оказаться
 * абсолютным адресом другого приложения: `{{ .RedirectTo }}` в шаблоне — это
 * хост, с которого регистрировались, а база ссылки — общий Site URL.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const host = request.headers.get("host");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");

  if (tokenHash && type && VALID_OTP_TYPES.includes(type)) {
    // Письмо привело на чужой хост: отдаём токен нужному приложению, пока он
    // не потрачен, иначе cookie сессии останется на этом домене.
    const target = crossHostAuthTarget(rawNext, host);
    if (target) {
      const handoff = new URL("/auth/confirm", target.origin);
      handoff.searchParams.set("token_hash", tokenHash);
      handoff.searchParams.set("type", type);
      if (target.next) handoff.searchParams.set("next", target.next);
      return NextResponse.redirect(handoff);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const next = resolveAuthNext(rawNext, flavorFromHost(host));
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
