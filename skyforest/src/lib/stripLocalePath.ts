/** Strip optional `/en` prefix from pathname (default locale `ru` has no prefix). */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const rest = pathname === "/en" ? "/" : pathname.slice("/en".length);
    return rest === "" ? "/" : rest;
  }
  return pathname;
}
