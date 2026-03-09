"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CompareChart } from "@/components/app/CompareChart";
import { NewLocationModal } from "@/components/app/NewLocationModal";
import type { BestDay, Location, WeatherDay } from "@/lib/supabase/types";
import { useTokens } from "@/lib/TokenContext";
import { useAppData } from "@/lib/AppDataContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import { toast } from "sonner";
import {
  comparePatterns,
  WEIGHT_LABELS,
  getMatchBgGradient,
  getMatchLabel,
  getMatchColor,
  type WeightConfig,
} from "@/lib/compare";
import {
  GitCompareArrows,
  ArrowLeft,
  Loader2,
  Star,
  Settings2,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Droplets,
  Plus,
  MapPin,
  Bell,
  BellOff,
  Trash2,
  Play,
  X,
  Clock,
} from "lucide-react";

interface LastResult {
  overall: number;
  byParameter: Record<string, number>;
  byDay: number[];
  currentWeather: WeatherDay[];
}

interface Comparison {
  id: string;
  best_day_id: string;
  location_id: string;
  name: string | null;
  enabled: boolean;
  run_time: string;
  weights: Record<keyof WeightConfig, number>;
  last_run_at: string | null;
  last_score: number | null;
  last_result: LastResult | null;
  best_day?: BestDay;
  location?: Location;
}

interface HistoryEntry {
  id: string;
  compare_date: string;
  overall_score: number;
  created_at: string;
}

const DEFAULT_WEIGHTS: Record<keyof WeightConfig, number> = {
  rain_sum: 30,
  temperature_mean: 25,
  temperature_min: 10,
  temperature_max: 10,
  wind_speed_max: 10,
  relative_humidity_mean: 15,
};

const paramKeys = Object.keys(DEFAULT_WEIGHTS) as (keyof WeightConfig)[];

