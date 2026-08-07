import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { stripLocalePrefix } from "./lib/stripLocalePath";
import {
  flavorFromHost,
  flavorConfig,
  internalRewrite,
  isAnonymousAllowed,
  isFlavorLocale,
  isInternalPath,
  isPathAllowed,
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

  // Флейвор по хосту: checker./wayback. — урезанные приложения на поддоменах.
  const flavor = flavorFromHost(request.headers.get("host"));
  const flavorCfg = flavorConfig(flavor);
  const flavorPathname = stripLocalePrefix(rawPathname);

  // Локаль запроса. Префикс в URL решает; какая локаль идёт без префикса,
  // зависит от сборки (`routing.defaultLocale`). У приложений с собственным
  // деревом роутов основной язык свой (Checker и WayBack — английский), и он
  // не должен зависеть от того, вместе с каким сайтом их задеплоили; явный
  // выбор пользователя (кука переключателя языка) важнее дефолта.
  const urlLocale = routing.locales.find(
    (loc) => rawPathname === `/${loc}` || rawPathname.startsWith(`/${loc}/`),
  );

  // Язык из URL, которого это приложение не знает. Маршруты испанского,
  // польского и французского есть в сборке ради WayBack (src/i18n/locales.ts),
  // но у SkyForest и Checker на этих языках нет ни строчки копии. Показать по
  // такому адресу английскую заглушку под испанским префиксом — хуже, чем
  // честно увести на тот же путь без префикса, где приложение говорит на своём
  // языке. Проверка стоит до всего остального: дальше `locale` уже подставляют
  // в редиректы и в rewrite.
  if (urlLocale && !isFlavorLocale(flavor, urlLocale)) {
    const withoutLocale = request.nextUrl.clone();
    withoutLocale.pathname = flavorPathname;
    return NextResponse.redirect(withoutLocale);
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale =
    urlLocale ??
    (flavor === "skyforest"
      ? routing.defaultLocale
      : // Кука переживает переход между приложениями на соседних поддоменах, и
        // язык из неё может быть чужим: испанский из WayBack не должен всплыть
        // в Mushroom Checker. Спрашиваем у приложения, а не у сборки.
        (flavorCfg.locales.find((loc) => loc === cookieLocale) ??
        flavorCfg.defaultLocale));
  // Публичные URL остаются без префикса для локали по умолчанию (as-needed).
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  request.cookies.set("NEXT_LOCALE", locale);

  // Сегменты вида /ck/* — внутренние: их отдаём только через rewrite ниже,
  // по прямому URL (на любом хосте) они не должны открываться.
  if (isInternalPath(flavorPathname)) {
    return NextResponse.redirect(
      new URL(localePrefix + flavorCfg.homePath, request.url),
    );
  }

  // Флейвор с собственным деревом роутов (Mushroom Checker → /ck/*): путь
  // подменяется в самом конце, после проверок авторизации и MFA, иначе они
  // бы применялись к внутреннему пути и переставали работать.
  const rewriteTo = internalRewrite(
    flavor,
    flavorPathname === "" ? "/" : flavorPathname,
  );
  const rewriteUrl = rewriteTo ? request.nextUrl.clone() : null;
  if (rewriteUrl && rewriteTo) {
    rewriteUrl.pathname = `/${locale}${rewriteTo}`;
  }

  if (flavor !== "skyforest") {
    // Корень поддомена — простая посадочная (rewrite: URL остаётся "/").
    if (!rewriteUrl && (flavorPathname === "/" || flavorPathname === "")) {
      return NextResponse.rewrite(
        new URL(`/${locale}/landing/${flavor}`, request.url),
        { request },
      );
    }
    // Чужие маршруты (погода, маркетплейс, блог...) → домашняя флейвора.
    if (!isPathAllowed(flavor, flavorPathname)) {
      return NextResponse.redirect(
        new URL(localePrefix + flavorCfg.homePath, request.url),
      );
    }
  }

  const makeResponse = () => {
    const res = rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request })
      : NextResponse.next({ request });
    intlResponse.headers.forEach((value, key) => {
      // Свой rewrite важнее внутреннего rewrite next-intl: путь уже с локалью.
      if (rewriteUrl && key === "x-middleware-rewrite") return;
      // Куку локали ставим сами: next-intl выводит её из URL и на флейворе с
      // другим основным языком записал бы не то, что показано на экране.
      if (key === "set-cookie") return;
      res.headers.set(key, value);
    });
    res.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  };

  let response = makeResponse();

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
          response = makeResponse();
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
    const loginUrl = new URL(`${localePrefix}/login`, request.url);
    loginUrl.searchParams.set("redirect", rawPathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    return NextResponse.redirect(
      new URL(localePrefix + flavorCfg.homePath, request.url)
    );
  }

  if (user && (isProtected || isMfaPage)) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const currentLevel = aalData?.currentLevel;
    const nextLevel = aalData?.nextLevel;

    if (nextLevel === "aal2" && currentLevel === "aal1" && !isMfaPage) {
      return NextResponse.redirect(
        new URL(`${localePrefix}/verify-mfa`, request.url)
      );
    }

    if (isMfaPage && currentLevel === "aal2") {
      return NextResponse.redirect(
        new URL(localePrefix + flavorCfg.homePath, request.url)
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
