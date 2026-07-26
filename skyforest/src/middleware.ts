import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { stripLocalePrefix } from "./lib/stripLocalePath";
import {
  flavorFromHost,
  flavorConfig,
  isPathAllowed,
  isAnonymousAllowed,
} from "./lib/appFlavor";

const PROTECTED_PATHS = ["/dashboard", "/payment", "/account"];
const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: false,
});

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  const rawPathname = request.nextUrl.pathname;
  const isEn = rawPathname === "/en" || rawPathname.startsWith("/en/");
  request.cookies.set("NEXT_LOCALE", isEn ? "en" : "ru");

  // Флейвор по хосту: checker./wayback. — урезанные приложения на поддоменах.
  const flavor = flavorFromHost(request.headers.get("host"));
  const flavorCfg = flavorConfig(flavor);
  const flavorPathname = stripLocalePrefix(rawPathname);

  if (flavor !== "skyforest") {
    // Корень поддомена — простая посадочная (rewrite: URL остаётся "/").
    if (flavorPathname === "/" || flavorPathname === "") {
      return NextResponse.rewrite(
        new URL(`${isEn ? "/en" : "/ru"}/landing/${flavor}`, request.url),
      );
    }
    // Чужие маршруты (погода, маркетплейс, блог...) → домашняя флейвора.
    if (!isPathAllowed(flavor, flavorPathname)) {
      return NextResponse.redirect(
        new URL((isEn ? "/en" : "") + flavorCfg.homePath, request.url),
      );
    }
  }

  let response = NextResponse.next({ request });
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          intlResponse.headers.forEach((value, key) => {
            response.headers.set(key, value);
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = stripLocalePrefix(rawPathname);
  const isProtected =
    PROTECTED_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    ) && !isAnonymousAllowed(flavor, pathname);
  const isMfaPage = pathname === "/verify-mfa";

  if (isProtected && !user) {
    const loginUrl = new URL(isEn ? "/en/login" : "/login", request.url);
    loginUrl.searchParams.set("redirect", rawPathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    return NextResponse.redirect(
      new URL((isEn ? "/en" : "") + flavorCfg.homePath, request.url)
    );
  }

  if (user && (isProtected || isMfaPage)) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const currentLevel = aalData?.currentLevel;
    const nextLevel = aalData?.nextLevel;

    if (nextLevel === "aal2" && currentLevel === "aal1" && !isMfaPage) {
      return NextResponse.redirect(
        new URL(isEn ? "/en/verify-mfa" : "/verify-mfa", request.url)
      );
    }

    if (isMfaPage && currentLevel === "aal2") {
      return NextResponse.redirect(
        new URL((isEn ? "/en" : "") + flavorCfg.homePath, request.url)
      );
    }
  }

  return response;
}

export const config = {
  // `auth` исключён: роуты app/auth/* лежат вне сегмента [locale]. Если их пропустить
  // через next-intl, он переписывает /auth/* в /[locale]/auth/*, которого не существует,
  // и запрос отдаёт 404 (ломая /auth/callback и /auth/confirm — сброс пароля и OAuth).
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
