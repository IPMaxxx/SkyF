"use client";

/**
 * Экраны 10 и 11 дизайна: пейволл Checker Premium и управление активной
 * подпиской. Один маршрут `/payment` — что показать, решает статус из
 * /api/subscription.
 *
 * Покупка возможна только в нативной оболочке (App Store / Google Play),
 * на вебе показываем карточку «оформите в приложении».
 */

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Crown, Loader2 } from "lucide-react";
import { isNativeApp, storeName } from "@/lib/native/capacitor";
import {
  getSubscriptionPrices,
  initIap,
  manageSubscriptions,
  purchaseSubscription,
  restorePurchases,
  subscribeSubscriptionPrices,
} from "@/lib/native/iap";
import {
  subscriptionProductsForBundle,
  CHECKER_BUNDLE_ID,
  type SubscriptionPeriod,
} from "@/lib/native/iapProducts";
import {
  CHECKER_PLAN,
  formatFullDate,
  useCheckerSubscription,
} from "@/lib/checker/useSubscription";
import { openCheckerDoc } from "@/lib/checker/externalLinks";
import { cn } from "@/lib/utils";
import { CheckerTopBar } from "@/components/checker/CheckerTopBar";
import {
  CkFeatureRow,
  CkMono,
  CkPrimaryButton,
  CkScreen,
  CkStatusCard,
} from "@/components/checker/primitives";

const CATALOG = subscriptionProductsForBundle(CHECKER_BUNDLE_ID);

/** Число внутри отформатированной стором цены: «$29.99», «1 990,00 ₽». */
const PRICE_NUMBER = /\d[\d\s\u00a0.,]*\d|\d/;

