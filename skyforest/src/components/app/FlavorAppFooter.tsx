"use client";

/**
 * Компактный футер кабинета для флейворов в браузере.
 *
 * Полный футер SkyForest (услуги, блог, соцсети, платёжные системы, «получить
 * приложение») ведёт в разделы, которых в Mushroom Checker и WayBack нет.
 * Здесь остаются только обязательные документы, реквизиты и версия сборки.
 */

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { useFlavorBrand } from "@/lib/useFlavorBrand";

export function FlavorAppFooter() {
  const t = useTranslations("footer");
  const brand = useFlavorBrand();

  const legalLinks = [
    { href: "/offer", label: t("offer") },
    { href: "/privacy", label: t("privacy") },
    { href: "/delete-account", label: t("deleteAccount") },
  ];

  return (
    <footer className="relative border-t border-white/10">
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
        <p className="mt-5 text-xs text-white/40">
          &copy; {new Date().getFullYear()} {brand.name}. {BRAND.company.copyrightSuffix}
        </p>
        <p className="mt-1 text-[10px] text-white/25">
          v{process.env.NEXT_PUBLIC_APP_VERSION} &middot;{" "}
          {process.env.NEXT_PUBLIC_BUILD_SHA} &middot;{" "}
          {process.env.NEXT_PUBLIC_BUILD_DATE}
        </p>
      </div>
    </footer>
  );
}
