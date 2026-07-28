import { BRAND } from "@/lib/brand";

/** Canonical site origin for auth redirects (no trailing slash). */
export function getAppOrigin(): string {
  // В браузере — фактический origin страницы. Supabase хранит PKCE code_verifier
  // в host-only cookie, поэтому вернуться после провайдера нужно ровно на тот
  // хост, с которого ушли. Иначе на поддоменах флейворов (checker./wayback.)
  // и на apex-домене обмен ?code= в /auth/callback падает и пользователя
  // выбрасывает на /login?error=auth_failed.
  if (typeof window !== "undefined") return window.location.origin;

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  // На сервере фактического хоста тут нет: берём адрес сборки (.by vs .ai).
  return BRAND.url.replace(/\/$/, "");
}

/** Build an absolute auth callback/confirm URL on the current site origin. */
export function authRedirectUrl(path: string): string {
  return `${getAppOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
