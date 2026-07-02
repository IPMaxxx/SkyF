"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CloudRain,
  ScanSearch,
  GitCompareArrows,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  labelKey: "home" | "weather" | "identify" | "compare" | "more";
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** Центральная акцентная кнопка (флагманская фича — определение гриба). */
  accent?: boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", labelKey: "home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/weather", labelKey: "weather", icon: CloudRain },
  {
    href: "/dashboard/identify",
    labelKey: "identify",
    icon: ScanSearch,
    accent: true,
  },
  { href: "/dashboard/compare", labelKey: "compare", icon: GitCompareArrows },
  { href: "/account", labelKey: "more", icon: MoreHorizontal },
];

/**
 * Нижняя таб-навигация — рендерится только внутри нативной оболочки
 * (монтируется в native-ветке AppShell). Fixed bottom, safe-area снизу,
 * таргеты ≥44px, активный таб подсвечен.
 */
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0d1a12]/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-md"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const active = isActive(tab);

          if (tab.accent) {
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-[44px] flex-col items-center justify-end gap-0.5 px-1 pb-1 text-[10px] font-medium text-foreground/70"
                >
                  <span
                    className={cn(
                      "-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#0d1a12] text-white shadow-lg transition-colors",
                      active
                        ? "bg-primary-light"
                        : "bg-primary hover:bg-primary-light",
                    )}
                  >
                    <tab.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      "truncate transition-colors",
                      active ? "text-primary-light" : "text-foreground/70",
                    )}
                  >
                    {t(tab.labelKey)}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 pt-2 pb-1 text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary-light"
                    : "text-foreground/60 hover:text-foreground",
                )}
              >
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
