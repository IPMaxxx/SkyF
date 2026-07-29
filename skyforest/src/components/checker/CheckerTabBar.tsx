"use client";

/**
 * Нижнее меню Mushroom Checker: «Распознать», «История», «Квесты» по центру,
 * «Аккаунт» и кнопка «Ещё».
 *
 * Своя реализация: общий NativeTabBar SkyForest — тёмный и с другим набором
 * разделов, во флейвор его тянуть нельзя. Всё, что не вкладка (подписка, язык,
 * документы, выход, соседние приложения), живёт в панели «Ещё», чтобы низ
 * экрана не превращался в список.
 *
 * ЦЕНТРАЛЬНАЯ КНОПКА. «Квесты» выделены заливкой, а не подъёмом над панелью:
 * приподнятый кружок пришлось бы компенсировать дополнительным отступом снизу
 * на каждом экране, а главный экран и без того рассчитан впритык, чтобы
 * уместиться без прокрутки на 568px. Зелёный круг среди тонких контурных
 * значков читается как центр меню и без выступа.
 *
 * Панель фиксирована у нижнего края и сама держит `safe-area-inset-bottom`;
 * контент экранов не заезжает под неё за счёт `--ck-tabbar` (её вычитает из
 * высоты CkScreen оболочка `ck/(app)/layout.tsx`).
 */

import { useState } from "react";
import {
  History,
  MoreHorizontal,
  ScanSearch,
  Target,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";
import { cn } from "@/lib/utils";
import { CheckerMoreSheet } from "@/components/checker/CheckerMoreSheet";

const QUESTS_HREF = "/dashboard/quests";

const LEFT_TABS = [
  { key: "identify", href: CHECKER_HOME, Icon: ScanSearch },
  { key: "history", href: "/dashboard/history", Icon: History },
] as const;

const RIGHT_TABS = [{ key: "account", href: "/account", Icon: UserRound }] as const;

/** Экраны, которые открываются из панели «Ещё»: на них подсвечена она. */
const MORE_PATHS = ["/payment"];

const ITEM_CLASS =
  "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl pt-0.5";

export function CheckerTabBar() {
  const t = useTranslations("checker.nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const questsActive = pathname === QUESTS_HREF;

  const renderTab = ({
    key,
    href,
    Icon,
  }: {
    key: string;
    href: string;
    Icon: typeof ScanSearch;
  }) => {
    const active = pathname === href;
    return (
      <Link
        key={key}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(ITEM_CLASS, active ? "text-ck-primary-text" : "text-ck-muted")}
      >
        <Icon
          className="h-[22px] w-[22px]"
          strokeWidth={active ? 2.4 : 1.9}
          aria-hidden="true"
        />
        <span className={cn("text-[11px]", active ? "font-extrabold" : "font-bold")}>
          {t(key)}
        </span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label={t("tabBar")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ck-hairline bg-ck-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="font-ck mx-auto flex w-full max-w-[520px] items-stretch gap-0.5 px-2 py-1.5">
          {LEFT_TABS.map(renderTab)}

          <Link
            href={QUESTS_HREF}
            aria-current={questsActive ? "page" : undefined}
            className={cn(
              "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl",
              questsActive ? "text-ck-primary-text" : "text-ck-body",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                questsActive
                  ? "bg-ck-primary text-ck-on-primary shadow-[0_8px_16px_-8px_var(--ck-glow)]"
                  : "bg-ck-primary-tint text-ck-primary-text",
              )}
            >
              <Target className="h-[18px] w-[18px]" strokeWidth={2.3} aria-hidden="true" />
            </span>
            <span
              className={cn(
                "text-[11px]",
                questsActive ? "font-extrabold" : "font-bold",
              )}
            >
              {t("quests")}
            </span>
          </Link>

          {RIGHT_TABS.map(renderTab)}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t("openMore")}
            aria-expanded={moreOpen}
            className={cn(
              ITEM_CLASS,
              moreOpen || MORE_PATHS.includes(pathname)
                ? "text-ck-primary-text"
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
