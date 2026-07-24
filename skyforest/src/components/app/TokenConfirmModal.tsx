"use client";

import { createPortal } from "react-dom";
import { Coins, AlertTriangle, Loader2, Crown } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useIsNative } from "@/lib/native/useIsNative";
import { formatTokenUsd } from "@/lib/tokens";

interface TokenConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  cost: number;
  balance: number | null;
  loading?: boolean;
  free?: boolean;
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
    subscribe: "Подписка от $5.99/мес",
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
    subscribe: "Subscription from $5.99/mo",
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
  const native = useIsNative();
  const intlLocale = useLocale();

  if (!open || typeof document === "undefined") return null;

  const L = (locale ?? intlLocale) === "en" ? MODAL_UI.en : MODAL_UI.ru;
  const currentBalance = balance ?? 0;
  const afterBalance = free ? currentBalance : currentBalance - cost;
  const notEnough = !free && afterBalance < 0;

  const sheet = native;

  return createPortal(
    <div
      className={cnSheetRoot(sheet)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-confirm-title"
    >
      <div className={cnBackdrop(sheet)} onClick={onCancel} aria-hidden="true" />
      <div className={cnPanel(sheet)}>
        {!sheet && (
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-token/15">
              <Coins className="h-5 w-5 text-token" />
            </div>
            <h3 id="token-confirm-title" className="text-lg font-bold">
              {title}
            </h3>
          </div>
        )}

        {sheet && (
          <>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[17px] border border-primary/30 bg-primary/15">
              <Coins className="h-7 w-7 text-primary-light" />
            </div>
            <h3
              id="token-confirm-title"
              className="font-heading text-center text-xl font-extrabold tracking-tight"
            >
              {title}
            </h3>
          </>
        )}

        <p
          className={cnDesc(sheet)}
        >
          {description}
        </p>

        <div className={cnCostBlock(sheet)}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{L.cost}</span>
            {free ? (
              <span className="font-semibold text-primary-light">{L.free}</span>
            ) : (
              <span className="flex items-center gap-1.5 font-extrabold text-token">
                <Coins className="h-3.5 w-3.5" />
                {cost} {intlLocale === "en" ? "tokens" : "токенов"}
                {native && (
                  <span className="font-normal text-muted-foreground">
                    {formatTokenUsd(cost)}
                  </span>
                )}
              </span>
            )}
          </div>
          {!sheet && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{L.currentBalance}</span>
                <span className="font-semibold">{currentBalance}</span>
              </div>
              {!free && (
                <div className="border-t border-white/10 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{L.afterOp}</span>
                    <span
                      className={`font-bold ${notEnough ? "text-red-400" : "text-primary-light"}`}
                    >
                      {afterBalance}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {sheet && !free && (
          <div className="mb-4 flex items-center justify-between px-1 text-[11.5px] text-muted-foreground">
            <span>{L.afterOp}</span>
            <span className={`font-bold ${notEnough ? "text-red-400" : "text-foreground/90"}`}>
              {afterBalance} {intlLocale === "en" ? "tokens" : "токенов"}
            </span>
          </div>
        )}

        {notEnough && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                {L.notEnough}{" "}
                <Link href="/payment" className="underline hover:text-red-300">
                  {L.topUp}
                </Link>
              </span>
            </div>
            {native && (
              <Link
                href="/payment#subscriptions"
                className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm font-medium text-primary-light transition-colors hover:bg-primary/20"
              >
                <Crown className="h-4 w-4" />
                {L.subscribe}
              </Link>
            )}
          </div>
        )}

        <div className={sheet ? "flex flex-col gap-2" : "flex gap-3"}>
          <button
            onClick={onConfirm}
            disabled={notEnough || loading}
            className={cnConfirmBtn(sheet, notEnough || !!loading)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {L.confirm}
          </button>
          <button
            onClick={onCancel}
            className={cnCancelBtn(sheet)}
          >
            {L.cancel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function cnSheetRoot(sheet: boolean) {
  return sheet
    ? "fixed inset-0 z-[9999] flex items-end justify-center"
    : "fixed inset-0 z-[9999] flex items-center justify-center p-4";
}

function cnBackdrop(sheet: boolean) {
  return sheet
    ? "fixed inset-0 bg-[rgba(4,8,6,0.7)] backdrop-blur-[3px]"
    : "fixed inset-0 bg-black/60 backdrop-blur-sm";
}

function cnPanel(sheet: boolean) {
  return sheet
    ? "relative z-[10000] w-full max-w-lg rounded-t-[24px] border border-white/[0.09] border-b-0 bg-[#0e1710] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_30px_60px_-18px_rgba(0,0,0,0.7)]"
    : "relative z-[10000] w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e1710]/95 p-6 shadow-2xl backdrop-blur-xl";
}

function cnDesc(sheet: boolean) {
  return sheet
    ? "mb-4 text-center text-[13px] leading-relaxed text-[#8aa090]"
    : "mb-4 text-sm leading-relaxed text-muted-foreground";
}

function cnCostBlock(sheet: boolean) {
  return sheet
    ? "mb-3 flex items-center justify-between rounded-[14px] border border-token/25 bg-token/10 px-4 py-3"
    : "mb-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4";
}

function cnConfirmBtn(sheet: boolean, disabled: boolean) {
  return [
    sheet ? "btn-primary h-[50px] w-full rounded-[14px] text-[15px]" : "",
    !sheet
      ? "flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-token to-orange-500 px-4 py-2.5 text-sm font-medium text-[#06120a] transition-opacity hover:opacity-90 disabled:opacity-50"
      : "",
    disabled ? "opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function cnCancelBtn(sheet: boolean) {
  return sheet
    ? "h-[46px] w-full rounded-[14px] bg-transparent text-[14px] font-bold text-[#8aa090] hover:text-foreground/90"
    : "flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5";
}
