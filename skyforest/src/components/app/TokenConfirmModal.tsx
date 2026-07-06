"use client";

import { Coins, AlertTriangle, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";
import { formatTokenUsd } from "@/lib/tokens";

interface TokenConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  cost: number;
  balance: number | null;
  loading?: boolean;
  /** Бесплатное действие: показываем «Бесплатно» и не списываем токены. */
  free?: boolean;
  /** Язык подписей модалки. По умолчанию ru — веб-поведение без изменений. */
  locale?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const MODAL_UI = {
  ru: {
    cost: "Стоимость",
    free: "Бесплатно",
    currentBalance: "Текущий баланс",
    afterOp: "После операции",
    notEnough: "Недостаточно токенов.",
    topUp: "Пополнить",
    cancel: "Отмена",
    confirm: "Подтвердить",
  },
  en: {
    cost: "Cost",
    free: "Free",
    currentBalance: "Current balance",
    afterOp: "After operation",
    notEnough: "Not enough tokens.",
    topUp: "Top up",
    cancel: "Cancel",
    confirm: "Confirm",
  },
} as const;

export function TokenConfirmModal({
  open,
  title,
  description,
  cost,
  balance,
  loading,
  free,
  locale,
  onConfirm,
  onCancel,
}: TokenConfirmModalProps) {
  // На вебе всегда false (в т.ч. при гидрации) — веб-вид модалки не меняется.
  // В нативной оболочке дополнительно показываем сумму в долларах, как на сайте.
  const native = useIsNative();
  const intlLocale = useLocale();

  if (!open) return null;

  const L = (locale ?? intlLocale) === "en" ? MODAL_UI.en : MODAL_UI.ru;
  const currentBalance = balance ?? 0;
  const afterBalance = free ? currentBalance : currentBalance - cost;
  const notEnough = !free && afterBalance < 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-[10000] w-full max-w-sm rounded-2xl bg-[#1a2a1f]/95 border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Coins className="h-5 w-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>

        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="mb-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{L.cost}</span>
            {free ? (
              <span className="font-semibold text-emerald-400">{L.free}</span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                -{cost} <Coins className="h-3 w-3" />
                {native && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    {formatTokenUsd(cost)}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{L.currentBalance}</span>
            <span className="font-semibold">{currentBalance}</span>
          </div>
          {!free && (
            <div className="border-t border-white/10 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{L.afterOp}</span>
                <span
                  className={`font-bold ${notEnough ? "text-red-400" : "text-emerald-400"}`}
                >
                  {afterBalance}
                </span>
              </div>
            </div>
          )}
        </div>

        {notEnough && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {L.notEnough}{" "}
              <a href="/payment" className="underline hover:text-red-300">
                {L.topUp}
              </a>
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            {L.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={notEnough || loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Coins className="h-4 w-4" />
            )}
            {L.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
