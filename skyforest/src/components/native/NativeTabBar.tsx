"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  Sun,
  ScanSearch,
  BarChart3,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  labelKey: "home" | "weather" | "identify" | "compare" | "trackTab";
  icon: typeof Home;
  exact?: boolean;
  accent?: boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", labelKey: "home", icon: Home, exact: true },
  { href: "/dashboard/weather", labelKey: "weather", icon: Sun },
  {
    href: "/dashboard/identify",
    labelKey: "identify",
    icon: ScanSearch,
    accent: true,
  },
  { href: "/dashboard/compare", labelKey: "compare", icon: BarChart3 },
  { href: "/dashboard/track", labelKey: "trackTab", icon: MapPin },
];

export function NativeTabBar() {
  const pathname = usePathname();
  const t = useTranslations("appHeader");

  const isActive = (tab: Tab) =>
    tab.exact
      ? pathname === tab.href
      : pathname === tab.href || pathname.startsWith(tab.href + "/");

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[rgba(9,15,11,0.92)] pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-xl"
    >
      <ul className="flex items-start justify-around px-1 pt-2">
        {TABS.map((tab) => {
          const active = isActive(tab);

          if (tab.accent) {
            return (
              <li key={tab.href} className="relative flex w-14 flex-col items-center">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={t(tab.labelKey)}
                  className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#0b120d] bg-gradient-to-br from-identify to-identify-dark text-[#04140f] shadow-[0_10px_24px_-6px_rgba(55,201,166,0.55)] transition-transform active:scale-95"
                >
                  <tab.icon className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
                </Link>
                <span
                  className={cn(
                    "mt-[2.125rem] max-w-[4.5rem] truncate text-[9px] font-semibold",
                    active ? "text-identify" : "text-muted-foreground",
                  )}
                >
                  {t(tab.labelKey)}
                </span>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex flex-1 flex-col items-center gap-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 text-[9px] font-semibold transition-colors",
                  active ? "text-primary-light" : "text-[#7d9384] hover:text-foreground/80",
                )}
              >
                <tab.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                <span className="truncate">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
