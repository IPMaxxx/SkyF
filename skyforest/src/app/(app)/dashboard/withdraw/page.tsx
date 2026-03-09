"use client";

import { useState, useEffect } from "react";
import {
  ArrowDownToLine,
  Coins,
  Loader2,
  CheckCircle,
  Wallet,
  CreditCard,
  Building2,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import Link from "next/link";

const METHODS = [
  { id: "card", label: "Банковская карта", icon: CreditCard, placeholder: "Номер карты (XXXX XXXX XXXX XXXX)" },
  { id: "erip", label: "ЕРИП / расчётный счёт", icon: Building2, placeholder: "Номер счёта / IBAN" },
  { id: "phone", label: "Перевод по номеру телефона", icon: Wallet, placeholder: "+375 (XX) XXX-XX-XX" },
  { id: "other", label: "Другой способ", icon: MessageSquare, placeholder: "Укажите способ и реквизиты" },
] as const;

const MIN_WITHDRAW = 10;

export default function WithdrawPage() {
  const { balance, refresh } = useTokens();
  const [amount, setAmount] = useState<number>(MIN_WITHDRAW);
  const [method, setMethod] = useState<string>("card");
  const [details, setDetails] = useState("");
  const [fullName, setFullName] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawn, setWithdrawn] = useState(0);

  const currentMethod = METHODS.find((m) => m.id === method) ?? METHODS[0];
  const maxAmount = balance ?? 0;

  useEffect(() => {
    if (amount > maxAmount && maxAmount > 0) setAmount(maxAmount);
  }, [maxAmount, amount]);

  const handleSubmit = async () => {
    if (amount < MIN_WITHDRAW) {
      setError(`Минимальная сумма вывода — ${MIN_WITHDRAW} токенов`);
      return;
    }
    if (amount > maxAmount) {
      setError("Недостаточно токенов на балансе");
      return;
    }
    if (!details.trim()) {
      setError("Укажите реквизиты для вывода");
      return;
    }
    if (!fullName.trim()) {
      setError("Укажите ФИО получателя");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tokens/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: `${currentMethod.label}${fullName ? ` | ФИО: ${fullName}` : ""}`,
          details: details.trim(),
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка при оформлении заявки");
        setLoading(false);
        return;
      }

      setWithdrawn(data.withdrawn);
      setSuccess(true);
      refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold">Заявка отправлена</h1>
          <p className="mb-1 text-muted-foreground">
            Вы запросили вывод <strong className="text-amber-400">{withdrawn} токенов</strong>
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
                setSuccess(false);
                setWithdrawn(0);
                setAmount(MIN_WITHDRAW);
                setDetails("");
                setFullName("");
                setComment("");
              }}
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              Новая заявка
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
          Вывод токенов
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Обменяйте заработанные токены на деньги
        </p>
      </div>

      {/* Current balance */}
      <div className="glass mb-6 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Ваш баланс</span>
          <span className="flex items-center gap-1.5 text-lg font-bold text-amber-400">
            <Coins className="h-5 w-5" />
            {balance ?? 0} токенов
          </span>
        </div>
      </div>

      {maxAmount < MIN_WITHDRAW ? (
        <div className="glass rounded-2xl p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <p className="mb-2 font-medium">Недостаточно токенов</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Минимальная сумма вывода — {MIN_WITHDRAW} токенов. Зарабатывайте токены, размещая
            грибные локации на маркетплейсе или приглашая друзей.
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
                value={amount}
                onChange={(e) =>
                  setAmount(
                    Math.min(maxAmount, Math.max(1, parseInt(e.target.value) || 0))
                  )
                }
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Мин. {MIN_WITHDRAW} токенов</span>
              <button
                type="button"
                onClick={() => setAmount(maxAmount)}
                className="text-primary-light hover:underline"
              >
                Вывести всё ({maxAmount})
              </button>
            </div>
          </div>

          {/* Method */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium">Способ вывода</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    method === m.id
                      ? "border-primary bg-primary/10 text-primary-light"
                      : "border-border hover:bg-white/5"
                  }`}
                >
                  <m.icon className="h-4 w-4 flex-shrink-0" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Full name */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium">ФИО получателя</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Payment details */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium">Реквизиты</label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={currentMethod.placeholder}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Comment */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium">
              Комментарий <span className="text-muted-foreground">(необязательно)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
                  Токены будут списаны с баланса сразу. Мы свяжемся с вами по email
                  для подтверждения и перевода средств. Обработка обычно занимает 1–3 рабочих дня.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Запросить вывод {amount} токенов
          </button>
        </div>
      )}
    </div>
  );
}