export default function ComparePage() {
  const { locations, bestDays, loading: appLoading, addLocation } = useAppData();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { balance, spend } = useTokens();

  const [showCreate, setShowCreate] = useState(false);
  const [newBdId, setNewBdId] = useState("");
  const [newLocId, setNewLocId] = useState("");
  const [newAuto, setNewAuto] = useState(false);
  const [newTime, setNewTime] = useState("08:00");
  const [creating, setCreating] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showWeights, setShowWeights] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [confirmCompare, setConfirmCompare] = useState<Comparison | null>(null);
  const [confirmAutoToggle, setConfirmAutoToggle] = useState<Comparison | null>(null);

  useEffect(() => {
    if (bestDays.length > 0 && !newBdId) setNewBdId(bestDays[0].id);
    if (locations.length > 0 && !newLocId) setNewLocId(locations[0].id);
  }, [bestDays, locations, newBdId, newLocId]);

  useEffect(() => { loadComparisons(); }, []);

  const loadComparisons = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: cmpRes } = await supabase.from("auto_compares").select("id, user_id, best_day_id, location_id, name, enabled, run_time, weights, last_run_at, last_score, last_result, best_day:best_days(id, name, best_date, weather_data, location:locations(id, name, lat, lng), mushroom:mushroom_species(id, latin_name, common_name, image_url)), location:locations(id, name, lat, lng)").eq("user_id", user.id).order("created_at", { ascending: false });
    if (cmpRes) {
      setComparisons(cmpRes.map((c: Record<string, unknown>) => ({
        ...c,
        weights: (c.weights as Record<keyof WeightConfig, number>) || DEFAULT_WEIGHTS,
      })) as unknown as Comparison[]);
    }
    setLoading(false);
  };

  const loadHistory = async (compareId: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("saved_compares").select("id, compare_date, overall_score, created_at").eq("auto_compare_id", compareId).order("created_at", { ascending: false }).limit(30);
    setHistory(data || []);
    setHistoryLoaded(true);
  };

  const openComparison = (id: string) => {
    setOpenId(id);
    setShowWeights(false);
    setHistoryLoaded(false);
    setHistory([]);
    loadHistory(id);
  };

  const handleCreate = async () => {
    if (!newBdId || !newLocId) { setError("Выберите грибной день и локацию"); return; }
    setCreating(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Необходимо авторизоваться"); setCreating(false); return; }

    const bd = bestDays.find((b) => b.id === newBdId);
    const loc = locations.find((l) => l.id === newLocId);

    const { data, error: dbErr } = await supabase.from("auto_compares").insert({
      user_id: user.id,
      best_day_id: newBdId,
      location_id: newLocId,
      name: `${bd?.name || "Грибной день"} → ${loc?.name || "Локация"}`,
      enabled: newAuto,
      run_time: newTime + ":00",
      weights: DEFAULT_WEIGHTS,
    }).select("id, user_id, best_day_id, location_id, name, enabled, run_time, weights, last_run_at, last_score, last_result, best_day:best_days(id, name, best_date, weather_data, location:locations(id, name, lat, lng), mushroom:mushroom_species(id, latin_name, common_name, image_url)), location:locations(id, name, lat, lng)").single();

    if (dbErr) { setError(dbErr.message); setCreating(false); return; }
    if (data) setComparisons((prev) => [{ ...data, weights: DEFAULT_WEIGHTS } as unknown as Comparison, ...prev]);
    setShowCreate(false);
    setCreating(false);
  };

  const requestCompare = (cmp: Comparison) => {
    const bd = cmp.best_day;
    const loc = cmp.location;
    if (!bd?.weather_data || !loc) { setError("Нет данных для сравнения"); return; }
    setConfirmCompare(cmp);
  };

  const handleRunCompare = async (cmp: Comparison) => {
    setConfirmCompare(null);
    const bd = cmp.best_day;
    const loc = cmp.location;
    if (!bd?.weather_data || !loc) { setError("Нет данных для сравнения"); return; }

    const spendResult = await spend("compare", "Сравнение погодных условий");
    if (!spendResult.success) { setError(spendResult.error || "Недостаточно токенов"); return; }
    toast.success(`Списано ${TOKEN_COSTS.compare} токена`);

    setRunningId(cmp.id);
    setError("");

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/weather?lat=${loc.lat}&lng=${loc.lng}&date=${today}&days=14`);
      const data = await res.json();
      if (data.error) { setError(data.error); setRunningId(null); return; }

      const currentDays: WeatherDay[] = data.days || [];
      const cfg = {} as WeightConfig;
      for (const k of paramKeys) cfg[k] = cmp.weights[k] / 100;
      const cmpResult = comparePatterns(bd.weather_data, currentDays, cfg);

      const lastResult: LastResult = { overall: cmpResult.overall, byParameter: cmpResult.byParameter, byDay: cmpResult.byDay, currentWeather: currentDays };

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("auto_compares").update({ last_score: cmpResult.overall, last_run_at: new Date().toISOString(), last_result: lastResult }).eq("id", cmp.id);

      if (user) {
        await supabase.from("saved_compares").insert({
          user_id: user.id, best_day_id: cmp.best_day_id, location_id: cmp.location_id, auto_compare_id: cmp.id,
          compare_date: today, current_weather: currentDays, weights: cmp.weights,
          overall_score: cmpResult.overall, by_parameter: cmpResult.byParameter, by_day: cmpResult.byDay,
        });
      }

      setComparisons((prev) => prev.map((c) => c.id === cmp.id ? { ...c, last_score: cmpResult.overall, last_run_at: new Date().toISOString(), last_result: lastResult } : c));
      loadHistory(cmp.id);
    } catch { setError("Ошибка загрузки данных"); } finally { setRunningId(null); }
  };

  const requestToggleAuto = (cmp: Comparison) => {
    if (cmp.enabled) {
      doToggleAuto(cmp);
    } else {
      setConfirmAutoToggle(cmp);
    }
  };

  const doToggleAuto = async (cmp: Comparison) => {
    setConfirmAutoToggle(null);
    const supabase = createClient();
    const next = !cmp.enabled;
    await supabase.from("auto_compares").update({ enabled: next }).eq("id", cmp.id);
    setComparisons((prev) => prev.map((c) => c.id === cmp.id ? { ...c, enabled: next } : c));
    if (next) {
      toast.info(`Автосравнение включено. Расход: ~${TOKEN_COSTS.compare * 30} токенов/мес.`);
    } else {
      toast.info("Автосравнение выключено");
    }
  };

  const handleTimeChange = async (cmp: Comparison, time: string) => {
    const supabase = createClient();
    await supabase.from("auto_compares").update({ run_time: time + ":00" }).eq("id", cmp.id);
    setComparisons((prev) => prev.map((c) => c.id === cmp.id ? { ...c, run_time: time + ":00" } : c));
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("auto_compares").delete().eq("id", id);
    setComparisons((prev) => prev.filter((c) => c.id !== id));
    if (openId === id) setOpenId(null);
  };

  const handleWeightChange = (cmpId: string, key: keyof WeightConfig, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setComparisons((prev) => prev.map((c) => {
      if (c.id !== cmpId) return c;
      const newWeights = { ...c.weights, [key]: clamped };
      const total = Object.values(newWeights).reduce((a, b) => a + b, 0);

      let updatedResult = c.last_result;
      if (total === 100 && c.best_day?.weather_data && c.last_result?.currentWeather?.length) {
        const cfg = {} as WeightConfig;
        for (const k of paramKeys) cfg[k] = newWeights[k] / 100;
        const result = comparePatterns(c.best_day.weather_data, c.last_result.currentWeather, cfg);
        updatedResult = { ...c.last_result, overall: result.overall, byParameter: result.byParameter, byDay: result.byDay };
      }

      const supabase = createClient();
      supabase.from("auto_compares").update({ weights: newWeights }).eq("id", cmpId);

      return { ...c, weights: newWeights, last_result: updatedResult, last_score: updatedResult?.overall ?? c.last_score };
    }));
  };

  const openCmp = openId ? comparisons.find((c) => c.id === openId) : null;

  if (loading || appLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Мониторинг погоды</h1>
            <p className="text-sm text-muted-foreground">Система следит за погодой и оповещает, когда условия совпадают с вашими лучшими грибными днями</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} disabled={bestDays.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Новое сравнение
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Мониторинг сравнивает текущую погоду с погодой ваших успешных грибных дней.
          Когда совпадение высокое — самое время идти в лес! Можно включить автоматическое сравнение каждый день.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground/80">
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">Одно сравнение — 3 токена</span>
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">Автосравнение — 3 токена/день</span>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 glass rounded-2xl p-5 border border-violet-500/20">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Новое сравнение</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Грибной день-эталон</label>
              <div className="relative">
                <Star className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                <select value={newBdId} onChange={(e) => setNewBdId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-primary">
                  <option value="" disabled>Выберите грибной день</option>
                  {bestDays.map((bd) => <option key={bd.id} value={bd.id}>{bd.name} — {bd.location?.name}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Локация для мониторинга</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <select value={newLocId} onChange={(e) => { if (e.target.value === "__new__") { setShowNewLocation(true); return; } setNewLocId(e.target.value); }}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-primary">
                  <option value="" disabled>Выберите локацию</option>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  <option value="__new__">+ Создать новую</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {newAuto ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm">Ежедневное автосравнение</span>
            </div>
            <div className="flex items-center gap-3">
              {newAuto && <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-lg border border-border bg-white px-2 py-1 text-xs text-gray-900 outline-none" />}
              <button type="button" onClick={() => setNewAuto(!newAuto)} className={`relative h-6 w-11 rounded-full transition-colors ${newAuto ? "bg-primary" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${newAuto ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>
          <button type="button" onClick={handleCreate} disabled={creating || !newBdId || !newLocId}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 text-sm font-medium text-white disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Создать
          </button>
        </div>
      )}

      <NewLocationModal open={showNewLocation} onClose={() => setShowNewLocation(false)} onCreated={(loc) => { addLocation(loc); setNewLocId(loc.id); }} />

      {/* Empty state */}
      {comparisons.length === 0 && !showCreate && (
        <div className="mt-12 text-center">
          <GitCompareArrows className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Нет сравнений</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Создайте первое сравнение: выберите эталонный день и локацию</p>
          {bestDays.length === 0 && <Link href="/dashboard/best-day/new" className="mt-3 inline-block text-sm text-primary hover:underline">Сначала запишите грибной день</Link>}
        </div>
      )}

      {/* Comparison cards grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {comparisons.map((cmp) => {
          const bd = cmp.best_day;
          const loc = cmp.location;
          return (
            <button
              key={cmp.id}
              type="button"
              onClick={() => openComparison(cmp.id)}
              className="glass group rounded-2xl p-4 text-left transition-all hover:bg-glass-hover hover:shadow-md hover:shadow-black/10"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white font-bold ${
                  cmp.last_score != null ? `bg-gradient-to-br ${getMatchBgGradient(cmp.last_score)}` : "bg-white/10 text-muted-foreground"
                }`}>
                  {cmp.last_score != null ? `${Math.round(cmp.last_score)}%` : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{cmp.name || `${bd?.name} → ${loc?.name}`}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    {bd && <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 text-amber-400" />{bd.name}</span>}
                    {loc && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5 text-emerald-400" />{loc.name}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {cmp.enabled ? (
                      <span className="flex items-center gap-0.5 text-primary"><Bell className="h-2.5 w-2.5" />авто</span>
                    ) : (
                      <span className="flex items-center gap-0.5"><BellOff className="h-2.5 w-2.5" />ручное</span>
                    )}
                    {cmp.last_run_at && (
                      <span>{new Date(cmp.last_run_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== MODAL ===== */}
      {openCmp && (() => {
        const cmp = openCmp;
        const bd = cmp.best_day;
        const loc = cmp.location;
        const result = cmp.last_result;
        const isRunning = runningId === cmp.id;
        const totalW = Object.values(cmp.weights).reduce((a, b) => a + b, 0);
        const weightsValid = totalW === 100;

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-12 pb-12">
            <div className="fixed inset-0 bg-black/70" onClick={() => setOpenId(null)} />
            <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-[var(--color-glass-bg,#1a1a2e)] shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white font-bold ${
                  cmp.last_score != null ? `bg-gradient-to-br ${getMatchBgGradient(cmp.last_score)}` : "bg-white/10 text-muted-foreground"
                }`}>
                  {cmp.last_score != null ? `${Math.round(cmp.last_score)}%` : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{cmp.name || `${bd?.name} → ${loc?.name}`}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {bd && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{bd.name}</span>}
                    {loc && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-400" />{loc.name}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setOpenId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-6 py-5 space-y-5">
                {/* Actions bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => requestCompare(cmp)} disabled={isRunning || !bd?.weather_data}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Сравнить сейчас · {TOKEN_COSTS.compare} ток.
                  </button>

                  <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <button type="button" onClick={() => requestToggleAuto(cmp)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${cmp.enabled ? "bg-primary" : "bg-white/15"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${cmp.enabled ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                    <span className="text-xs">{cmp.enabled ? "Авто вкл." : "Авто выкл."}</span>
                    {cmp.enabled && (
                      <div className="flex items-center gap-1 ml-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <input type="time" value={cmp.run_time?.slice(0, 5) || "08:00"} onChange={(e) => handleTimeChange(cmp, e.target.value)}
                          className="rounded border border-border bg-white px-1.5 py-0.5 text-xs text-gray-900 outline-none focus:border-primary" />
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => { handleDelete(cmp.id); }}
                    className="ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> Удалить
                  </button>
                </div>

                {/* Weights */}
                <div>
                  <button type="button" onClick={() => setShowWeights(!showWeights)}
                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-3.5 w-3.5" /> Веса параметров
                    {!weightsValid && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">{totalW}%</span>}
                    {showWeights ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showWeights && (
                    <div className="mt-3 space-y-3">
                      {paramKeys.map((key) => (
                        <div key={key}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px]">{WEIGHT_LABELS[key]}</span>
                            <div className="flex items-center gap-1">
                              <input type="number" min={0} max={100} value={cmp.weights[key]}
                                onChange={(e) => handleWeightChange(cmp.id, key, parseInt(e.target.value) || 0)}
                                className="w-12 rounded border border-border bg-white px-1.5 py-0.5 text-right text-[11px] font-semibold text-gray-900 outline-none focus:border-primary" />
                              <span className="text-[11px] text-muted-foreground">%</span>
                            </div>
                          </div>
                          <input type="range" min={0} max={100} step={1} value={cmp.weights[key]}
                            onChange={(e) => handleWeightChange(cmp.id, key, parseInt(e.target.value))} className="w-full accent-primary" />
                        </div>
                      ))}
                      <div className={`flex items-center justify-between rounded-lg p-2 text-xs ${weightsValid ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        <span>Сумма:</span><span className="font-bold">{totalW}%{weightsValid && " ✓"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Result */}
                {result ? (
                  <>
                    <div className={`rounded-2xl bg-gradient-to-br ${getMatchBgGradient(result.overall)} p-6 text-center text-white`}>
                      <p className="text-5xl font-bold">{Math.round(result.overall)}%</p>
                      <p className="mt-1 text-sm font-medium opacity-90">{getMatchLabel(result.overall)}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">По параметрам</h4>
                      {paramKeys.map((key) => {
                        const score = result.byParameter[key] ?? 0;
                        return (
                          <div key={key}>
                            <div className="mb-0.5 flex items-center justify-between">
                              <span className="text-xs">{WEIGHT_LABELS[key]}</span>
                              <span className={`text-xs font-bold ${getMatchColor(score)}`}>{Math.round(score)}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                              <div className={`h-full rounded-full bg-gradient-to-r ${getMatchBgGradient(score)} transition-all duration-500`} style={{ width: `${Math.min(100, score)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bd?.weather_data && result.currentWeather?.length > 0 && (
                      <CompareChart reference={bd.weather_data} current={result.currentWeather} dayScores={result.byDay} />
                    )}

                    {bd?.weather_data && result.currentWeather?.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-white/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/3 text-left">
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">День</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">Совп.</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium"><Thermometer className="mr-0.5 inline h-3 w-3" /> t° эталон</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">t° текущ.</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium"><Droplets className="mr-0.5 inline h-3 w-3" /> Дождь эт.</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">Дождь тек.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.byDay.map((dayScore, i) => {
                                const ref = bd.weather_data![i];
                                const cur = result.currentWeather[i];
                                if (!ref || !cur) return null;
                                return (
                                  <tr key={i} className="border-b border-white/10">
                                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                    <td className="px-3 py-2"><span className={`font-bold ${getMatchColor(dayScore)}`}>{Math.round(dayScore)}%</span></td>
                                    <td className="px-3 py-2">{ref.temperature_mean !== null ? `${ref.temperature_mean.toFixed(1)}°` : "—"}</td>
                                    <td className="px-3 py-2">{cur.temperature_mean !== null ? `${cur.temperature_mean.toFixed(1)}°` : "—"}</td>
                                    <td className="px-3 py-2">{ref.rain_sum.toFixed(1)} мм</td>
                                    <td className="px-3 py-2">{cur.rain_sum.toFixed(1)} мм</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl bg-white/5 p-8 text-center">
                    <GitCompareArrows className="mx-auto mb-2 h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Нажмите «Сравнить сейчас» для получения результата</p>
                  </div>
                )}

                {/* History */}
                <div className="border-t border-white/5 pt-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    История сравнений
                  </h4>
                  {!historyLoaded ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Загрузка...</div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">Пока нет записей</p>
                  ) : (
                    <div className="space-y-1">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={`text-sm font-bold ${getMatchColor(h.overall_score)}`}>
                            {Math.round(h.overall_score)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <TokenConfirmModal
        open={!!confirmCompare}
        title="Сравнить погоду"
        description="Система загрузит текущую погоду и сравнит её с эталонным грибным днём."
        cost={TOKEN_COSTS.compare}
        balance={balance}
        loading={runningId !== null}
        onConfirm={() => confirmCompare && handleRunCompare(confirmCompare)}
        onCancel={() => setConfirmCompare(null)}
      />

      {confirmAutoToggle && (
        <TokenConfirmModal
          open
          title="Включить автосравнение"
          description={`Система будет каждый день автоматически сравнивать погоду и тратить ${TOKEN_COSTS.compare} токена за запуск. При текущих настройках это ~${TOKEN_COSTS.compare * 30} токенов в месяц. Убедитесь, что у вас достаточно токенов.`}
          cost={TOKEN_COSTS.compare}
          balance={balance}
          onConfirm={() => doToggleAuto(confirmAutoToggle)}
          onCancel={() => setConfirmAutoToggle(null)}
        />
      )}
    </div>
  );
}
