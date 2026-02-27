"use client";

import { useState } from "react";
import { X, Coins, Loader2, Store, AlertCircle } from "lucide-react";
import { getSeasonLabel, getSeason } from "@/lib/supabase/types";
import type { BestDay } from "@/lib/supabase/types";

interface Props {
  open: boolean;
  onClose: () => void;
  bestDay: BestDay;
  onListed: () => void;
}

export function SellBestDayModal({ open, onClose, bestDay, onListed }: Props) {
  const [price, setPrice] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const season = getSeason(bestDay.best_date);

  const handleSubmit = async () => {
    if (price < 1) {
      setError("Минимальная цена — 1 токен");
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
        setError(data.error || "Ошибка при выставлении на продажу");
        setLoading(false);
        return;
      }

      onListed();
      onClose();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Продать Best Day</h2>
            <p className="text-xs text-muted-foreground">Выставить на маркетплейс</p>
          </div>
        </div>

        {/* Preview card */}
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            {bestDay.mushroom?.image_url ? (
              <img
                src={bestDay.mushroom.image_url}
                alt={bestDay.mushroom.latin_name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/15">
                <span className="text-xl">★</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{bestDay.name}</p>
              <p className="text-xs text-muted-foreground">
                {bestDay.location?.name}
              </p>
              {bestDay.mushroom && (
                <p className="truncate text-xs italic text-muted-foreground/70">
                  {bestDay.mushroom.common_name || bestDay.mushroom.latin_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* What buyer will see */}
        <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <div className="text-xs text-amber-300 leading-relaxed">
              <p className="mb-1 font-medium text-amber-400">Покупатель увидит:</p>
              <ul className="space-y-0.5">
                <li>• Описание и название локации</li>
                <li>• Сезон: <strong>{getSeasonLabel(season)}</strong> (вместо точной даты)</li>
                <li>• Фото и вид гриба</li>
                <li>• Тип леса</li>
              </ul>
              <p className="mt-1.5 font-medium text-amber-400">Скрыто до покупки:</p>
              <ul className="space-y-0.5">
                <li>• Точные координаты</li>
                <li>• Погодный паттерн</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Price input */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium">
            Цена в токенах
          </label>
          <div className="relative">
            <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
            <input
              type="number"
              min={1}
              
              value={price}
              onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Токены будут начислены вам после покупки
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Store className="h-4 w-4" />
            )}
            Выставить за {price} т.
          </button>
        </div>
      </div>
    </div>
  );
}
