import {
  flavorConfig,
  isPathAllowed,
  type AppFlavor,
} from "@/lib/appFlavor";
import { BRAND, getBrand } from "@/lib/brand";

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

/** Домены продуктов: apex, www и поддомены приложений (checker./wayback.). */
const APP_DOMAINS = [getBrand("skyforest").domain, getBrand("samplify").domain];

/** Наш ли это хост. Нужен, чтобы ссылка из письма не стала открытым редиректом. */
export function isAppHost(host: string | null | undefined): boolean {
  const h = (host || "").toLowerCase().split(":")[0];
  if (h === "localhost" || h === "127.0.0.1") return true;
  return APP_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
}

/** Пути, на которые можно уйти сразу после подтверждения почты или OAuth. */
const AUTH_NEXT_PREFIXES = [
  "/dashboard",
  "/payment",
  "/account",
  "/reset-password",
];

/**
 * Куда пустить пользователя после подтверждения письма или OAuth.
 *
 * Домашний экран у каждого приложения свой (`homePath`), поэтому общий
 * `/dashboard` годится только для SkyForest: в Checker и WayBack такого
 * маршрута нет, и middleware всё равно увёл бы с него на домашнюю — лишним
 * редиректом и через промежуточный экран.
 */
export function resolveAuthNext(
  next: string | null | undefined,
  flavor: AppFlavor,
): string {
  const home = flavorConfig(flavor).homePath;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  const [path] = next.split(/[?#]/);
  const allowed =
    AUTH_NEXT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) &&
    isPathAllowed(flavor, path);
  return allowed ? next : home;
}

/**
 * Абсолютный адрес нашего же продукта, но на другом хосте.
 *
 * Ссылку в письме Supabase строит от Site URL проекта, а проект Auth один на
 * все три домена, поэтому подтверждение регистрации в Checker или WayBack
 * может прийти на хост SkyForest. Сессия ставится cookie тому хосту, который
 * проверил token_hash, так что токен нужно передать на нужный хост
 * НЕПОТРАЧЕННЫМ, а не проверять его на чужом домене.
 */
export function crossHostAuthTarget(
  next: string | null | undefined,
  currentHost: string | null | undefined,
): { origin: string; next: string | null } | null {
  if (!next || !/^https?:\/\//i.test(next)) return null;

  let url: URL;
  try {
    url = new URL(next);
  } catch {
    return null;
  }

  const host = url.host.toLowerCase();
  if (!isAppHost(host)) return null;
  if (host === (currentHost || "").toLowerCase()) return null;

  // Внутри может лежать относительный путь (…/auth/confirm?next=/dashboard/track):
  // на целевой хост отдаём именно его, иначе хосты гоняли бы ссылку по кругу.
  const inner = url.searchParams.get("next");
  const fallback = url.pathname.startsWith("/auth/") ? null : url.pathname;
  return { origin: url.origin, next: inner || fallback };
}
