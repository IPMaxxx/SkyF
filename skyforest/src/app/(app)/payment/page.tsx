"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Coins, Loader2, Zap, Check, Gift, Tag } from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_PACKAGES, TOKEN_COSTS, getTokenCostLabel, BULK_RATE } from "@/lib/tokens";

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const { balance, loading: balanceLoading, refresh } = useTokens();
  const [selectedPack, setSelectedPack] = useState<string>(TOKEN_PACKAGES[1].id);
  const [customTokens, setCustomTokens] = useState<number>(500);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [hasReferrer, setHasReferrer] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [refApplying, setRefApplying] = useState(false);
  const [refResult, setRefResult] = useState<{ ok: boolean; msg: string } | null>(null);

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

  const isCustom = selectedPack === "custom";
  const selected = TOKEN_PACKAGES.find((p) => p.id === selectedPack);
  const purchaseTokens = isCustom ? customTokens : (selected?.tokens ?? 0);
  const purchasePrice = isCustom
    ? parseFloat((customTokens * BULK_RATE).toFixed(2))
    : (selected?.price ?? 0);

  const handlePurchase = async () => {
    if (isCustom && customTokens < 301) {
      setError("Минимальное количество для произвольной покупки — 301 токен");
      return;
    }
    setPurchasing(true);
    setError("");

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
        setError(data.error || "Ошибка создания платежа");
      }
    } catch {
      setError("Ошибка подключения к платёжной системе");
    } finally {
      setPurchasing(false);
    }
  };

  const costEntries = Object.entries(TOKEN_COSTS) as [keyof typeof TOKEN_COSTS, number][];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15">
          <Coins className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold">Токены</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Токены — внутренняя валюта сервиса. Вы платите только за то, что используете — без абонентской платы и скрытых списаний.
        </p>
      </div>

      {/* Current balance */}
      <div className="glass mb-8 rounded-2xl p-6 text-center">
        <p className="mb-1 text-sm text-muted-foreground">Ваш баланс</p>
        <div className="flex items-center justify-center gap-2">
          <Coins className="h-8 w-8 text-amber-400" />
          <span className="text-5xl font-bold text-amber-400">
            {balanceLoading ? "..." : balance ?? 0}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">токенов</p>
      </div>

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
                <span className="text-sm text-muted-foreground">BYN</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {(pack.price / pack.tokens).toFixed(2)} BYN за токен
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
            Лучший курс: {BULK_RATE} BYN за токен
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
              <span className="font-bold text-primary-light">{purchasePrice.toFixed(2)} BYN</span>
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

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePurchase}
        disabled={purchasing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50"
      >
        {purchasing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Coins className="h-5 w-5" />
        )}
        Купить {purchaseTokens}{hasReferrer ? ` + ${Math.max(1, Math.round(purchaseTokens * 0.1))}` : ""} токенов за {purchasePrice.toFixed(2)} BYN
      </button>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="text-xs font-medium">Безопасная оплата</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium">
            Visa
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium">
            MasterCard
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium">
            Белкарт
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Оплата через bePaid — сертифицированный провайдер PCI DSS Level 1.
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
          <a href="https://t.me/skyforest_support" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Поддержка в Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
