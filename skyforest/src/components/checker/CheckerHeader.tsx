"use client";

/**
 * Шапка домашнего экрана Mushroom Checker: логотип-марка и название.
 *
 * Кнопки-бургера здесь больше нет: вся навигация переехала в нижнее меню
 * (`CheckerTabBar`) и его панель «Ещё», а две точки входа в одни и те же
 * пункты только путали бы. Шапка держит `safe-area-inset-top` за весь экран —
 * поэтому `identify/layout.tsx` обнуляет `--ck-safe-top` для CkScreen.
 */

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FLAVORS } from "@/lib/appFlavor";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";

export function CheckerHeader() {
  const t = useTranslations("checker.menu");

  return (
    <header className="font-ck mx-auto flex w-full max-w-[520px] items-center justify-between px-5 pb-1.5 pt-[calc(8px+env(safe-area-inset-top))]">
      <Link
        href={CHECKER_HOME}
        className="flex h-[38px] items-center gap-[11px] rounded-full"
        aria-label={FLAVORS.checker.name}
      >
        <Image
          src={FLAVORS.checker.faviconPath}
          alt=""
          width={72}
          height={72}
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="text-[18px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {t("brandShort")}
        </span>
      </Link>
    </header>
  );
}
