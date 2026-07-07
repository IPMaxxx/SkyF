import { BRAND } from "@/lib/brand";

/** Canonical site origin for auth redirects (no trailing slash). */
export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  // Build-time brand URL matches the deployment (.by vs .ai) and avoids
  // www/apex mismatches that break Supabase OAuth PKCE cookies.
  return BRAND.url.replace(/\/$/, "");
}

/** Build an absolute auth callback/confirm URL on the canonical deployment origin. */
export function authRedirectUrl(path: string): string {
  return `${getAppOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
