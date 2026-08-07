"use client";

/**
 * Язык и тема в шапке главного экрана Mushroom Checker.
 *
 * Те же две настройки есть в панели «Ещё» — и остаются там: панель открыта с
 * любого экрана, а здесь они стоят потому, что первое, что делает новый
 * пользователь с англоязычным приложением, — ищет свой язык, и посылать его за
 * этим в меню не за что.
 *
 * Своего состояния у переключателей нет: тема берётся из общего для флейвора
 * `CheckerThemeProvider`, язык — из `useLocale()` и куки `NEXT_LOCALE`
 * (src/lib/checker/locale.ts). Оба переключателя в приложении читают и пишут
 * одно и то же, поэтому не могут разойтись.
 *
 * Размеры: 30–34px по высоте, чтобы уместиться в строку шапки (38px) и не
 * менять `--ck-chrome` — из него посчитана высота экрана, впритык
 * помещающегося без прокрутки на iPhone SE. Safe-area сверху держит шапка.
 */

import { Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useFlavorLocales } from "@/lib/useFlavorLocales";
import {
  CHECKER_LOCALE_LABELS,
  rememberCheckerLocale,
} from "@/lib/checker/locale";
import { cn } from "@/lib/utils";
import { useCheckerTheme } from "@/components/checker/CheckerThemeProvider";

export function CheckerQuickSettings() {
  const t = useTranslations("checker.menu");
  const locale = useLocale();
  const locales = useFlavorLocales();
  const pathname = usePathname();
  const { theme, setTheme } = useCheckerTheme();

  return (
    <div className="flex flex-none items-center gap-1.5">
      <div
        role="group"
        aria-label={t("language")}
        className="flex items-center gap-0.5 rounded-full border border-ck-border bg-ck-surface p-[3px]"
      >
        {locales.map((loc) => (
          <Link
            key={loc}
            href={pathname}
            locale={loc}
            scroll={false}
            onClick={() => rememberCheckerLocale(loc)}
            aria-current={loc === locale ? "true" : undefined}
            className={cn(
              "flex h-[28px] min-w-[30px] items-center justify-center rounded-full text-[11px] font-extrabold",
              loc === locale
                ? "bg-ck-primary text-ck-on-primary"
                : "text-ck-muted",
            )}
          >
            {CHECKER_LOCALE_LABELS[loc]}
          </Link>
        ))}
      </div>

      {/* Тема переключается одной кнопкой: вариантов ровно два, и сегмент из
          двух подписей занял бы вдвое больше места ни за чем. На значке —
          та схема, в которую нажатие переведёт. */}
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={t(theme === "dark" ? "themeLight" : "themeDark")}
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-ck-border bg-ck-surface text-ck-ink-3"
      >
        {theme === "dark" ? (
          <Sun className="h-[17px] w-[17px]" strokeWidth={2.1} aria-hidden="true" />
        ) : (
          <Moon className="h-[17px] w-[17px]" strokeWidth={2.1} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
