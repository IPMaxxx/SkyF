"use client";

import { useState } from "react";
import { X, Coins, Loader2, Store, AlertCircle } from "lucide-react";
import { getSeason } from "@/lib/supabase/types";
import type { BestDay, Season } from "@/lib/supabase/types";
import { useTranslations } from "next-intl";

const SEASON_KEYS: Record<Season, "seasonWinter" | "seasonSpring" | "seasonSummer" | "seasonAutumn"> = {
  winter: "seasonWinter",
  spring: "seasonSpring",
  summer: "seasonSummer",
  autumn: "seasonAutumn",
};

const LISTING_FEE = 10;

interface Props {
  open: boolean;
  onClose: () => void;
  bestDay: BestDay;
  onListed: () => void;
}

export function SellBestDayModal({ open, onClose, bestDay, onListed }: Props) {
  const t = useTranslations("marketplace.sellModal");
  const tc = useTranslations("common");
  const [price, setPrice] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const season = getSeason(bestDay.best_date);
  const hasPhotos = bestDay.photos && bestDay.photos.length > 0;

  const handleSubmit = async () => {
    if (!hasPhotos) {
      setError(t("needPhoto"));
      return;
    }
    if (price < 1) {
      setError(t("minPrice"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ best_day_id: bestDay.id, price }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("listError"));
        setLoading(false);
        return;
      }

      onListed();
      onClose();
    } catch {
      setError(tc("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const commission = Math.max(1, Math.floor(price * 0.2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative flex w-full max-w-md max-h-[90vh] flex-col rounded-2xl shadow-2xl">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 pb-0">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header + preview in one row */}
          <div className="mb-3 flex items-center gap-3">
            {bestDay.mushroom?.image_url ? (
              <img
                src={bestDay.mushroom.image_url}
                alt={bestDay.mushroom.latin_name}
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex-shrink-0">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold truncate">{bestDay.name}</h2>
              <p className="text-xs text-muted-foreground truncate">
                {bestDay.location?.name}
                {bestDay.mushroom && <> · <span className="italic">{bestDay.mushroom.common_name || bestDay.mushroom.latin_name}</span></>}
              </p>
            </div>
          </div>

          {!hasPhotos && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-400 font-medium">
                {t("needPhoto")}
              </p>
            </div>
          )}

          {/* Price + fees in compact layout */}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">{t("priceLabel")}</label>
            <div className="relative">
              <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Fees — inline compact */}
          <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("listingFee")}</span>
              <span className="text-amber-400 font-medium">−{LISTING_FEE} {t("tokensAbbr")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("commission")}</span>
              <span className="text-amber-400 font-medium">−{commission} {t("tokensAbbr")}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1">
              <span className="font-medium">{t("youGet")}</span>
              <span className="font-bold text-emerald-400">{price - commission} {t("tokensAbbr")}</span>
            </div>
          </div>

          {/* What buyer sees — collapsed into a compact block */}
          <details className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-amber-400 font-medium">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {t("buyerSees")}
            </summary>
            <div className="px-3 pb-2 text-amber-300/80 leading-relaxed">
              <p>{t("buyerSeesBody", { season: tc(SEASON_KEYS[season]) })}</p>
              <p className="mt-1 text-amber-400/70">{t("hiddenUntilPurchase")}</p>
            </div>
          </details>

          {/* Moderation disclaimer */}
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground/60">
            {t("moderation", { fee: LISTING_FEE })}
          </p>

          {error && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Fixed footer with buttons */}
        <div className="flex gap-3 border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            {tc("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasPhotos}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            {t("submit", { price })}
          </button>
        </div>
      </div>
    </div>
  );
}
