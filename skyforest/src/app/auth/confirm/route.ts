import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_NEXT = ["/dashboard", "/payment", "/account", "/reset-password"];

function sanitizeNext(next: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  const ok = ALLOWED_NEXT.some((p) => next.startsWith(p));
  return ok ? next : "/dashboard";
}

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
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 *
 * В отличие от PKCE-flow ?code=..., здесь:
 *   - ссылка не одноразовая по факту скана (token_hash верифицируется именно при verifyOtp),
 *     поэтому Gmail/Outlook сканеры не «съедают» сессию;
 *   - не нужен code_verifier из cookies браузера — работает даже если письмо
 *     открыто в другом браузере / встроенном webview.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next") || "/dashboard");

  if (tokenHash && type && VALID_OTP_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
