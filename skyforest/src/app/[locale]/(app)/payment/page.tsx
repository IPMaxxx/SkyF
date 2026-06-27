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
} from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_PACKAGES, TOKEN_COSTS, getTokenCostLabel, BULK_RATE, TOKEN_WITHDRAW_RATE } from "@/lib/tokens";
import { TransactionHistory } from "@/components/app/TransactionHistory";
import { BRAND } from "@/lib/brand";
import {
  ACCEPTED_CARDS,
  WITHDRAW_METHODS,
  withdrawMethodLabel,
  withdrawMethodPlaceholder,
} from "@/lib/payment-display";
import { useLocale } from "next-intl";

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
const MIN_REMAINING = 50;

type Tab = "buy" | "withdraw";

function PaymentContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { balance, loading: balanceLoading, refresh } = useTokens();
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "withdraw" ? "withdraw" : "buy"
  );

  // Buy state
  const [selectedPack, setSelectedPack] = useState<string>(TOKEN_PACKAGES[1].id);
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
        setRefResult({ ok: true, msg: "Промокод активирован! +10% к каждой покупке" });
      } else if (data?.status === "already_linked") {
        setRefResult({ ok: false, msg: "У вас уже активирован промокод" });
      } else if (data?.status === "self_referral") {
        setRefResult({ ok: false, msg: "Нельзя использовать собственный код" });
      } else if (data?.status === "not_found") {
        setRefResult({ ok: false, msg: "Промокод не найден" });
      } else {
        setRefResult({ ok: false, msg: data?.error || "Ошибка применения кода" });
      }
    } catch {
      setRefResult({ ok: false, msg: "Ошибка сети" });
    } finally {
      setRefApplying(false);
    }
  };

  const handlePurchase = async () => {
    if (isCustom && customTokens < 301) {
      setBuyError("Минимальное количество для произвольной покупки — 301 токен");
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
        setBuyError(data.error || "Ошибка создания платежа");
      }
    } catch {
      setBuyError("Ошибка подключения к платёжной системе");
    } finally {
      setPurchasing(false);
    }
  };

  // --- Withdraw logic ---
  const currentMethod = WITHDRAW_METHODS.find((m) => m.id === wMethod) ?? WITHDRAW_METHODS[0];
  const currentMethodLabel = withdrawMethodLabel(currentMethod, locale);
  const currentMethodPlaceholder = withdrawMethodPlaceholder(currentMethod, locale);
  const totalBalance = balance ?? 0;
  const maxAmount = Math.max(0, totalBalance - MIN_REMAINING);

  useEffect(() => {
    if (wAmount > maxAmount && maxAmount > 0) setWAmount(maxAmount);
  }, [maxAmount, wAmount]);

  const handleWithdraw = async () => {
    if (wAmount < MIN_WITHDRAW) {
      setWError(`Минимальная сумма вывода — ${MIN_WITHDRAW} токенов`);
      return;
    }
    if (wAmount > maxAmount) {
      setWError(`Максимум для вывода — ${maxAmount} токенов (на балансе должно остаться ${MIN_REMAINING})`);
      return;
    }
    if (!wDetails.trim()) {
      setWError("Укажите реквизиты для вывода");
      return;
    }
    if (!wFullName.trim()) {
      setWError("Укажите ФИО получателя");
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
          method: `${currentMethodLabel}${wFullName ? ` | ${locale === "en" ? "Name" : "ФИО"}: ${wFullName}` : ""}`,
          details: wDetails.trim(),
          comment: wComment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWError(data.error || "Ошибка при оформлении заявки");
        setWLoading(false);
        return;
      }
      setWWithdrawn(data.withdrawn);
      setWSuccess(true);
      refresh();
    } catch {
      setWError("Ошибка сети");
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
        <h1 className="text-xl sm:text-2xl font-bold">Токены</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Внутренняя валюта сервиса. Платите только за то, что используете.
        </p>
      </div>

      {/* Balance */}
      <div className="glass mb-4 sm:mb-6 rounded-2xl p-4 sm:p-6 text-center">
        <p className="mb-1 text-sm text-muted-foreground">Ваш баланс</p>
        <div className="flex items-center justify-center gap-2">
          <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400" />
          <span className="text-4xl sm:text-5xl font-bold text-amber-400">
            {balanceLoading ? "..." : balance ?? 0}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">токенов</p>
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
          Купить
        </button>
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
          Вывести
        </button>
      </div>

      {/* ========== BUY TAB ========== */}
      {tab === "buy" && (
        <>
          {/* Referral promo */}
          {hasReferrer ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
              <Gift className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-300">
                У вас активирован промокод — <strong>+10% токенов</strong> к каждой покупке
              </p>
            </div>
          ) : (
            <div className="glass mb-6 rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4 text-emerald-400" />
                Есть промокод?
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refCode}
                  onChange={(e) => {
                    setRefCode(e.target.value.toUpperCase());
                    setRefResult(null);
                  }}
                  placeholder="Введите код"
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
                  Применить
                </button>
              </div>
              {refResult && (
                <p className={`mt-2 text-xs ${refResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {refResult.msg}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground/70">
                Активируйте промокод и получайте +10% токенов к каждой покупке
              </p>
            </div>
          )}

          {/* Packages */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Выберите пакет</h2>
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
                      Популярный
                    </span>
                  )}
                  <div className="mb-2 flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-400" />
                    <span className="text-2xl font-bold">{pack.tokens}</span>
                    {hasReferrer && (
                      <span className="text-sm font-semibold text-emerald-400">+{Math.max(1, Math.round(pack.tokens * 0.1))}</span>
                    )}
                    <span className="text-sm text-muted-foreground">токенов</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-primary-light">{pack.price}</span>
                    <span className="text-sm text-muted-foreground">{BRAND.currency}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(pack.price / pack.tokens).toFixed(2)} {BRAND.currency} {locale === "en" ? "per token" : "за токен"}
                  </p>
                  {selectedPack === pack.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-amber-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom amount */}
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
                <span className="text-lg font-bold">Своё количество</span>
                <span className="text-xs text-muted-foreground">от 301 токена</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === "en" ? "Best rate" : "Лучший курс"}: {BULK_RATE} {BRAND.currency} {locale === "en" ? "per token" : "за токен"}
              </p>
              {isCustom && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Check className="h-5 w-5 text-amber-400" />
                </div>
              )}
            </button>

            {isCustom && (
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <label className="mb-1.5 block text-sm font-medium">Количество токенов</label>
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
                  <span className="text-muted-foreground">Итого:</span>
                  <span className="font-bold text-primary-light">{purchasePrice.toFixed(2)} {BRAND.currency}</span>
                </div>
                {hasReferrer && (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-emerald-400">+10% бонус:</span>
                    <span className="font-semibold text-emerald-400">+{Math.max(1, Math.round(customTokens * 0.1))} токенов</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cost table */}
          <div className="glass mb-6 rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-400" />
              Стоимость операций
            </h2>
            <div className="space-y-2">
              {costEntries
                .filter(([key]) => key !== "marketplace_buy")
                .map(([key, cost]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
                  <span className="text-sm">{getTokenCostLabel(key)}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-amber-400">
                    {key === "forest_search" ? "1–10" : cost} <Coins className="h-3 w-3" />
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
                <span className="text-sm">Покупка на маркетплейсе</span>
                <span className="text-sm font-semibold text-muted-foreground">цена продавца</span>
              </div>
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="mb-2 text-xs font-medium text-emerald-400">Бесплатно:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>- Добавление локаций</p>
                  <p>- Сохранение грибных дней</p>
                  <p>- Поиск на маркетплейсе</p>
                  <p>- Сохранение найденных лесов как локации</p>
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
              {purchaseTokens}{hasReferrer ? `+${Math.max(1, Math.round(purchaseTokens * 0.1))}` : ""} {locale === "en" ? "for" : "за"} {purchasePrice.toFixed(2)} {BRAND.currency}
            </span>
            <span className="hidden sm:inline">
              {locale === "en" ? "Buy" : "Купить"} {purchaseTokens}{hasReferrer ? ` + ${Math.max(1, Math.round(purchaseTokens * 0.1))}` : ""} {locale === "en" ? "tokens for" : "токенов за"} {purchasePrice.toFixed(2)} {BRAND.currency}
            </span>
          </button>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-xs font-medium">Безопасная оплата</span>
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
                {locale === "en" ? "Payments via" : "Оплата через"} {BRAND.paymentProviderName} — {locale === "en" ? "PCI DSS Level 1 certified provider." : "сертифицированный провайдер PCI DSS Level 1."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Данные вашей карты защищены и не хранятся на наших серверах.
              </p>
            </div>
            <div className="text-center">
              <a href="/return_goods" className="text-xs text-primary hover:underline">
                Условия возврата средств
              </a>
              <span className="mx-2 text-muted-foreground/30">·</span>
              <a
                href={BRAND.contacts.telegram || `mailto:${BRAND.contacts.email}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {BRAND.contacts.telegram ? "Поддержка в Telegram" : "Поддержка"}
              </a>
            </div>
          </div>
        </>
      )}

      {/* ========== WITHDRAW TAB ========== */}
      {tab === "withdraw" && (
        <>
          {wSuccess ? (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="mb-2 text-xl font-bold">Заявка отправлена</h2>
              <p className="mb-1 text-muted-foreground">
                Вы запросили вывод <strong className="text-amber-400">{wWithdrawn} токенов</strong>{" "}
                (~{(wWithdrawn * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency})
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                Мы свяжемся с вами по email для уточнения деталей. Обычно обработка занимает 1–3 рабочих дня.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-primary/20 px-6 py-2.5 text-sm font-medium text-primary-light transition-colors hover:bg-primary/30"
                >
                  На главную
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
                  Новая заявка
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Withdraw balance info */}
              <div className="glass mb-6 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Доступно к выводу</span>
                  <div className="text-right">
                    <span className="flex items-center gap-1.5 text-lg font-bold text-emerald-400">
                      <Coins className="h-5 w-5" />
                      {maxAmount} токенов
                    </span>
                    <p className="text-xs text-muted-foreground">~{(maxAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency}</p>
                  </div>
                </div>
                <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-center text-xs text-muted-foreground">
                  {locale === "en" ? "Withdrawal rate" : "Курс вывода"}: <strong className="text-foreground">1 {locale === "en" ? "token" : "токен"} = {TOKEN_WITHDRAW_RATE} {BRAND.currency}</strong>
                  <span className="mx-2 text-white/20">·</span>
                  Минимальный остаток: {MIN_REMAINING} токенов
                </div>
              </div>

              {maxAmount < MIN_WITHDRAW ? (
                <div className="glass rounded-2xl p-6 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
                  <p className="mb-2 font-medium">Недостаточно токенов для вывода</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    На балансе должно быть больше {MIN_REMAINING + MIN_WITHDRAW} токенов (минимальный остаток — {MIN_REMAINING}, минимальный вывод — {MIN_WITHDRAW}).
                    Зарабатывайте токены, размещая грибные локации на маркетплейсе или приглашая друзей.
                  </p>
                  <Link
                    href="/dashboard/referral"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary-light transition-colors hover:bg-primary/30"
                  >
                    Пригласить друга
                  </Link>
                </div>
              ) : (
                <div className="glass rounded-2xl p-6">
                  {/* Amount */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">
                      Сумма вывода (токены)
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
                      <span>Мин. {MIN_WITHDRAW}, макс. {maxAmount} токенов</span>
                      <button
                        type="button"
                        onClick={() => setWAmount(maxAmount)}
                        className="text-primary-light hover:underline"
                      >
                        Максимум ({maxAmount})
                      </button>
                    </div>
                    {wAmount >= MIN_WITHDRAW && (
                      <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center text-sm">
                        <span className="text-muted-foreground">Сумма к выплате: </span>
                        <strong className="text-emerald-400">{(wAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency}</strong>
                      </div>
                    )}
                  </div>

                  {/* Method */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">Способ вывода</label>
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
                    <label className="mb-1.5 block text-sm font-medium">ФИО получателя</label>
                    <input
                      type="text"
                      value={wFullName}
                      onChange={(e) => setWFullName(e.target.value)}
                      placeholder="Иванов Иван Иванович"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Payment details */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium">Реквизиты</label>
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
                      Комментарий <span className="text-muted-foreground">(необязательно)</span>
                    </label>
                    <textarea
                      value={wComment}
                      onChange={(e) => setWComment(e.target.value)}
                      placeholder="Дополнительная информация..."
                      rows={2}
                      className="w-full resize-none rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Info */}
                  <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                      <div className="text-xs leading-relaxed text-amber-300">
                        <p>
                          Заявка будет отправлена администратору. Мы свяжемся с вами по email
                          для подтверждения и перевода средств. Обработка обычно занимает 1–3 рабочих дня.
                          На балансе должно остаться минимум {MIN_REMAINING} токенов.
                        </p>
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
                    <span className="sm:hidden">{locale === "en" ? "Withdraw" : "Вывод"} {wAmount} {locale === "en" ? "tok." : "ток."} (~{(wAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency})</span>
                    <span className="hidden sm:inline">{locale === "en" ? "Request withdrawal of" : "Запросить вывод"} {wAmount} {locale === "en" ? "tokens" : "токенов"} (~{(wAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency})</span>
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
          История операций
        </h2>
        <TransactionHistory limit={20} />
      </div>
    </div>
  );
}
