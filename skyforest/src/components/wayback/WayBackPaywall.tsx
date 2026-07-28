"use client";

/**
 * Пейволл WayBack и управление активной подпиской — один маршрут `/payment`,
 * что показать решает статус из /api/subscription.
 *
 * С обязательным гейтом на старте (WayBackStartGate) этот экран остаётся
 * нужным: через него подписку продлевают, отменяют и восстанавливают уже
 * вошедшие пользователи, а на вебе он объясняет, что оформить можно только в
 * приложении. Обещания «базовое бесплатно навсегда» здесь больше нет — в
 * приложении без подписки не работает ничего, и держать на экране покупки
 * текст, противоречащий гейту, нельзя.
 *
 * Покупка возможна только в нативной оболочке; на вебе показываем карточку
 * «оформите в приложении».
 *
 * Тариф ровно один — годовой (FLAVORS.wayback.subscriptionPlan). Выбора
 * периода на экране нет намеренно: месячного товара в сторах не существует.
 */

import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { storeName } from "@/lib/native/capacitor";
import { manageSubscriptions } from "@/lib/native/iap";
import {
  formatWaybackDate,
  useWaybackAccount,
} from "@/lib/wayback/useWaybackAccount";
import {
  useWaybackPurchase,
  WAYBACK_PLAN,
} from "@/lib/wayback/useWaybackPurchase";
import { WayBackTrialTerms } from "@/components/wayback/WayBackTrialTerms";
import {
  WbLabel,
  WbPrimaryButton,
  WbScreen,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

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

  const {
    native,
    price,
    trialDays,
    purchasing,
    restoring,
    error,
    subscribe,
    restore,
  } = useWaybackPurchase(refresh, t("cta", { days: WAYBACK_PLAN.trialDays }));

  const store = native
    ? storeName()
    : `${t("storeApple")} / ${t("storeGoogle")}`;

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
    const renews = formatWaybackDate(subscription.current_period_end, locale);

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
              {t("activeMeta", { plan: t("planYearly"), price })}
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
            <WbPrimaryButton
              onClick={() => void subscribe()}
              disabled={purchasing}
            >
              {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("cta", { days: trialDays })}
            </WbPrimaryButton>
            <p className="text-center text-[12px] font-medium leading-[1.45] text-wb-muted">
              {t("renewNote", { price, period: t("perYear"), store })}{" "}
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
        {/* Тариф один, поэтому это не переключатель, а цена: крупная цифра
            и период, без выбора, который нечего выбирать. */}
        <div className="flex items-end justify-between gap-3 rounded-[22px] bg-wb-primary px-5 py-[18px] text-wb-on-primary">
          <div className="flex flex-col gap-1">
            <span className="wb-mono text-[10.5px] tracking-[0.14em] text-wb-primary-soft uppercase">
              {t("yearly")}
            </span>
            <span className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
              {price}
            </span>
          </div>
          <span className="pb-1 text-[13px] font-semibold text-wb-primary-soft">
            {t("perYear")}
          </span>
        </div>

        <WbTile className="flex flex-col gap-3 px-5 py-[18px]">
          <span className="w-fit rounded-full bg-wb-primary-soft px-3 py-1 text-[11px] font-extrabold tracking-[0.06em] text-wb-primary-deep uppercase">
            {t("trialBadge", { days: trialDays })}
          </span>
          <FeatureRow>{t("f1")}</FeatureRow>
          <FeatureRow>{t("f2")}</FeatureRow>
          <FeatureRow>{t("f3")}</FeatureRow>
        </WbTile>

        <WayBackTrialTerms trialDays={trialDays} price={price} store={store} />

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
