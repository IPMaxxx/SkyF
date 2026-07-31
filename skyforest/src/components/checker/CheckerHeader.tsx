"use client";

/**
 * Шапка домашнего экрана Mushroom Checker: логотип-марка и название слева,
 * язык и тема справа (`CheckerQuickSettings`).
 *
 * Кнопки-бургера здесь больше нет: вся навигация переехала в нижнее меню
 * (`CheckerTabBar`) и его панель «Ещё», а две точки входа в одни и те же
 * пункты только путали бы. Язык и тема — исключение: это не навигация, а две
 * настройки, за которыми новый пользователь идёт первым делом. Шапка держит
 * `safe-area-inset-top` за весь экран — поэтому `identify/layout.tsx`
 * обнуляет `--ck-safe-top` для CkScreen.
 */

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FLAVORS } from "@/lib/appFlavor";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";
import { CheckerQuickSettings } from "@/components/checker/CheckerQuickSettings";

export function CheckerHeader() {
  const t = useTranslations("checker.menu");

  return (
    <header className="font-ck mx-auto flex w-full max-w-[520px] items-center justify-between px-5 pb-1.5 pt-[calc(8px+env(safe-area-inset-top))]">
      <Link
        href={CHECKER_HOME}
        className="flex h-[38px] min-w-0 items-center gap-[11px] rounded-full"
        aria-label={FLAVORS.checker.name}
      >
        <Image
          src={FLAVORS.checker.faviconPath}
          alt=""
          width={72}
          height={72}
          className="h-9 w-9 flex-none rounded-full object-cover"
        />
        <span className="truncate text-[18px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {t("brandShort")}
        </span>
      </Link>

      <CheckerQuickSettings />
    </header>
  );
}
