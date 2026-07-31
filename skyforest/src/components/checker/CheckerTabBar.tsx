"use client";

/**
 * Нижнее меню Mushroom Checker: «Квесты» и «История» слева, «Распознать» по
 * центру, «Аккаунт» и кнопка «Ещё» справа.
 *
 * Своя реализация: общий NativeTabBar SkyForest — тёмный и с другим набором
 * разделов, во флейвор его тянуть нельзя. Всё, что не вкладка (подписка, язык,
 * документы, выход, соседние приложения), живёт в панели «Ещё», чтобы низ
 * экрана не превращался в список.
 *
 * ЦЕНТРАЛЬНАЯ КНОПКА — «Распознать»: ради неё приложение и открывают, поэтому
 * она в середине, крупнее остальных и с заливкой. Раньше центр занимали
 * «Квесты» — они уехали на край, а вместе с ними и амбровая точка «есть
 * непросмотренное». Выделение сделано заливкой, а не подъёмом над панелью:
 * приподнятый кружок пришлось бы компенсировать отступом снизу на каждом
 * экране, а главный экран и без того рассчитан впритык, чтобы уместиться без
 * прокрутки на 568px.
 *
 * ПАНЕЛЬ НЕ ЕЗДИТ. Меню — обычный блок в оболочке `CheckerAppShell`, а не
 * `position: fixed`: страница под ним не прокручивается вообще, прокрутка живёт
 * во внутреннем скроллере. Пока меню было фиксированным, WKWebView сдвигал его
 * вместе с layout-вьюпортом при резиновом отскоке. Safe-area снизу держит сама
 * панель, а контенту резервировать место под неё больше не нужно — он
 * физически не может под неё попасть.
 *
 * ПОДСВЕТКА НЕ ЖДЁТ НАВИГАЦИИ. Разделы — серверные маршруты, и `usePathname()`
 * меняется только после ответа сервера. Пока подсветка шла от него одного,
 * тап по вкладке на пару сотен миллисекунд не давал вообще никакого отклика,
 * и меню казалось подтормаживающим. Поэтому нажатая вкладка запоминается в
 * `pending` и подсвечивается сразу; значение снимается, когда путь догнал, а
 * если переход сорвался (офлайн, ошибка) — по таймауту.
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
import { useQuestsBadge } from "@/lib/checker/achievements";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";
import { cn } from "@/lib/utils";
import { CheckerMoreSheet } from "@/components/checker/CheckerMoreSheet";

const QUESTS_HREF = "/dashboard/quests";

/** Слева от центра: квесты (с точкой прогресса) и история. */
const LEFT_TABS = [
  { key: "quests", href: QUESTS_HREF, Icon: Target, badge: true },
  { key: "history", href: "/dashboard/history", Icon: History },
] as const;

/** Справа от центра: аккаунт и панель «Ещё» — симметрично левой паре. */
const RIGHT_TABS = [{ key: "account", href: "/account", Icon: UserRound }] as const;

/** Экраны, которые открываются из панели «Ещё»: на них подсвечена она. */
const MORE_PATHS = ["/payment"];

const ITEM_CLASS =
  "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl pt-0.5";

/** Столько ждём ответа сервера, прежде чем вернуть подсветку на текущий путь. */
const PENDING_TIMEOUT_MS = 5000;

export function CheckerTabBar() {
  const t = useTranslations("checker.nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // Нажатая вкладка вместе с путём, с которого её нажали: как только путь
  // сменился, навигация дошла, и метка перестаёт учитываться — так подсветка
  // не залипает на разделе, с которого потом ушли кнопкой «назад».
  const [pending, setPending] = useState<{ href: string; from: string } | null>(
    null,
  );
  const questsNew = useQuestsBadge();

  const tap = (href: string) => {
    setPending({ href, from: pathname });
    // Страховка на случай, когда переход не состоялся (офлайн, ошибка): путь
    // не изменится, и снять метку больше нечему.
    setTimeout(() => setPending(null), PENDING_TIMEOUT_MS);
  };

  const current = pending?.from === pathname ? pending.href : pathname;
  const identifyActive = current === CHECKER_HOME;

  const renderTab = ({
    key,
    href,
    Icon,
    badge,
  }: {
    key: string;
    href: string;
    Icon: typeof ScanSearch;
    badge?: boolean;
  }) => {
    const active = current === href;
    return (
      <Link
        key={key}
        href={href}
        onClick={() => tap(href)}
        aria-current={active ? "page" : undefined}
        className={cn(ITEM_CLASS, active ? "text-ck-primary-text" : "text-ck-muted")}
      >
        <span className="relative flex items-center justify-center">
          <Icon
            className="h-[22px] w-[22px]"
            strokeWidth={active ? 2.4 : 1.9}
            aria-hidden="true"
          />
          {/* Точка «есть непросмотренное» ставится в момент, когда находка
              закрыла квест, и гаснет от визита во вкладку. Состояние лежит
              в браузере, поэтому меню не делает лишних запросов. */}
          {badge && questsNew && !active && (
            <i
              role="status"
              aria-label={t("questsNew")}
              className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ck-surface bg-ck-amber"
            />
          )}
        </span>
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
        className="flex-none border-t border-ck-hairline bg-ck-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="font-ck mx-auto flex w-full max-w-[520px] items-stretch gap-0.5 px-2 py-1.5">
          {LEFT_TABS.map(renderTab)}

          <Link
            href={CHECKER_HOME}
            onClick={() => tap(CHECKER_HOME)}
            aria-current={identifyActive ? "page" : undefined}
            className={cn(
              "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl",
              identifyActive ? "text-ck-primary-text" : "text-ck-body",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                identifyActive
                  ? "bg-ck-primary text-ck-on-primary shadow-[0_8px_16px_-8px_var(--ck-glow)]"
                  : "bg-ck-primary-tint text-ck-primary-text",
              )}
            >
              <ScanSearch
                className="h-[21px] w-[21px]"
                strokeWidth={2.3}
                aria-hidden="true"
              />
            </span>
            <span
              className={cn(
                "text-[11.5px]",
                identifyActive ? "font-extrabold" : "font-bold",
              )}
            >
              {t("identify")}
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
              moreOpen || MORE_PATHS.includes(current)
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