function parsePrice(formatted: string): number | null {
  const raw = formatted.match(PRICE_NUMBER)?.[0];
  if (!raw) return null;
  // Разделитель дробной части — последний из «.» или «,», остальное группировка.
  const cleaned = raw.replace(/[\s\u00a0]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const sep = Math.max(lastDot, lastComma);
  const normalized =
    sep === -1
      ? cleaned.replace(/[.,]/g, "")
      : `${cleaned.slice(0, sep).replace(/[.,]/g, "")}.${cleaned.slice(sep + 1)}`;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Годовая цена в пересчёте на месяц: подставляем результат обратно в строку
 * стора, чтобы сохранить валюту и её позицию. Если цену не распарсили —
 * подпись просто не показываем, выдумывать числа на пейволле нельзя.
 */
function perMonthLabel(yearly: string, locale: string): string | null {
  const value = parsePrice(yearly);
  if (value === null) return null;
  const perMonth = (value / 12).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return yearly.replace(PRICE_NUMBER, perMonth);
}

/** Скидка годовой подписки против 12 месячных, в процентах (или null). */
function yearlyDiscount(yearly: string, monthly: string): number | null {
  const y = parsePrice(yearly);
  const m = parsePrice(monthly);
  if (y === null || m === null) return null;
  const percent = Math.round((1 - y / (m * 12)) * 100);
  return percent >= 5 ? percent : null;
}

export function CheckerPaywall() {
  const t = useTranslations("checker.paywall");
  const ts = useTranslations("checker.subscription");
  const locale = useLocale();
  const { subscription, left, limit, isTrial, unlimited, loading, refresh } =
    useCheckerSubscription();

  const [native, setNative] = useState(false);
  const [period, setPeriod] = useState<SubscriptionPeriod>("yearly");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  useEffect(() => {
    if (!native) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      await initIap();
      if (cancelled) return;
      setPrices(getSubscriptionPrices());
      unsub = subscribeSubscriptionPrices(setPrices);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [native]);

  const store = native ? storeName() : "App Store / Google Play";

  /* Документы — общие страницы SkyForest: внутри WebView с них не выйти,
     поэтому открываем их системным браузером. */
  const legalLinks = (
    <div className="flex justify-center gap-3 text-[11.5px] font-extrabold text-ck-primary">
      <button
        type="button"
        onClick={() => openCheckerDoc("/offer", locale)}
        className="flex min-h-[44px] items-center px-2"
      >
        {t("eula")}
      </button>
      <button
        type="button"
        onClick={() => openCheckerDoc("/privacy", locale)}
        className="flex min-h-[44px] items-center px-2"
      >
        {t("privacy")}
      </button>
    </div>
  );

  const product = CATALOG.find((p) => p.period === period)!;
  const monthly = CATALOG.find((p) => p.period === "monthly")!;
  const yearly = CATALOG.find((p) => p.period === "yearly")!;
  const price = prices[product.productId] || product.fallbackPrice;
  const monthlyPrice = prices[monthly.productId] || monthly.fallbackPrice;
  const yearlyPrice = prices[yearly.productId] || yearly.fallbackPrice;
  const perMonth = perMonthLabel(yearlyPrice, locale);
  const discount = yearlyDiscount(yearlyPrice, monthlyPrice);

  const subscribe = async () => {
    if (purchasing) return;
    setPurchasing(true);
    setError("");
    try {
      const r = await purchaseSubscription(product.productId, locale);
      if (r.ok) await refresh();
      else setError(r.error || t("purchaseError"));
    } finally {
      setPurchasing(false);
    }
  };

  const restore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    setError("");
    try {
      await restorePurchases();
      // Плагин доставляет чеки асинхронно: даём серверу время записать статус.
      await new Promise((r) => setTimeout(r, 2500));
      await refresh();
    } finally {
      setRestoring(false);
    }
  }, [refresh, restoring]);

  /* ---------------- 11 · Активная подписка ---------------- */

  if (loading) {
    return (
      <CkScreen>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ck-muted" />
        </div>
      </CkScreen>
    );
  }

  if (subscription) {
    const planName =
      subscription.period === "yearly" ? ts("planYearly") : ts("planMonthly");
    // В триале эта дата — начало списаний, в подписке — дата продления.
    const renews = formatFullDate(subscription.current_period_end, locale);
    const used = limit != null && left != null ? limit - left : 0;
    const progress = limit ? Math.min(100, (used / limit) * 100) : 0;

    return (
      <CkScreen>
        <div className="flex flex-col gap-4">
          <CheckerTopBar title={ts("title")} backLabel={ts("back")} />

          <div className="flex flex-col gap-3.5 rounded-[28px] border border-ck-primary-border bg-ck-primary-tint p-5">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-ck-primary text-white">
              <Check className="h-[18px] w-[18px]" strokeWidth={3} />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[17px] font-extrabold text-ck-primary-deep">
                {isTrial ? ts("trialTitle") : ts("activeTitle")}
              </span>
              <span className="text-[12.5px] font-medium leading-[1.45] text-ck-primary-mid">
                {isTrial
                  ? ts("trialBody", { plan: planName, date: renews, store })
                  : ts("activeBody", { plan: planName, date: renews, store })}
              </span>
            </div>

            {/* Квота показывается только в пробном периоде: в оплаченной
                подписке распознавания не ограничены. */}
            <div className="flex flex-col gap-2 rounded-[20px] bg-ck-surface p-4">
              {unlimited ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-ck-ink">
                      ∞
                    </span>
                    <span className="text-[12.5px] font-semibold text-ck-body-soft">
                      {ts("quotaUnlimited")}
                    </span>
                  </div>
                  <CkMono>{ts("quotaUnlimitedNote")}</CkMono>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-ck-ink">
                      {left ?? 0}
                    </span>
                    <span className="text-[12.5px] font-semibold text-ck-body-soft">
                      {ts("quotaLine", {
                        limit: limit ?? CHECKER_PLAN.trialIdentifyLimit ?? 0,
                      })}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ck-canvas">
                    <span
                      className="block h-full rounded-full bg-ck-primary"
                      style={{ width: `${100 - progress}%` }}
                    />
                  </div>
                  <CkMono>{ts("quotaReset", { date: renews })}</CkMono>
                </>
              )}
            </div>

            {native && (
              <button
                type="button"
                onClick={() => manageSubscriptions()}
                className="flex h-12 w-full items-center justify-center rounded-3xl bg-ck-surface text-[14.5px] font-extrabold text-ck-primary-deep"
              >
                {ts("manage")}
              </button>
            )}
          </div>

          {subscription.status === "canceled" && (
            <CkStatusCard
              variant="warn"
              icon="!"
              title={ts("canceledTitle")}
              body={ts("canceledBody", { date: renews })}
            />
          )}

          {legalLinks}
        </div>
      </CkScreen>
    );
  }

  /* ---------------- 10 · Пейволл ---------------- */

  const features = [t("feature1"), t("feature2"), t("feature3")];

  return (
    <CkScreen
      className="bg-[linear-gradient(180deg,#FFF6EA_0%,#F3F7F1_45%)]"
      bottom={
        <div className="flex flex-col gap-2.5">
          {native ? (
            <>
              <CkPrimaryButton onClick={subscribe} disabled={purchasing}>
                {purchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("ctaBusy", { store })}
                  </>
                ) : (
                  t("cta")
                )}
              </CkPrimaryButton>
              {legalLinks}
              <p className="text-center text-[10.5px] font-medium text-ck-muted">
                {t("billed", { store })}{" "}
                <button
                  type="button"
                  onClick={restore}
                  disabled={restoring}
                  className="font-extrabold text-ck-primary disabled:opacity-55"
                >
                  {restoring ? t("restoring") : t("restore")}
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-[26px] border border-ck-border bg-ck-surface p-[18px]">
                <span className="text-[15px] font-extrabold text-ck-ink">
                  {ts("webTitle")}
                </span>
                <span className="text-[12.5px] font-medium leading-[1.45] text-ck-body-soft">
                  {ts("webBody")}
                </span>
                <div className="flex gap-2.5">
                  <span className="flex h-10 flex-1 items-center justify-center rounded-2xl bg-ck-ink text-[12.5px] font-bold text-white">
                    {ts("appStore")}
                  </span>
                  <span className="flex h-10 flex-1 items-center justify-center rounded-2xl bg-ck-ink text-[12.5px] font-bold text-white">
                    {ts("googlePlay")}
                  </span>
                </div>
              </div>
              {legalLinks}
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <CheckerTopBar backLabel={ts("back")} />

        <div className="flex flex-col gap-2.5">
          {/* На амбровом градиенте плитка без рамки сливается с фоном. */}
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-ck-amber-border bg-ck-amber-tint text-ck-amber">
            <Crown className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
            {t("title")}
          </h1>
          <p className="text-[13.5px] font-medium leading-[1.45] text-ck-body-soft">
            {t("subtitle")}
          </p>
        </div>

        {/* Сегмент-контрол месяц/год: белая «пилюля» 4px padding, элементы 42px. */}
        <div className="flex rounded-full bg-ck-surface p-1">
          {(["monthly", "yearly"] as const).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={active}
                className={cn(
                  "flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-full text-sm transition-colors",
                  active
                    ? "bg-ck-ink font-extrabold text-white"
                    : "font-bold text-ck-muted",
                )}
              >
                {p === "monthly" ? t("monthly") : t("yearly")}
                {p === "yearly" && discount !== null && (
                  <i className="rounded-full bg-ck-primary-light px-1.5 py-0.5 text-[10px] font-extrabold not-italic text-[#0B2113]">
                    {t("yearlyBadge", { percent: discount })}
                  </i>
                )}
              </button>
            );
          })}
        </div>

        {/* Карточка плана: 1.5px primary border + плавающий бейдж триала. */}
        <div className="relative mt-2.5 flex flex-col gap-3.5 rounded-[28px] border-[1.5px] border-ck-primary bg-ck-surface p-5">
          <span className="absolute -top-[11px] left-5 rounded-full bg-ck-primary px-3 py-1 text-[10px] font-extrabold tracking-[0.08em] text-white">
            {t("trialBadge", { days: CHECKER_PLAN.trialDays })}
          </span>

          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ck-ink">
              {price}
            </span>
            <span className="text-[13px] font-semibold text-ck-muted">
              {period === "yearly" ? t("perYear") : t("perMonth")}
            </span>
          </div>
          {period === "yearly" && perMonth && (
            <CkMono className="-mt-2">
              {t("perMonthHint", { price: perMonth })}
            </CkMono>
          )}

          <div className="flex flex-col gap-2.5">
            {features.map((f) => (
              <CkFeatureRow key={f}>{f}</CkFeatureRow>
            ))}
          </div>

          {/* Лимит есть только в пробном периоде — говорим об этом прямо,
              иначе «без ограничений» выглядит обманом на первом же экране. */}
          {CHECKER_PLAN.trialIdentifyLimit != null && (
            <p className="text-[11.5px] font-medium leading-[1.45] text-ck-body-soft">
              {t("trialNote", {
                limit: CHECKER_PLAN.trialIdentifyLimit,
                days: CHECKER_PLAN.trialDays,
              })}
            </p>
          )}

          <p className="text-[11.5px] font-medium leading-[1.45] text-ck-muted">
            {period === "yearly"
              ? t("autoRenewYear", {
                  price,
                  store,
                  days: CHECKER_PLAN.trialDays,
                })
              : t("autoRenewMonth", {
                  price,
                  store,
                  days: CHECKER_PLAN.trialDays,
                })}
          </p>
        </div>

        {error && <CkStatusCard variant="error" icon="!" title={error} />}
      </div>
    </CkScreen>
  );
}
