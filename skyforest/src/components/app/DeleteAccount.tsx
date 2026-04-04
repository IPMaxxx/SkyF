"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function DeleteAccount({ email }: { email: string }) {
  const router = useRouter();
  const t = useTranslations("account");
  const [showModal, setShowModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canConfirm = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  const handleDelete = async () => {
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
        const data = await res.json();
        setError(data.error || t("deleteError"));
        setLoading(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setError(t("deleteError"));
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
        {t("deleteAccount")}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!loading) {
                setShowModal(false);
                setConfirmEmail("");
                setError("");
              }
            }}
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
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-red-400">
                {t("deleteAccount")}
              </h3>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              {t("deleteWarning")}
            </p>

            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs text-red-400/80">{t("deleteIrreversible")}</p>
            </div>

            <label className="mb-2 block text-sm font-medium">
              {t("deleteConfirmPrompt")}
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20"
              disabled={loading}
              autoComplete="off"
            />

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
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
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                {t("deleteCancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("deleteConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
