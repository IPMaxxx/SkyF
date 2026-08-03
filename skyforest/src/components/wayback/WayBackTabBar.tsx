"use client";

/**
 * Нижнее меню WayBack.
 *
 * Раньше навигация жила в бургере в шапке — до неё нужно было дотянуться в
 * верхний угол экрана одной рукой, в перчатке, на ходу. Теперь она у нижнего
 * края, где палец и так лежит.
 *
 * Постоянно видны три экрана и «ещё». Выбор такой: главное действие (START)
 * живёт на «походе», офлайн-карту готовят до потери связи, историю смотрят
 * после — этими тремя пользуются в походе. Всё редкое (аккаунт, подписка, язык,
 * единицы, «как это работает», соседние приложения, выход) — за кнопкой
 * «ещё»: экономить на главном действии нельзя, а место на 375×667 конечное.
 *
 * Панель перекрывает контент, поэтому у экранов внизу отступ
 * `pb-[calc(84px+env(safe-area-inset-bottom))]`, а полноэкранные карты
 * (выбор точки входа и области) панель не показывают вовсе — там свои кнопки
 * у нижнего края.
 */

import { Compass, Download, History, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type WayBackTab = "home" | "offline" | "history";

export function WayBackTabBar({
  active,
  onSelect,
  moreOpen,
  onMore,
}: {
  active: WayBackTab;
  onSelect: (tab: WayBackTab) => void;
  moreOpen: boolean;
  onMore: () => void;
}) {
  const t = useTranslations("wayback.tabs");

  const tabs = [
    { id: "home" as const, label: t("home"), Icon: Compass },
    { id: "offline" as const, label: t("offline"), Icon: Download },
    { id: "history" as const, label: t("history"), Icon: History },
  ];

  return (
    <nav className="wb-tabbar" aria-label={t("label")}>
      <div className="mx-auto flex w-full max-w-[520px] items-stretch gap-1 px-2">
        {tabs.map(({ id, label, Icon }) => {
          const current = !moreOpen && active === id;
          return (
            <button
              key={id}
              type="button"
              className="wb-tab"
              aria-current={current ? "true" : undefined}
              onClick={() => onSelect(id)}
            >
              <Icon
                className="h-[21px] w-[21px]"
                strokeWidth={current ? 2.6 : 2}
                aria-hidden="true"
              />
              <span>{label}</span>
              <span
                className={cn("wb-tab-dot", !current && "opacity-0")}
                aria-hidden="true"
              />
            </button>
          );
        })}
        <button
          type="button"
          className="wb-tab"
          aria-expanded={moreOpen}
          onClick={onMore}
        >
          <MoreHorizontal
            className="h-[21px] w-[21px]"
            strokeWidth={moreOpen ? 2.6 : 2}
            aria-hidden="true"
          />
          <span>{t("more")}</span>
          <span
            className={cn("wb-tab-dot", !moreOpen && "opacity-0")}
            aria-hidden="true"
          />
        </button>
      </div>
    </nav>
  );
}
