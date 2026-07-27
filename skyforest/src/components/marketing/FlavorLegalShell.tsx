import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";
import type { FlavorConfig } from "@/lib/appFlavor";

/**
 * Оболочка юридических страниц (`/offer`, `/privacy`, `/delete-account`) на
 * поддоменах флейворов.
 *
 * Полная маркетинговая шапка и футер SkyForest здесь неуместны: их ссылки
 * (услуги, блог, тарифы, маркетплейс) в Mushroom Checker и WayBack ведут в
 * недоступные разделы — middleware всё равно вернёт на домашний экран.
 * Поэтому оставляем только логотип приложения, обязательные документы,
 * реквизиты юрлица и версию сборки.
 */
export async function FlavorLegalShell({
  flavor,
  children,
}: {
  flavor: FlavorConfig;
  children: React.ReactNode;
}) {
  const t = await getTranslations("footer");

  const legalLinks = [
    { href: "/offer", label: t("offer") },
    { href: "/privacy", label: t("privacy") },
    { href: "/delete-account", label: t("deleteAccount") },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#0c150f] text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0c150f]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] max-w-3xl items-center gap-2 px-4">
          <Link
            href={flavor.homePath}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            <Image
              src={flavor.faviconPath}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-[9px] border border-[rgba(120,220,150,0.25)]"
            />
            <span className="font-heading text-[15px] font-bold tracking-tight">
              {flavor.name}
            </span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/60 transition-colors hover:text-primary-light"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mt-6 space-y-1.5 text-sm text-white/50">
            <li className="text-white/70">{BRAND.company.legalName}</li>
            {BRAND.company.registrationLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>{BRAND.company.address}</li>
            <li>{BRAND.contacts.email}</li>
          </ul>

          <p className="mt-6 text-xs text-white/40">
            &copy; {new Date().getFullYear()} {flavor.name}. {BRAND.company.copyrightSuffix}
          </p>
          <p className="mt-1 text-[10px] text-white/25">
            v{process.env.NEXT_PUBLIC_APP_VERSION} &middot;{" "}
            {process.env.NEXT_PUBLIC_BUILD_SHA} &middot;{" "}
            {process.env.NEXT_PUBLIC_BUILD_DATE}
          </p>
        </div>
      </footer>
    </div>
  );
}
