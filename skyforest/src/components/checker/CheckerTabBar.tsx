"use client";

/**
 * Нижнее меню Mushroom Checker: «Распознать», «Аккаунт» и «Ещё».
 *
 * Своя реализация: общий NativeTabBar SkyForest — тёмный и с другим набором
 * разделов, во флейвор его тянуть нельзя. Вкладок ровно две плюс кнопка «Ещё»
 * — всё остальное (подписка, язык, документы, выход, соседние приложения)
 * живёт в панели, чтобы низ экрана не превращался в список.
 *
 * Панель фиксирована у нижнего края и сама держит `safe-area-inset-bottom`;
 * контент экранов не заезжает под неё за счёт `--ck-tabbar` (её вычитает из
 * высоты CkScreen оболочка `ck/(app)/layout.tsx`).
 */

import { useState } from "react";
import { MoreHorizontal, ScanSearch, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";
import { cn } from "@/lib/utils";
import { CheckerMoreSheet } from "@/components/checker/CheckerMoreSheet";

const TABS = [
  { key: "identify", href: CHECKER_HOME, Icon: ScanSearch },
  { key: "account", href: "/account", Icon: UserRound },
] as const;

/** Экраны, которые открываются из панели «Ещё»: на них подсвечена она. */
const MORE_PATHS = ["/payment"];

export function CheckerTabBar() {
  const t = useTranslations("checker.nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const itemClass =
    "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl pt-0.5";

  return (
    <>
      <nav
        aria-label={t("tabBar")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ck-hairline bg-ck-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="font-ck mx-auto flex w-full max-w-[520px] items-stretch gap-1 px-3 py-1.5">
          {TABS.map(({ key, href, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  itemClass,
                  active ? "text-ck-primary" : "text-ck-muted",
                )}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[11px]",
                    active ? "font-extrabold" : "font-bold",
                  )}
                >
                  {t(key)}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t("openMore")}
            aria-expanded={moreOpen}
            className={cn(
              itemClass,
              moreOpen || MORE_PATHS.includes(pathname)
                ? "text-ck-primary"
                : "text-ck-muted",
            )}
          >
            <MoreHorizontal
              className="h-[22px] w-[22px]"
              strokeWidth={2.1}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold">{t("more")}</span>
          </button>
        </div>
      </nav>

      <CheckerMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
