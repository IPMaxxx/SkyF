"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import {
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

interface Props {
  email: string;
}

export function DeleteAccount({ email }: Props) {
  const router = useRouter();
  const t = useTranslations("account");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "ru-RU";

  const [showModal, setShowModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [effectiveAt, setEffectiveAt] = useState<string | null>(null);
  const [cooldownDays, setCooldownDays] = useState<number>(14);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/account/delete");
        if (res.ok) {
          const data = await res.json();
          setEffectiveAt(data.effective_at ?? null);
          if (data.cooldown_days) setCooldownDays(data.cooldown_days);
        }
      } catch {
        /* noop */
      }
    };
    load();
  }, []);

  const canConfirm = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  const handleSchedule = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_email: confirmEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("deleteError"));
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEffectiveAt(data.effective_at);
      if (data.cooldown_days) setCooldownDays(data.cooldown_days);
      setShowModal(false);
      setConfirmEmail("");

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setError(t("deleteError"));
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (res.ok) {
        setEffectiveAt(null);
        toast.success(t("deleteCooldownCancel"));
      } else {
        toast.error(t("deleteError"));
      }
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setCancelling(false);
    }
  };

  if (effectiveAt) {
    const effectiveDate = new Date(effectiveAt).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-300">
              {t("deleteCooldownTitle")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("deleteCooldownBody", { date: effectiveDate })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
        >
          {cancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          )}
          {t("deleteCooldownCancel")}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t("deleteAccount")}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!loading) {
                setShowModal(false);
                setConfirmEmail("");
                setError("");
              }
            }}
            aria-hidden="true"
          />
          <div className="relative z-[10000] w-full max-w-md rounded-2xl border border-red-500/20 bg-[#1a2a1f]/95 p-6 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => {
                if (!loading) {
                  setShowModal(false);
                  setConfirmEmail("");
                  setError("");
                }
              }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              disabled={loading}
              aria-label={t("deleteCancel")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 id="delete-account-title" className="text-lg font-bold text-red-400">
                {t("deleteAccount")}
              </h3>
            </div>

            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              {t("deleteWarning")}
            </p>

            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs text-amber-300">
                {t("deleteCooldownNotice", { days: cooldownDays })}
              </p>
            </div>

            <label
              htmlFor="delete-confirm-email"
              className="mb-2 block text-sm font-medium"
            >
              {t("deleteConfirmPrompt")}
            </label>
            <input
              id="delete-confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20"
              disabled={loading}
              autoComplete="off"
            />

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400"
              >
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setConfirmEmail("");
                  setError("");
                }}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50"
              >
                {t("deleteCancel")}
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={!canConfirm || loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
              >
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {t("deleteConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
