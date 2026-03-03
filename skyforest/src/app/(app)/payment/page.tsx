"use client";

import { useState } from "react";
import { Coins, Loader2, Zap, Check } from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_PACKAGES, TOKEN_COSTS, getTokenCostLabel } from "@/lib/tokens";

export default function PaymentPage() {
  const { balance, loading: balanceLoading, refresh } = useTokens();
  const [selectedPack, setSelectedPack] = useState<string>(TOKEN_PACKAGES[1].id);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  const selected = TOKEN_PACKAGES.find((p) => p.id === selectedPack)!;

  const handlePurchase = async () => {
    setPurchasing(true);
    setError("");

    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: selectedPack,
          tokens: selected.tokens,
          amount: selected.price,
        }),
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

      {/* Cost table */}
      <div className="glass mb-8 rounded-2xl p-6">
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
                {cost} <Coins className="h-3 w-3" />
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

      {/* Packages */}
      <div className="mb-6">
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
        Купить {selected.tokens} токенов за {selected.price} BYN
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
