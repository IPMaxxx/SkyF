"use client";

/**
 * Шапка Mushroom Checker: логотип-марка и название слева, язык и тема справа
 * (`CheckerQuickSettings`).
 *
 * Стоит на всех экранах приложения (`CheckerAppShell`) и на экранах входа
 * (`ck/(auth)/layout.tsx`): язык и тема нужны с первого экрана, а марка —
 * единственное место, которое всегда говорит, где пользователь находится.
 * Кнопки-бургера здесь нет: вся навигация переехала в нижнее меню
 * (`CheckerTabBar`) и его панель «Ещё», а две точки входа в одни и те же
 * пункты только путали бы.
 *
 * Марка — ссылка на экран распознавания, а не `div` с обработчиком: с
 * клавиатуры она получает фокус и объявляется скринридером как ссылка. На
 * самом экране распознавания ссылка остаётся (ведёт «сама в себя») — прятать
 * её значило бы дёргать разметку шапки при каждом переходе.
 *
 * Шапка держит `safe-area-inset-top` за весь экран — поэтому оболочки
 * обнуляют `--ck-safe-top` для CkScreen. Высота — 52px (8 + 38 + 6).
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
    <header className="font-ck mx-auto flex w-full max-w-[520px] flex-none items-center justify-between px-5 pb-1.5 pt-[calc(8px+env(safe-area-inset-top))]">
      <Link
        href={CHECKER_HOME}
        className="flex h-[38px] min-w-0 items-center gap-[11px] rounded-full"
        aria-label={t("brandHome")}
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
