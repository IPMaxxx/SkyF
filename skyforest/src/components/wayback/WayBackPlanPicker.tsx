"use client";

/**
 * Выбор тарифа перед покупкой: неделя или год.
 *
 * Компонент один на пейволл и на стартовый гейт — оба экрана продают одно и то
 * же, и разъехаться формулировкам нельзя.
 *
 * Тарифов может прийти и один: список строит стор, а не каталог (см.
 * `waybackPlansFor`). Тогда выбирать нечего, и на экране стоит не переключатель
 * с единственной кнопкой, а просто цена — ровно так, как экран выглядел, пока
 * тариф был один.
 *
 * Выгода годового названа двумя числами и оба честные: процент считается от
 * полных 52 недельных списаний, а «в неделю» — это годовая цена, делённая на
 * те же 52. Ни то, ни другое не выдумывается: если цену стора не удалось
 * разобрать, подпись просто не показывается.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  perWeekLabel,
  yearlySavings,
  type WaybackPlan,
} from "@/lib/wayback/subscriptionProducts";

export function WayBackPlanPicker({
  plans,
  selected,
  onSelect,
  priceOf,
  trialDays,
  locale,
}: {
  plans: WaybackPlan[];
  selected: WaybackPlan;
  onSelect: (plan: WaybackPlan) => void;
  priceOf: (plan: WaybackPlan) => string;
  trialDays: number;
  locale: string;
}) {
  const t = useTranslations("wayback.paywall");

  const periodLabel = (plan: WaybackPlan) =>
    plan.period === "weekly" ? t("weekly") : t("yearly");
  const perPeriod = (plan: WaybackPlan) =>
    plan.period === "weekly" ? t("perWeek") : t("perYear");

  /* ---------------- Тариф один: выбирать нечего ---------------- */

  if (plans.length === 1) {
    const only = plans[0];
    return (
      <div className="flex items-end justify-between gap-3 rounded-[22px] bg-wb-primary px-5 py-[18px] text-wb-on-primary">
        <div className="flex flex-col gap-1">
          <span className="wb-mono text-[10.5px] tracking-[0.14em] text-wb-primary-soft uppercase">
            {periodLabel(only)}
          </span>
          <span className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            {priceOf(only)}
          </span>
        </div>
        <span className="pb-1 text-[13px] font-semibold text-wb-primary-soft">
          {perPeriod(only)}
        </span>
      </div>
    );
  }

  /* ---------------- Выбор из тарифов ---------------- */

  const weekly = plans.find((p) => p.period === "weekly");
  const yearly = plans.find((p) => p.period === "yearly");
  const savings =
    weekly && yearly ? yearlySavings(priceOf(yearly), priceOf(weekly)) : null;

  return (
    <div
      role="radiogroup"
      aria-label={t("planPickerLabel")}
      className="flex flex-col gap-2"
    >
      {plans.map((plan) => {
        const active = plan.productId === selected.productId;
        const price = priceOf(plan);
        const perWeek =
          plan.period === "yearly" ? perWeekLabel(price, locale) : null;
        return (
          <button
            key={plan.productId}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(plan)}
            className={cn(
              "flex items-center gap-3 rounded-[22px] px-5 py-[16px] text-left transition-colors",
              active
                ? "bg-wb-primary text-wb-on-primary"
                : "border border-wb-border bg-wb-surface text-wb-ink",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "wb-mono text-[10.5px] tracking-[0.14em] uppercase",
                    active ? "text-wb-primary-soft" : "text-wb-muted-2",
                  )}
                >
                  {periodLabel(plan)}
                </span>
                {plan.period === "yearly" && savings !== null && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-[0.04em] uppercase",
                      active
                        ? "bg-wb-primary-soft text-wb-primary-deep"
                        : "bg-wb-primary-tint text-wb-primary-deep",
                    )}
                  >
                    {t("saveBadge", { percent: savings })}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[13px] font-semibold",
                  active ? "text-wb-primary-soft" : "text-wb-muted",
                )}
              >
                {perWeek
                  ? t("planHintYearly", {
                      days: trialDays,
                      price: perWeek,
                    })
                  : t("trialBadge", { days: trialDays })}
              </span>
            </span>
            <span className="flex flex-none flex-col items-end">
              <span className="text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]">
                {price}
              </span>
              <span
                className={cn(
                  "text-[12px] font-semibold",
                  active ? "text-wb-primary-soft" : "text-wb-muted-2",
                )}
              >
                {perPeriod(plan)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
