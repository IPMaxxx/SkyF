"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Coins,
  Loader2,
  Zap,
  Check,
  Gift,
  Tag,
  History,
  ArrowDownToLine,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Crown,
} from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_PACKAGES, TOKEN_COSTS, BULK_RATE, TOKEN_WITHDRAW_RATE } from "@/lib/tokens";
import { TransactionHistory } from "@/components/app/TransactionHistory";
import { BRAND } from "@/lib/brand";
import {
  ACCEPTED_CARDS,
  WITHDRAW_METHODS,
  withdrawMethodLabel,
  withdrawMethodPlaceholder,
} from "@/lib/payment-display";
import { useLocale, useTranslations } from "next-intl";
import { isNativeApp, storeName } from "@/lib/native/capacitor";
import {
  purchasePack,
  purchaseSubscription,
  manageSubscriptions,
  initIap,
  getStorePrices,
  subscribeStorePrices,
  getSubscriptionPrices,
  subscribeSubscriptionPrices,
} from "@/lib/native/iap";
import {
  SUBSCRIPTION_PRODUCTS,
  type SubscriptionPeriod,
  type SubscriptionTier,
} from "@/lib/native/iapProducts";

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}

const MIN_WITHDRAW = 100;

type Tab = "buy" | "withdraw";

function PaymentContent() {
  const locale = useLocale();
  const t = useTranslations("payment");
  const tw = useTranslations("payment.withdraw");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { balance, withdrawable, loading: balanceLoading, refresh } = useTokens();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "withdraw" ? "withdraw" : "buy"
  );
  // Внутри нативного приложения покупка токенов идёт только через IAP
  // (Apple/Google требуют это для цифровых товаров). Веб-checkout и вывод скрыты.
  const [native, setNative] = useState(false);
  useEffect(() => {
    if (isNativeApp()) {
      setNative(true);
      setTab("buy");
    }
  }, []);
  // Название стора по платформе (на iOS нельзя упоминать Google Play).
  // До гидрации native=false → нейтральное «App Store / Google Play».
  const store = native ? storeName() : "App Store / Google Play";

  // Реальные цены App Store / Google Play: packId → форматированная цена
  // (например "$2.99"). До загрузки продуктов — fallback на веб-цены.
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});
  const [subPrices, setSubPrices] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!native) return;
    let unsub: (() => void) | undefined;
    let unsubSub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      await initIap();
      if (cancelled) return;
      setStorePrices(getStorePrices());
      setSubPrices(getSubscriptionPrices());
      unsub = subscribeStorePrices(setStorePrices);
      unsubSub = subscribeSubscriptionPrices(setSubPrices);
    })();
    return () => {
      cancelled = true;
      unsub?.();
      unsubSub?.();
    };
  }, [native]);

  // Активная подписка пользователя (для секции подписок в нативе).
  interface ActiveSubInfo {
    tier: SubscriptionTier;
    period: SubscriptionPeriod;
    status: string;
    current_period_end: string;
  }
  const [activeSub, setActiveSub] = useState<ActiveSubInfo | null>(null);
  const loadActiveSub = () =>
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => setActiveSub(d.subscription ?? null))
      .catch(() => {});
  useEffect(() => {
    if (!native) return;
    loadActiveSub();
  }, [native]);

  // Годовой период по умолчанию: он выгоднее (−50% + триал 7 дней).
  const [subPeriod, setSubPeriod] = useState<SubscriptionPeriod>("yearly");
  const [subPurchasing, setSubPurchasing] = useState<string | null>(null);
  const [subError, setSubError] = useState("");

  // Переход по /payment#subscriptions (пейволл): секция рендерится после
  // гидрации, поэтому нативный якорный скролл не срабатывает — скроллим сами.
  useEffect(() => {
    if (!native || window.location.hash !== "#subscriptions") return;
    const id = window.setTimeout(() => {
      document.getElementById("subscriptions")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
    return () => window.clearTimeout(id);
  }, [native]);

  // Buy state
  const [selectedPack, setSelectedPack] = useState<string>(
    (TOKEN_PACKAGES.find((p) => p.popular) ?? TOKEN_PACKAGES[0]).id
  );
  const [customTokens, setCustomTokens] = useState<number>(500);
  const [purchasing, setPurchasing] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [hasReferrer, setHasReferrer] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [refApplying, setRefApplying] = useState(false);
  const [refResult, setRefResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Withdraw state
  const [wAmount, setWAmount] = useState<number>(MIN_WITHDRAW);
  const [wMethod, setWMethod] = useState<string>("card");
  const [wDetails, setWDetails] = useState("");
  const [wFullName, setWFullName] = useState("");
  const [wComment, setWComment] = useState("");
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState("");
  const [wSuccess, setWSuccess] = useState(false);
  const [wWithdrawn, setWWithdrawn] = useState(0);

  useEffect(() => {
    fetch("/api/referral/has-referrer")
      .then((r) => r.json())
      .then((d) => {
        setHasReferrer(d.has_referrer);
        if (!d.has_referrer) {
          const urlRef = searchParams.get("ref");
          if (urlRef) setRefCode(urlRef);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  // --- Buy logic ---
  const isCustom = selectedPack === "custom";
  const selected = TOKEN_PACKAGES.find((p) => p.id === selectedPack);
  const purchaseTokens = isCustom ? customTokens : (selected?.tokens ?? 0);
  const purchasePrice = isCustom
    ? parseFloat((customTokens * BULK_RATE).toFixed(2))
    : (selected?.price ?? 0);
  // В нативе — цена из стора (когда загружена), иначе веб-цена.
  const displayPrice =
    (native && !isCustom && storePrices[selectedPack]) ||
    `${purchasePrice.toFixed(2)} ${BRAND.currency}`;

  const handleApplyRef = async () => {
    const code = refCode.trim();
    if (!code) return;
    setRefApplying(true);
    setRefResult(null);
    try {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data?.status === "linked") {
        setHasReferrer(true);
        setRefResult({ ok: true, msg: t("refApplied") });
      } else if (data?.status === "already_linked") {
        setRefResult({ ok: false, msg: t("refAlready") });
      } else if (data?.status === "self_referral") {
        setRefResult({ ok: false, msg: t("refSelf") });
      } else if (data?.status === "not_found") {
        setRefResult({ ok: false, msg: t("refNotFound") });
      } else {
        setRefResult({ ok: false, msg: data?.error || t("refError") });
      }
    } catch {
      setRefResult({ ok: false, msg: tc("networkError") });
    } finally {
      setRefApplying(false);
    }
  };

  const handlePurchase = async () => {
    if (isCustom && customTokens < 301) {
      setBuyError(t("buyErrorMin"));
      return;
    }
    // Нативное приложение: покупка фиксированного пакета через IAP.
    if (native) {
      setPurchasing(true);
      setBuyError("");
      try {
        const r = await purchasePack(selectedPack, locale);
        if (r.ok) {
          refresh();
        } else {
          setBuyError(r.error || t("buyErrorPurchase"));
        }
      } finally {
        setPurchasing(false);
      }
      return;
    }
    setPurchasing(true);
    setBuyError("");
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCustom
            ? { package_id: "custom", tokens: customTokens, amount: purchasePrice }
            : { package_id: selectedPack, tokens: selected!.tokens, amount: selected!.price }
        ),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBuyError(data.error || t("buyErrorCreate"));
      }
    } catch {
      setBuyError(t("buyErrorConnect"));
    } finally {
      setPurchasing(false);
    }
  };

  // --- Subscriptions (native only) ---
  const ts = useTranslations("payment.subscriptions");
  const handleSubscribe = async (tier: SubscriptionTier) => {
    const product = SUBSCRIPTION_PRODUCTS.find(
      (p) => p.tier === tier && p.period === subPeriod
    );
    if (!product || subPurchasing) return;
    setSubPurchasing(product.productId);
    setSubError("");
    try {
      const r = await purchaseSubscription(product.productId, locale);
      if (r.ok) {
        refresh();
        await loadActiveSub();
      } else {
        setSubError(r.error || ts("purchaseError"));
      }
    } finally {
      setSubPurchasing(null);
    }
  };

  const tierName = (tier: SubscriptionTier) =>
    tier === "pro" ? ts("proName") : ts("foragerName");
  const formatSubDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // --- Withdraw logic ---
  const currentMethod = WITHDRAW_METHODS.find((m) => m.id === wMethod) ?? WITHDRAW_METHODS[0];
  const currentMethodLabel = withdrawMethodLabel(currentMethod, locale);
  const currentMethodPlaceholder = withdrawMethodPlaceholder(currentMethod, locale);
  // К выводу — только доход с маркетплейса минус уже выведенное
  // (купленные и бонусные токены не выводятся — политика сторов).
  const maxAmount = Math.max(0, withdrawable ?? 0);

  useEffect(() => {
    if (wAmount > maxAmount && maxAmount > 0) setWAmount(maxAmount);
  }, [maxAmount, wAmount]);

  const handleWithdraw = async () => {
    if (wAmount < MIN_WITHDRAW) {
      setWError(tw("errMin", { min: MIN_WITHDRAW }));
      return;
    }
    if (wAmount > maxAmount) {
      setWError(tw("errMaxEarned", { max: maxAmount }));
      return;
    }
    if (!wDetails.trim()) {
      setWError(tw("errDetails"));
      return;
    }
    if (!wFullName.trim()) {
      setWError(tw("errFullName"));
      return;
    }
    setWLoading(true);
    setWError("");
    try {
      const res = await fetch("/api/tokens/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: wAmount,
          method: `${currentMethodLabel}${wFullName ? ` | ${tw("fullNameShort")}: ${wFullName}` : ""}`,
          details: wDetails.trim(),
          comment: wComment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWError(data.error || tw("errSubmit"));
        setWLoading(false);
        return;
      }
      setWWithdrawn(data.withdrawn);
      setWSuccess(true);
      refresh();
    } catch {
      setWError(tc("networkError"));
    } finally {
      setWLoading(false);
    }
  };

  const costEntries = Object.entries(TOKEN_COSTS) as [keyof typeof TOKEN_COSTS, number][];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 text-center">
        <div className="mx-auto mb-3 sm:mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-500/15">
          <Coins className="h-7 w-7 sm:h-8 sm:w-8 text-amber-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("pageTitle")}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Balance */}
      <div className="glass mb-4 sm:mb-6 rounded-2xl p-4 sm:p-6 text-center">
        <p className="mb-1 text-sm text-muted-foreground">{t("yourBalance")}</p>
        <div className="flex items-center justify-center gap-2">
          <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400" />
          <span className="text-4xl sm:text-5xl font-bold text-amber-400">
            {balanceLoading ? "..." : balance ?? 0}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("tokensPlural")}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => setTab("buy")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            tab === "buy"
              ? "bg-amber-500/20 text-amber-300 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {t("tabBuy")}
        </button>
        {!native && (
          <button
            type="button"
            onClick={() => {
              setTab("withdraw");
              setWSuccess(false);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              tab === "withdraw"
                ? "bg-emerald-500/20 text-emerald-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            {t("tabWithdraw")}
          </button>
        )}
      </div>

      {/* ========== BUY TAB ========== */}
      {tab === "buy" && (
        <>
          {/* Subscriptions — первыми (только натив; веб — Stripe в следующей итерации) */}
          {native && (
            <div id="subscriptions" className="mb-8 scroll-mt-20">
              <div className="mb-4 text-center">
                <h2 className="flex items-center justify-center gap-2 text-lg font-semibold">
                  <Crown className="h-5 w-5 text-amber-400" />
                  {ts("title")}
                </h2>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                  {ts("subtitle")}
                </p>
              </div>

              {activeSub ? (
                <div className="glass rounded-2xl border-emerald-400/30 p-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-300">{ts("activeTitle")}</p>
                  <p className="mt-1 text-lg font-bold">
                    {ts("activeUntil", {
                      tier: tierName(activeSub.tier),
                      date: formatSubDate(activeSub.current_period_end),
                    })}
                  </p>
                  {activeSub.status === "canceled" && (
                    <p className="mt-1 text-xs text-amber-300">
                      {ts("activeCanceled", { date: formatSubDate(activeSub.current_period_end) })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => manageSubscriptions()}
                    className="mt-4 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                  >
                    {ts("manageBtn")}
                  </button>
                </div>
              ) : (
                <>
                  {/* Переключатель месяц/год */}
                  <div className="mb-4 flex justify-center">
                    <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                      {(["monthly", "yearly"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSubPeriod(p)}
                          className={`relative rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                            subPeriod === p
                              ? "bg-amber-500/20 text-amber-300 shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p === "monthly" ? ts("monthly") : ts("yearly")}
                          {p === "yearly" && (
                            <span className="ml-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {ts("yearlyBadge")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["forager", "pro"] as const).map((tier) => {
                      const product = SUBSCRIPTION_PRODUCTS.find(
                        (p) => p.tier === tier && p.period === subPeriod
                      )!;
                      const price = subPrices[product.productId] || product.fallbackPrice;
                      const features =
                        tier === "pro"
                          ? (["proF1", "proF2", "proF3", "proF4", "proF5", "proF6"] as const)
                          : (["foragerF1", "foragerF2", "foragerF3", "foragerF4"] as const);
                      const isPro = tier === "pro";
                      return (
                        <div
                          key={tier}
                          className={`glass relative flex flex-col rounded-2xl p-5 ${
                            isPro ? "border-amber-400/40 ring-1 ring-amber-400/20" : ""
                          }`}
                        >
                          <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white">
                            {ts("trialBadge")}
                          </span>
                          <div className="mb-1 flex items-center gap-2">
                            <Crown className={`h-5 w-5 ${isPro ? "text-amber-400" : "text-emerald-400"}`} />
                            <span className="text-xl font-bold">{tierName(tier)}</span>
                          </div>
                          <div className="mb-3 flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary-light">{price}</span>
                            <span className="text-sm text-muted-foreground">
                              {subPeriod === "monthly" ? ts("perMonth") : ts("perYear")}
                            </span>
                          </div>
                          <ul className="mb-4 flex-1 space-y-1.5">
                            {features.map((key) => (
                              <li key={key} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                                {ts(key)}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            onClick={() => handleSubscribe(tier)}
                            disabled={subPurchasing !== null}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                              isPro
                                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                : "bg-gradient-to-r from-emerald-500 to-teal-600"
                            }`}
                          >
                            {subPurchasing === product.productId ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {ts("purchasing")}
                              </>
                            ) : (
                              ts("subscribeBtn", { tier: tierName(tier) })
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {subError && (
                    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                      {subError}
                    </div>
                  )}

                  <p className="mt-3 text-center text-xs text-muted-foreground/70">
                    {ts("storeNote", { store })}
                  </p>
                </>
              )}

              {/* Обязательные ссылки для подписок (App Review 3.1.2):
                  Terms of Use (EULA) и Privacy Policy прямо в purchase flow. */}
              <p className="mt-2 text-center text-xs">
                <Link href="/offer" className="text-primary hover:underline">
                  {ts("termsLink")}
                </Link>
                <span className="mx-2 text-muted-foreground/30">·</span>
                <Link href="/privacy" className="text-primary hover:underline">
                  {ts("privacyLink")}
                </Link>
              </p>
            </div>
          )}

          {/* Referral promo */}
          {hasReferrer ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
              <Gift className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-300">
                {t.rich("refActiveBanner", {
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          ) : (
            <div className="glass mb-6 rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4 text-emerald-400" />
                {t("refHavePromo")}
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refCode}
                  onChange={(e) => {
                    setRefCode(e.target.value.toUpperCase());
                    setRefResult(null);
                  }}
                  placeholder={t("refPlaceholder")}
                  maxLength={12}
                  className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-mono tracking-wider outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleApplyRef}
                  disabled={refApplying || !refCode.trim()}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {refApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t("refApplyBtn")}
                </button>
              </div>
              {refResult && (
                <p className={`mt-2 text-xs ${refResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {refResult.msg}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground/70">
                {t("refHint")}
              </p>
            </div>
          )}

          {/* Packages */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">{t("choosePack")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TOKEN_PACKAGES.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPack(pack.id)}
                  className={`relative rounded-2xl p-5 text-left transition-all ${
                    selectedPack === pack.id
                      ? "glass border-amber-400/50 ring-1 ring-amber-400/30 bg-amber-500/10"
                      : "glass hover:bg-white/8"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-white">
                      {t("popularBadge")}
                    </span>
                  )}
                  <div className="mb-2 flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-400" />
                    <span className="text-2xl font-bold">{pack.tokens}</span>
                    {hasReferrer && (
                      <span className="text-sm font-semibold text-emerald-400">+{Math.max(1, Math.round(pack.tokens * 0.1))}</span>
                    )}
                    <span className="text-sm text-muted-foreground">{t("tokensPlural")}</span>
                  </div>
                  {native && storePrices[pack.id] ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-primary-light">{storePrices[pack.id]}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-primary-light">{pack.price}</span>
                        <span className="text-sm text-muted-foreground">{BRAND.currency}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(pack.price / pack.tokens).toFixed(2)} {BRAND.currency} {t("perToken")}
                      </p>
                    </>
                  )}
                  {selectedPack === pack.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-amber-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom amount (недоступно в приложении — IAP только фиксированные пакеты) */}
            {!native && (
            <>
            <button
              type="button"
              onClick={() => setSelectedPack("custom")}
              className={`mt-3 w-full relative rounded-2xl p-5 text-left transition-all ${
                isCustom
                  ? "glass border-amber-400/50 ring-1 ring-amber-400/30 bg-amber-500/10"
                  : "glass hover:bg-white/8"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-400" />
                <span className="text-lg font-bold">{t("customPackTitle")}</span>
                <span className="text-xs text-muted-foreground">{t("customPackFrom")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("bestRate")}: {BULK_RATE} {BRAND.currency} {t("perToken")}
              </p>
              {isCustom && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Check className="h-5 w-5 text-amber-400" />
                </div>
              )}
            </button>

            {isCustom && (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <label className="mb-1.5 block text-sm font-medium">{t("customAmountLabel")}</label>
                <div className="relative">
                  <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                  <input
                    type="number"
                    min={301}
                    max={100000}
                    value={customTokens}
                    onChange={(e) => setCustomTokens(parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("totalLabel")}</span>
                  <span className="font-bold text-primary-light">{purchasePrice.toFixed(2)} {BRAND.currency}</span>
                </div>
                {hasReferrer && (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-emerald-400">{t("bonusLabel")}</span>
                    <span className="font-semibold text-emerald-400">{t("bonusTokens", { n: Math.max(1, Math.round(customTokens * 0.1)) })}</span>
                  </div>
                )}
              </div>
            )}
            </>
            )}
          </div>

          {/* Cost table */}
          <div className="glass mb-6 rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-400" />
              {t("costsTitle")}
            </h2>
            <div className="space-y-2">
              {costEntries
                .filter(([key]) => key !== "marketplace_buy")
                .map(([key, cost]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
                  <span className="text-sm">{t(`costs.${key}`)}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-amber-400">
                    {key === "forest_search" ? "1–10" : cost} <Coins className="h-3 w-3" />
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
                <span className="text-sm">{t("costMarketplaceBuy")}</span>
                <span className="text-sm font-semibold text-muted-foreground">{t("costSellerPrice")}</span>
              </div>
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="mb-2 text-xs font-medium text-emerald-400">{t("freeTitle")}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{t("freeItem1")}</p>
                  <p>{t("freeItem2")}</p>
                  <p>{t("freeItem3")}</p>
                  <p>{t("freeItem4")}</p>
                </div>
              </div>
            </div>
          </div>

          {buyError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {buyError}
            </div>
          )}

          <button
            type="button"
            onClick={handlePurchase}
            disabled={purchasing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50"
          >
            {purchasing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Coins className="h-5 w-5" />
            )}
            <span className="sm:hidden">
              {t("buyBtnShort", {
                tokens: `${purchaseTokens}${hasReferrer ? `+${Math.max(1, Math.round(purchaseTokens * 0.1))}` : ""}`,
                price: displayPrice,
              })}
            </span>
            <span className="hidden sm:inline">
              {t("buyBtnFull", {
                tokens: `${purchaseTokens}${hasReferrer ? ` + ${Math.max(1, Math.round(purchaseTokens * 0.1))}` : ""}`,
                price: displayPrice,
              })}
            </span>
          </button>

          {native ? (
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                {t("nativeSecureNote", { store })}
              </p>
            </div>
          ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-xs font-medium">{t("securePayment")}</span>
              </div>
              <div className="flex gap-2">
                {ACCEPTED_CARDS.map((card) => (
                  <div
                    key={card}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium"
                  >
                    {card}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {t("paymentsVia")} {BRAND.paymentProviderName} — {t("pciNote")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {t("cardDataNote")}
              </p>
            </div>
            <div className="text-center">
              <a href="/return_goods" className="text-xs text-primary hover:underline">
                {t("refundTerms")}
              </a>
              <span className="mx-2 text-muted-foreground/30">·</span>
              <a
                href={BRAND.contacts.telegram || `mailto:${BRAND.contacts.email}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {BRAND.contacts.telegram ? t("supportTelegram") : t("supportGeneric")}
              </a>
            </div>
          </div>
          )}
        </>
      )}

      {/* ========== WITHDRAW TAB ========== */}
      {!native && tab === "withdraw" && (
        <>
          {wSuccess ? (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="mb-2 text-xl font-bold">{tw("successTitle")}</h2>
              <p className="mb-1 text-muted-foreground">
                {tw("successRequested")} <strong className="text-amber-400">{tw("successTokens", { n: wWithdrawn })}</strong>{" "}
                (~{(wWithdrawn * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency})
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                {tw("successBody")}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-primary/20 px-6 py-2.5 text-sm font-medium text-primary-light transition-colors hover:bg-primary/30"
                >
                  {tw("goHome")}
                </Link>
                <button
                  onClick={() => {
                    setWSuccess(false);
                    setWWithdrawn(0);
                    setWAmount(MIN_WITHDRAW);
                    setWDetails("");
                    setWFullName("");
                    setWComment("");
                  }}
                  className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                >
                  {tw("newRequest")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Withdraw balance info */}
              <div className="glass mb-6 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tw("available")}</span>
                  <div className="text-right">
                    <span className="flex items-center gap-1.5 text-lg font-bold text-emerald-400">
                      <Coins className="h-5 w-5" />
                      {maxAmount} {tw("tokensPlural")}
                    </span>
                    <p className="text-xs text-muted-foreground">~{(maxAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency}</p>
                  </div>
                </div>
                <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-center text-xs text-muted-foreground">
                  {tw("rateLabel")}: <strong className="text-foreground">1 {tw("rateToken")} = {TOKEN_WITHDRAW_RATE} {BRAND.currency}</strong>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {tw("earnedOnly", { store })}
                </div>
              </div>

              {maxAmount < MIN_WITHDRAW ? (
                <div className="glass rounded-2xl p-6 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
                  <p className="mb-2 font-medium">{tw("notEnoughTitle")}</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {tw("notEnoughEarnedBody", { min: MIN_WITHDRAW })}
                  </p>
                  <Link
                    href="/dashboard/referral"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary-light transition-colors hover:bg-primary/30"
                  >
                    {tw("inviteFriend")}
                  </Link>
                </div>
              ) : (
                <div className="glass rounded-2xl p-6">
                  {/* Amount */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">
                      {tw("amountLabel")}
                    </label>
                    <div className="relative">
                      <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                      <input
                        type="number"
                        min={MIN_WITHDRAW}
                        max={maxAmount}
                        value={wAmount}
                        onChange={(e) =>
                          setWAmount(
                            Math.min(maxAmount, Math.max(1, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tw("minMax", { min: MIN_WITHDRAW, max: maxAmount })}</span>
                      <button
                        type="button"
                        onClick={() => setWAmount(maxAmount)}
                        className="text-primary-light hover:underline"
                      >
                        {tw("maxBtn", { n: maxAmount })}
                      </button>
                    </div>
                    {wAmount >= MIN_WITHDRAW && (
                      <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center text-sm">
                        <span className="text-muted-foreground">{tw("payoutAmount")}</span>
                        <strong className="text-emerald-400">{(wAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency}</strong>
                      </div>
                    )}
                  </div>

                  {/* Method */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">{tw("methodLabel")}</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {WITHDRAW_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setWMethod(m.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                            wMethod === m.id
                              ? "border-primary bg-primary/10 text-primary-light"
                              : "border-border hover:bg-white/5"
                          }`}
                        >
                          <m.icon className="h-4 w-4 flex-shrink-0" />
                          {withdrawMethodLabel(m, locale)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full name */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">{tw("fullNameLabel")}</label>
                    <input
                      type="text"
                      value={wFullName}
                      onChange={(e) => setWFullName(e.target.value)}
                      placeholder={tw("fullNamePlaceholder")}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Payment details */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">{tw("detailsLabel")}</label>
                    <input
                      type="text"
                      value={wDetails}
                      onChange={(e) => setWDetails(e.target.value)}
                      placeholder={currentMethodPlaceholder}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Comment */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">
                      {tw("commentLabel")} <span className="text-muted-foreground">{tw("commentOptional")}</span>
                    </label>
                    <textarea
                      value={wComment}
                      onChange={(e) => setWComment(e.target.value)}
                      placeholder={tw("commentPlaceholder")}
                      rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Info */}
                  <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                      <div className="text-xs leading-relaxed text-amber-300">
                        <p>{tw("infoNoteEarned")}</p>
                      </div>
                    </div>
                  </div>

                  {wError && (
                    <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                      {wError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={wLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {wLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="h-4 w-4" />
                    )}
                    <span className="sm:hidden">{tw("submitShort", { amount: wAmount, money: `${(wAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} ${BRAND.currency}` })}</span>
                    <span className="hidden sm:inline">{tw("submitFull", { amount: wAmount, money: `${(wAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} ${BRAND.currency}` })}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Transaction history */}
      <div className="glass mt-8 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-muted-foreground" />
          {t("historyTitle")}
        </h2>
        <TransactionHistory limit={20} />
      </div>
    </div>
  );
}
