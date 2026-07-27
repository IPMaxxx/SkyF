"use client";

/**
 * Пейволл WayBack и управление активной подпиской — один маршрут `/payment`,
 * что показать решает статус из /api/subscription.
 *
 * Тон экрана задан дизайном: базовая функция (стрелка домой) бесплатна
 * навсегда, и об этом сказано прямо на пейволле. Премиум продаём за офлайн-
 * области, синхронизацию и спутник, а не за возврат из леса — убирать плитку
 * «free forever» нельзя, она снимает главное возражение.
 *
 * Покупка возможна только в нативной оболочке; на вебе показываем карточку
 * «оформите в приложении».
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
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
  WAYBACK_BUNDLE_ID,
  type SubscriptionPeriod,
} from "@/lib/native/iapProducts";
import {
  formatWaybackDate,
  useWaybackAccount,
} from "@/lib/wayback/useWaybackAccount";
import { cn } from "@/lib/utils";
import {
  WbLabel,
  WbPrimaryButton,
  WbScreen,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

const CATALOG = subscriptionProductsForBundle(WAYBACK_BUNDLE_ID);

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-2.5 text-[14px] font-medium leading-[1.45] text-wb-body">
      <span className="mt-[3px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-wb-primary-soft text-wb-primary-deep">
        <Check className="h-3 w-3" strokeWidth={3.2} aria-hidden="true" />
      </span>
      {children}
    </span>
  );
}

export function WayBackPaywall() {
  const t = useTranslations("wayback.paywall");
  const locale = useLocale();
  const router = useRouter();
  const { subscription, loading, refresh } = useWaybackAccount();

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

  const store = native
    ? storeName()
    : `${t("storeApple")} / ${t("storeGoogle")}`;

  const product = CATALOG.find((p) => p.period === period)!;
  const price = prices[product.productId] || product.fallbackPrice;

  const subscribe = async () => {
    if (purchasing) return;
    setPurchasing(true);
    setError("");
    try {
      const r = await purchaseSubscription(product.productId, locale);
      if (r.ok) await refresh();
      else setError(r.error || t("cta"));
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
      // Плагин доставляет чеки асинхронно: даём серверу записать статус.
      await new Promise((r) => setTimeout(r, 2500));
      await refresh();
    } finally {
      setRestoring(false);
    }
  }, [refresh, restoring]);

  if (loading) {
    return (
      <WbScreen>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2
            className="h-6 w-6 animate-spin text-wb-primary"
            aria-hidden="true"
          />
        </div>
      </WbScreen>
    );
  }

  /* ---------------- Активная подписка ---------------- */

  if (subscription) {
    const planName =
      subscription.period === "yearly" ? t("planYearly") : t("planMonthly");
    const renews = formatWaybackDate(subscription.current_period_end, locale);
    const activePrice =
      prices[
        CATALOG.find((p) => p.period === subscription.period)?.productId ?? ""
      ] ||
      CATALOG.find((p) => p.period === subscription.period)?.fallbackPrice ||
      "";

    return (
      <WbScreen>
        <WbTopBar title={t("title")} onBack={() => router.back()} />

        <div className="flex flex-col gap-2.5">
          <WbTile tone="tint" className="flex flex-col gap-2.5 px-5 py-5">
            <span className="w-fit rounded-full bg-wb-primary px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-wb-on-primary uppercase">
              {t("activeBadge")}
            </span>
            <span className="text-[20px] font-extrabold tracking-[-0.02em] text-wb-ink">
              {t("activeTitle", { date: renews })}
            </span>
            <span className="wb-mono text-[12.5px] text-wb-muted">
              {t("activeMeta", { plan: planName, price: activePrice })}
            </span>
            {native && (
              <button
                type="button"
                onClick={() => manageSubscriptions()}
                className="mt-1 flex h-[50px] w-full items-center justify-center rounded-[18px] bg-wb-surface text-[15px] font-extrabold text-wb-primary-deep"
              >
                {t("manage")}
              </button>
            )}
          </WbTile>

          <WbTile className="flex flex-col gap-3 px-5 py-[18px]">
            <WbLabel>{t("unlockedTitle")}</WbLabel>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14.5px] font-bold text-wb-ink">
                  {t("unlockedAreas")}
                </span>
                <span className="wb-mono text-[12px] text-wb-muted">
                  {t("unlockedAreasValue")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14.5px] font-bold text-wb-ink">
                  {t("unlockedSync")}
                </span>
                <span className="wb-mono text-[12px] text-wb-muted">
                  {t("on")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14.5px] font-bold text-wb-ink">
                  {t("unlockedSatellite")}
                </span>
                <span className="wb-mono text-[12px] text-wb-muted">
                  {t("on")}
                </span>
              </div>
            </div>
          </WbTile>

          <WbTile tone="quiet" className="px-5 py-4">
            <p className="text-[13px] font-medium leading-[1.5] text-wb-muted">
              {t("billingNote", { store })}
            </p>
          </WbTile>

          <div className="flex justify-center gap-4 py-1 text-[12px] font-bold text-wb-primary">
            <Link href="/offer">{t("terms")}</Link>
            <Link href="/privacy">{t("privacy")}</Link>
          </div>
        </div>
      </WbScreen>
    );
  }

  /* ---------------- Пейволл ---------------- */

  return (
    <WbScreen
      bottom={
        native ? (
          <div className="flex flex-col gap-2.5">
            <WbPrimaryButton onClick={subscribe} disabled={purchasing}>
              {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("cta")}
            </WbPrimaryButton>
            <p className="text-center text-[12px] font-medium leading-[1.45] text-wb-muted">
              {t("renewNote", {
                price,
                period: period === "yearly" ? t("perYear") : t("perMonth"),
                store,
              })}{" "}
              <button
                type="button"
                onClick={restore}
                disabled={restoring}
                className="font-extrabold text-wb-primary disabled:opacity-55"
              >
                {t("restore")}
              </button>
            </p>
          </div>
        ) : (
          <WbTile className="flex flex-col gap-2 px-5 py-4">
            <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
              {t("webNote")}
            </p>
          </WbTile>
        )
      }
    >
      <WbTopBar title={t("title")} onBack={() => router.back()} />

      <div className="flex flex-col gap-2.5">
        {/* Период: две плитки вместо пилюли — попасть пальцем в лесу проще. */}
        <div className="grid grid-cols-2 gap-2">
          {(["monthly", "yearly"] as const).map((p) => {
            const active = period === p;
            const item = CATALOG.find((c) => c.period === p)!;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col gap-1 rounded-[22px] px-4 py-[14px] text-left transition-colors",
                  active
                    ? "bg-wb-primary text-wb-on-primary"
                    : "bg-wb-surface text-wb-ink",
                )}
              >
                <span
                  className={cn(
                    "wb-mono text-[10.5px] tracking-[0.14em] uppercase",
                    active ? "text-wb-primary-soft" : "text-wb-muted-2",
                  )}
                >
                  {p === "monthly" ? t("monthly") : t("yearlyDiscount")}
                </span>
                <span className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.02em]">
                  {prices[item.productId] || item.fallbackPrice}
                </span>
                <span
                  className={cn(
                    "text-[12.5px] font-semibold",
                    active ? "text-wb-primary-soft" : "text-wb-muted",
                  )}
                >
                  {p === "monthly" ? t("perMonth") : t("perYear")}
                </span>
              </button>
            );
          })}
        </div>

        <WbTile className="flex flex-col gap-3 px-5 py-[18px]">
          <span className="w-fit rounded-full bg-wb-primary-soft px-3 py-1 text-[11px] font-extrabold tracking-[0.06em] text-wb-primary-deep uppercase">
            {t("trialBadge")}
          </span>
          <FeatureRow>{t("f1")}</FeatureRow>
          <FeatureRow>{t("f2")}</FeatureRow>
          <FeatureRow>{t("f3")}</FeatureRow>
        </WbTile>

        {/* Главное обещание продукта: стрелка домой не станет платной. */}
        <WbTile tone="tint" className="flex flex-col gap-1.5 px-5 py-[18px]">
          <span className="text-[16px] font-extrabold text-wb-ink">
            {t("freeTitle")}
          </span>
          <span className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
            {t("freeBody")}
          </span>
        </WbTile>

        <div className="flex justify-center gap-4 py-1 text-[12px] font-bold text-wb-primary">
          <Link href="/offer">{t("terms")}</Link>
          <Link href="/privacy">{t("privacy")}</Link>
        </div>

        {error && (
          <WbTile
            tone="danger"
            className="px-5 py-4 text-[14px] font-bold text-wb-danger"
          >
            {error}
          </WbTile>
        )}
      </div>
    </WbScreen>
  );
}
