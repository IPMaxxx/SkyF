"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  Copy,
  Check,
  ExternalLink,
  ArrowRightLeft,
  Link2,
  ScanSearch,
} from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import { BRAND } from "@/lib/brand";

const BOT_URL =
  process.env.NEXT_PUBLIC_MUSHROOM_BOT_URL ||
  BRAND.mushroomBotUrl ||
  "https://t.me/skyforest_mushroom_bot";

interface BotAccount {
  linked: boolean;
  telegram_id: number | null;
  bot_balance: number;
}

export function MushroomBotCard() {
  const t = useTranslations("dashboard.mushroomBot");
  const { realBalance, refresh } = useTokens();

  const [account, setAccount] = useState<BotAccount | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [amount, setAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const loadAccount = async () => {
    try {
      const res = await fetch("/api/mushroom-bot/account");
      if (res.ok) setAccount(await res.json());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const generateCode = async () => {
    setCodeLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/mushroom-bot/link-code", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.code) {
        setCode(data.code);
      } else {
        setMessage({ type: "err", text: data.error || t("errorGeneric") });
      }
    } catch {
      setMessage({ type: "err", text: t("errorGeneric") });
    } finally {
      setCodeLoading(false);
    }
  };

  const copyCommand = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/link ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const transfer = async () => {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value < 1) {
      setMessage({ type: "err", text: t("minAmount") });
      return;
    }
    setTransferring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/mushroom-bot/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "ok",
          text: t("transferSuccess", {
            amount: data.transferred,
            balance: data.bot_balance,
          }),
        });
        setAmount("");
        setAccount((prev) =>
          prev ? { ...prev, bot_balance: data.bot_balance } : prev
        );
        await refresh();
      } else {
        setMessage({ type: "err", text: data.error || t("errorGeneric") });
      }
    } catch {
      setMessage({ type: "err", text: t("errorGeneric") });
    } finally {
      setTransferring(false);
    }
  };

  const available = realBalance ?? 0;

  return (
    <div className="mt-8 sm:mt-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
          <Bot className="h-5 w-5 text-sky-400" aria-hidden="true" />
          {t("title")}
        </h2>
        <div className="flex items-center gap-1.5">
          <ScanSearch className="h-4 w-4 text-sky-400" aria-hidden="true" />
          <span className="text-xl sm:text-2xl font-bold text-sky-400">
            {account?.bot_balance ?? 0}
          </span>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <p className="mb-4 text-sm text-muted-foreground">{t("subtitle")}</p>

        <div className="mb-2 flex items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
              account?.linked
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {account?.linked ? t("statusLinked") : t("statusNotLinked")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("balanceLabel")}: {account?.bot_balance ?? 0}
          </span>
        </div>

        {/* Шаг 1: привязка */}
        <div className="mt-4 rounded-xl border border-glass-border p-3.5">
          <h3 className="mb-1 text-sm font-semibold">{t("linkTitle")}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t("linkDesc")}</p>

          {code ? (
            <div className="rounded-lg bg-sky-500/10 p-3">
              <p className="mb-1 text-xs text-muted-foreground">{t("codeTitle")}</p>
              <div className="flex items-center gap-2">
                <code className="rounded-md bg-background/60 px-2 py-1 text-sm font-bold tracking-widest text-sky-300">
                  /link {code}
                </code>
                <button
                  type="button"
                  onClick={copyCommand}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/25"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("codeExpires")}</p>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                {t("openBot")}
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={generateCode}
              disabled={codeLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-1.5 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/25 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {codeLoading ? t("generating") : t("generateCode")}
            </button>
          )}
          {account?.linked && (
            <button
              type="button"
              onClick={generateCode}
              disabled={codeLoading}
              className="ml-2 text-xs text-muted-foreground hover:underline disabled:opacity-50"
            >
              {t("relink")}
            </button>
          )}
        </div>

        {/* Шаг 2: перевод токенов */}
        <div className="mt-3 rounded-xl border border-glass-border p-3.5">
          <h3 className="mb-1 text-sm font-semibold">{t("transferTitle")}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t("transferDesc")}</p>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("available", { amount: available })}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={available}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("amountPlaceholder")}
              className="w-40 rounded-lg border border-glass-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="button"
              onClick={transfer}
              disabled={transferring || available < 1}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              {transferring ? t("transferring") : t("transferBtn")}
            </button>
          </div>
        </div>

        {message && (
          <p
            className={`mt-3 text-sm ${
              message.type === "ok" ? "text-emerald-400" : "text-red-400"
            }`}
            aria-live="polite"
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
