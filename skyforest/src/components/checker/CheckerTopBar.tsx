"use client";

/**
 * Верхняя полоса «вложенного» экрана Mushroom Checker: кнопка «назад» и
 * заголовок.
 *
 * Кнопка возвращает на предыдущий экран, а если история пуста (нативная
 * оболочка перезагрузила WebView прямо на этом экране) — на `fallback`.
 * Круг остался 38px как в дизайне, но область нажатия — 44px, как требует HIG.
 */

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHECKER_HOME, useCheckerBack } from "@/lib/checker/backNavigation";

export function CheckerBackButton({
  fallback = CHECKER_HOME,
  label,
}: {
  fallback?: string;
  label?: string;
}) {
  const t = useTranslations("checker.nav");
  const goBack = useCheckerBack(fallback);

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label ?? t("back")}
      className="-m-[3px] flex h-11 w-11 flex-none items-center justify-center rounded-full"
    >
      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-ck-border-4 bg-ck-surface text-[#41594a]">
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      </span>
    </button>
  );
}

export function CheckerTopBar({
  title,
  fallback = CHECKER_HOME,
  backLabel,
}: {
  title?: string;
  fallback?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-3">
      <CheckerBackButton fallback={fallback} label={backLabel} />
      {title && (
        <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
          {title}
        </h1>
      )}
    </div>
  );
}
