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
import { useLocale, useTranslations } from "next-intl";
import { BRAND } from "@/lib/brand";
import { TOKEN_WITHDRAW_RATE } from "@/lib/tokens";
import {
  WITHDRAW_METHODS,
  withdrawMethodLabel,
  withdrawMethodPlaceholder,
} from "@/lib/payment-display";

const MIN_WITHDRAW = 100;

export default function WithdrawPage() {
  const locale = useLocale();
  const tw = useTranslations("payment.withdraw");
  const tc = useTranslations("common");
  const { realBalance, bonusBalance, withdrawable, refresh } = useTokens();
  const [amount, setAmount] = useState<number>(MIN_WITHDRAW);
  const [method, setMethod] = useState<string>("card");
  const [details, setDetails] = useState("");
  const [fullName, setFullName] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawn, setWithdrawn] = useState(0);

  const currentMethod = WITHDRAW_METHODS.find((m) => m.id === method) ?? WITHDRAW_METHODS[0];
  const currentMethodLabel = withdrawMethodLabel(currentMethod, locale);
  const currentMethodPlaceholder = withdrawMethodPlaceholder(currentMethod, locale);
  const totalBalance = realBalance ?? 0;
  // К выводу — только доход с маркетплейса минус уже выведенное
  // (купленные и бонусные токены не выводятся — политика сторов).
  const maxAmount = Math.max(0, withdrawable ?? 0);

  useEffect(() => {
    if (amount > maxAmount && maxAmount > 0) setAmount(maxAmount);
  }, [maxAmount, amount]);

  const handleSubmit = async () => {
    if (amount < MIN_WITHDRAW) {
      setError(tw("errMin", { min: MIN_WITHDRAW }));
      return;
    }
    if (amount > maxAmount) {
      setError(tw("errMaxEarned", { max: maxAmount }));
      return;
    }
    if (!details.trim()) {
      setError(tw("errDetails"));
      return;
    }
    if (!fullName.trim()) {
      setError(tw("errFullName"));
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
          method: `${currentMethodLabel}${fullName ? ` | ${tw("fullNameShort")}: ${fullName}` : ""}`,
          details: details.trim(),
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || tw("errSubmit"));
        setLoading(false);
        return;
      }

      setWithdrawn(data.withdrawn);
      setSuccess(true);
      refresh();
    } catch {
      setError(tc("networkError"));
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
          <h1 className="mb-2 text-xl font-bold">{tw("successTitle")}</h1>
          <p className="mb-1 text-muted-foreground">
            {tw("successRequested")} <strong className="text-amber-400">{tw("successTokens", { n: withdrawn })}</strong>{" "}
            (~{(withdrawn * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency})
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
                setSuccess(false);
                setWithdrawn(0);
                setAmount(MIN_WITHDRAW);
                setDetails("");
                setFullName("");
                setComment("");
              }}
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              {tw("newRequest")}
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
          {tw("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tw("subtitle")}
        </p>
      </div>

      {/* Current balance */}
      <div className="glass mb-6 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{tw("yourBalance")}</span>
          <div className="text-right">
            <span className="flex items-center gap-1.5 text-lg font-bold text-amber-400">
              <Coins className="h-5 w-5" />
              {totalBalance} {tw("tokensPlural")}
            </span>
            <p className="text-xs text-muted-foreground">~{(totalBalance * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
          <span>{tw("availableFor")} <strong className="text-emerald-400">{maxAmount}</strong> (~{(maxAmount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency})</span>
        </div>
        {(bonusBalance ?? 0) > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {tw("bonusNotWithdrawable", { n: bonusBalance ?? 0 })}
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          {tw("earnedOnly")}
        </div>
        <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-center text-xs text-muted-foreground">
          {tw("rateLabel")}: <strong className="text-foreground">1 {tw("rateToken")} = {TOKEN_WITHDRAW_RATE} {BRAND.currency}</strong>
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
              <span>{tw("minMax", { min: MIN_WITHDRAW, max: maxAmount })}</span>
              <button
                type="button"
                onClick={() => setAmount(maxAmount)}
                className="text-primary-light hover:underline"
              >
                {tw("maxBtn", { n: maxAmount })}
              </button>
            </div>
            {amount >= MIN_WITHDRAW && (
              <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center text-sm">
                <span className="text-muted-foreground">{tw("payoutAmount")}</span>
                <strong className="text-emerald-400">{(amount * TOKEN_WITHDRAW_RATE).toFixed(2)} {BRAND.currency}</strong>
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
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    method === m.id
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
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={tw("fullNamePlaceholder")}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Payment details */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium">{tw("detailsLabel")}</label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
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
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
            {tw("submitFull", { amount, money: `${(amount * TOKEN_WITHDRAW_RATE).toFixed(2)} ${BRAND.currency}` })}
          </button>
        </div>
      )}
    </div>
  );
}
