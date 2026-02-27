"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BestDay } from "@/lib/supabase/types";
import { Bell, BellOff, Loader2, Clock, Star, Check } from "lucide-react";

interface AutoCompare {
  id: string;
  best_day_id: string;
  enabled: boolean;
  run_time: string;
  last_run_at: string | null;
  last_score: number | null;
}

interface Props {
  bestDays: BestDay[];
}

export function AutoCompareSettings({ bestDays }: Props) {
  const [autoCompare, setAutoCompare] = useState<AutoCompare | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBdId, setSelectedBdId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [runTime, setRunTime] = useState("08:00");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("auto_compares")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAutoCompare(data);
        setSelectedBdId(data.best_day_id);
        setEnabled(data.enabled);
        setRunTime(data.run_time?.slice(0, 5) || "08:00");
      } else if (bestDays.length > 0) {
        setSelectedBdId(bestDays[0].id);
      }
      setLoading(false);
    };
    load();
  }, [bestDays]);

  const handleSave = async () => {
    if (!selectedBdId) return;
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (autoCompare) {
      await supabase
        .from("auto_compares")
        .update({
          best_day_id: selectedBdId,
          enabled,
          run_time: runTime + ":00",
        })
        .eq("id", autoCompare.id);
    } else {
      const { data } = await supabase
        .from("auto_compares")
        .insert({
          user_id: user.id,
          best_day_id: selectedBdId,
          enabled,
          run_time: runTime + ":00",
        })
        .select("*")
        .single();
      if (data) setAutoCompare(data);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка настроек...
      </div>
    );
  }

  if (bestDays.length === 0) return null;

  const selectedBd = bestDays.find((b) => b.id === selectedBdId);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        {enabled ? (
          <Bell className="h-5 w-5 text-primary-light" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <h3 className="text-lg font-semibold">Автосравнение</h3>
      </div>

      <p className="mb-5 text-sm text-muted-foreground">
        Ежедневно сравниваем текущую погоду с вашим эталоном и отправляем результат на email. Стоимость: 2 токена/день.
      </p>

      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Включить автосравнение</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Best Day select */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Best Day для сравнения</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {bestDays.map((bd) => (
              <button
                key={bd.id}
                type="button"
                onClick={() => setSelectedBdId(bd.id)}
                className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-colors ${
                  selectedBdId === bd.id
                    ? "border-primary/50 bg-primary/15"
                    : "border-white/10 bg-white/5 hover:border-primary/30"
                }`}
              >
                <Star className={`h-3.5 w-3.5 flex-shrink-0 ${selectedBdId === bd.id ? "text-amber-400" : "text-muted-foreground"}`} />
                <span className="truncate">{bd.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label htmlFor="ac-time" className="mb-1.5 block text-sm font-medium">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            Время (Минск, UTC+3)
          </label>
          <input
            id="ac-time"
            type="time"
            value={runTime}
            onChange={(e) => setRunTime(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Last result */}
        {autoCompare?.last_run_at && (
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Последний запуск:{" "}
              {new Date(autoCompare.last_run_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {autoCompare.last_score !== null && (
                <span className={`ml-2 font-bold ${
                  autoCompare.last_score >= 70 ? "text-green-400" : autoCompare.last_score >= 40 ? "text-yellow-400" : "text-red-400"
                }`}>
                  {Math.round(autoCompare.last_score)}%
                </span>
              )}
            </p>
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selectedBdId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {saved ? "Сохранено" : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}
