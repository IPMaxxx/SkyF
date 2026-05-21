"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { CompareChart } from "@/components/app/CompareChart";
import { NewLocationModal } from "@/components/app/NewLocationModal";
import type { BestDay, Location, WeatherDay } from "@/lib/supabase/types";
import { useTokens } from "@/lib/TokenContext";
import { useAppData } from "@/lib/AppDataContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import { toast } from "sonner";
import { addCalendarDaysYmd, minskTodayYmd } from "@/lib/minsk-date";
import {
  comparePatterns,
  getMatchBgGradient,
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
  CalendarDays,
} from "lucide-react";

const FORECAST_FORWARD_DAYS = 5;
const FORECAST_ANCHORS = FORECAST_FORWARD_DAYS + 1;
const FORECAST_RANGE_BACK = 13;
const FORECAST_RANGE_FORWARD = 5;

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

/** One forecast anchor: full comparePatterns result + 14-day window */
type ForecastAnchorData = {
  offset: number;
  anchorDate: string;
  label: string;
  overall: number;
  byParameter: Record<keyof WeightConfig, number>;
  byDay: number[];
  currentWeather: WeatherDay[];
};

type ForecastScoresPersistedV2 = {
  version: 2;
  weights: Record<keyof WeightConfig, number>;
  anchors: ForecastAnchorData[];
};

const FORECAST_RETENTION_DAYS = 5;

const DEFAULT_WEIGHTS: Record<keyof WeightConfig, number> = {
  rain_sum: 30,
  temperature_mean: 25,
  temperature_min: 10,
  temperature_max: 10,
  wind_speed_max: 10,
  relative_humidity_mean: 15,
};

const paramKeys = Object.keys(DEFAULT_WEIGHTS) as (keyof WeightConfig)[];

function normalizeForecastWeights(w: Record<string, number> | undefined | null): Record<keyof WeightConfig, number> {
  const out = { ...DEFAULT_WEIGHTS };
  if (!w) return out;
  for (const k of paramKeys) {
    if (typeof w[k] === "number" && !Number.isNaN(w[k])) out[k] = Math.max(0, Math.min(100, Math.round(w[k])));
  }
  return out;
}

function parseSavedForecastScores(raw: unknown): {
  anchors: ForecastAnchorData[];
  weights: Record<keyof WeightConfig, number>;
  hasFullDetail: boolean;
} | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && (raw as ForecastScoresPersistedV2).version === 2) {
    const o = raw as ForecastScoresPersistedV2;
    if (!Array.isArray(o.anchors) || o.anchors.length !== FORECAST_ANCHORS) return null;
    const hasFullDetail = o.anchors.every(
      (a) => Array.isArray(a.currentWeather) && a.currentWeather.length >= 14
    );
    return {
      anchors: o.anchors,
      weights: normalizeForecastWeights(o.weights as Record<string, number>),
      hasFullDetail,
    };
  }
  if (Array.isArray(raw) && raw.length === FORECAST_ANCHORS) {
    const first = raw[0] as ForecastAnchorData | undefined;
    if ((first?.currentWeather?.length ?? 0) >= 14) {
      return {
        anchors: raw as ForecastAnchorData[],
        weights: { ...DEFAULT_WEIGHTS },
        hasFullDetail: true,
      };
    }
    const legacy = raw as { offset: number; anchorDate: string; label: string; overall: number }[];
    return {
      anchors: legacy.map((r) => ({
        offset: r.offset,
        anchorDate: r.anchorDate,
        label: r.label,
        overall: r.overall,
        byParameter: {} as Record<keyof WeightConfig, number>,
        byDay: [],
        currentWeather: [],
      })),
      weights: { ...DEFAULT_WEIGHTS },
      hasFullDetail: false,
    };
  }
  return null;
}

export default function ComparePage() {
  const t = useTranslations("compare");
  const locale = useLocale();

  const anchorLabel = (offset: number) => {
    if (offset === 0) return t("anchorToday");
    if (offset === 1) return t("anchorTomorrow");
    if (offset === 2) return t("anchorDayAfter");
    return t("anchorPlusDays", { offset });
  };

  const matchLabel = (percent: number) => {
    if (percent >= 85) return t("matchExcellent");
    if (percent >= 70) return t("matchGood");
    if (percent >= 55) return t("matchModerate");
    if (percent >= 40) return t("matchWeak");
    return t("matchLow");
  };

  const wLab = (key: keyof WeightConfig) =>
    ({
      rain_sum: t("weightRainSum"),
      temperature_mean: t("weightTempMean"),
      temperature_min: t("weightTempMin"),
      temperature_max: t("weightTempMax"),
      wind_speed_max: t("weightWindMax"),
      relative_humidity_mean: t("weightHumidity"),
    })[key];

  const { locations, bestDays, loading: appLoading, addLocation } = useAppData();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { balance, spend } = useTokens();

  const [showCreate, setShowCreate] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [newBdId, setNewBdId] = useState("");
  const [newLocId, setNewLocId] = useState("");
  const [forecastBdId, setForecastBdId] = useState("");
  const [forecastLocId, setForecastLocId] = useState("");
  const [forecastRunning, setForecastRunning] = useState(false);
  const [confirmForecast, setConfirmForecast] = useState(false);
  const [forecastAnchors, setForecastAnchors] = useState<ForecastAnchorData[] | null>(null);
  const [forecastReference, setForecastReference] = useState<WeatherDay[] | null>(null);
  const [forecastWeights, setForecastWeights] = useState<Record<keyof WeightConfig, number>>(() => ({
    ...DEFAULT_WEIGHTS,
  }));
  const [forecastHasFullDetail, setForecastHasFullDetail] = useState(false);
  const [showForecastWeights, setShowForecastWeights] = useState(false);
  const [openForecastDetail, setOpenForecastDetail] = useState<number | null>(null);
  const [newAuto, setNewAuto] = useState(false);
  const [newTime, setNewTime] = useState("08:00");
  const [creating, setCreating] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showWeights, setShowWeights] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [confirmCompare, setConfirmCompare] = useState<Comparison | null>(null);
  const [confirmAutoToggle, setConfirmAutoToggle] = useState<Comparison | null>(null);

  useEffect(() => {
    if (bestDays.length > 0 && !newBdId) setNewBdId(bestDays[0].id);
    if (locations.length > 0 && !newLocId) setNewLocId(locations[0].id);
    if (bestDays.length > 0 && !forecastBdId) setForecastBdId(bestDays[0].id);
    if (locations.length > 0 && !forecastLocId) setForecastLocId(locations[0].id);
  }, [bestDays, locations, newBdId, newLocId, forecastBdId, forecastLocId]);

  useEffect(() => { loadComparisons(); }, []);

  const loadSavedForecast = async (bdId: string, locId: string) => {
    if (!bdId || !locId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - FORECAST_RETENTION_DAYS);
    const { data } = await supabase
      .from("saved_forecast_compares")
      .select("scores, created_at")
      .eq("user_id", user.id)
      .eq("best_day_id", bdId)
      .eq("location_id", locId)
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const parsed = parseSavedForecastScores(data?.scores);
    if (parsed) {
      setForecastAnchors(parsed.anchors);
      setForecastWeights(parsed.weights);
      setForecastHasFullDetail(parsed.hasFullDetail);
      const { data: bdRef } = await supabase.from("best_days").select("weather_data").eq("id", bdId).maybeSingle();
      setForecastReference((bdRef?.weather_data as WeatherDay[] | null) ?? null);
    } else {
      setForecastAnchors(null);
      setForecastReference(null);
      setForecastWeights({ ...DEFAULT_WEIGHTS });
      setForecastHasFullDetail(false);
    }
  };

  useEffect(() => {
    if (!showForecast || !forecastBdId || !forecastLocId) return;
    void loadSavedForecast(forecastBdId, forecastLocId);
  }, [showForecast, forecastBdId, forecastLocId]);

  useEffect(() => {
    if (!loading && comparisons.length > 0) {
      const openParam = new URLSearchParams(window.location.search).get("open");
      if (openParam && comparisons.some((c) => c.id === openParam) && openId !== openParam) {
        openComparison(openParam);
      }
    }
  }, [loading, comparisons]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!newBdId || !newLocId) { setError(t("errSelectBdLoc")); return; }
    setCreating(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError(t("errAuth")); setCreating(false); return; }

    const bd = bestDays.find((b) => b.id === newBdId);
    const loc = locations.find((l) => l.id === newLocId);

    const { data, error: dbErr } = await supabase.from("auto_compares").insert({
      user_id: user.id,
      best_day_id: newBdId,
      location_id: newLocId,
      name: `${bd?.name || t("nameDefaultBd")} → ${loc?.name || t("nameDefaultLoc")}`,
      enabled: newAuto,
      run_time: newTime + ":00",
      weights: DEFAULT_WEIGHTS,
    }).select("id, user_id, best_day_id, location_id, name, enabled, run_time, weights, last_run_at, last_score, last_result, best_day:best_days(id, name, best_date, weather_data, location:locations(id, name, lat, lng), mushroom:mushroom_species(id, latin_name, common_name, image_url)), location:locations(id, name, lat, lng)").single();

    if (dbErr) { setError(dbErr.message); setCreating(false); return; }
    if (data) setComparisons((prev) => [{ ...data, weights: DEFAULT_WEIGHTS } as unknown as Comparison, ...prev]);
    setShowCreate(false);
    setCreating(false);
  };

  const requestForecastRun = () => {
    if (!forecastBdId || !forecastLocId) {
      setError(t("errSelectBdLoc"));
      return;
    }
    setError("");
    setConfirmForecast(true);
  };

  const handleForecastRun = async () => {
    setConfirmForecast(false);
    if (!forecastBdId || !forecastLocId) return;
    const loc = locations.find((l) => l.id === forecastLocId);
    if (!loc) {
      setError(t("errLocNotFound"));
      return;
    }

    const spendResult = await spend("compare_forecast", t("spendForecast"));
    if (!spendResult.success) {
      setError(spendResult.error || t("insufficientTokens"));
      return;
    }
    toast.success(t("toastForecastCharged", { amount: TOKEN_COSTS.compare_forecast }));

    setForecastRunning(true);
    setError("");
    setForecastAnchors(null);
    setForecastReference(null);

    try {
      const supabase = createClient();
      const { data: bdRow, error: bdErr } = await supabase
        .from("best_days")
        .select("weather_data")
        .eq("id", forecastBdId)
        .single();

      if (bdErr || !bdRow?.weather_data?.length) {
        setError(t("errNoWeatherBd"));
        setForecastRunning(false);
        return;
      }

      const reference = bdRow.weather_data as WeatherDay[];
      const todayMinsk = minskTodayYmd();
      const startDate = addCalendarDaysYmd(todayMinsk, -FORECAST_RANGE_BACK);
      const endDate = addCalendarDaysYmd(todayMinsk, FORECAST_RANGE_FORWARD);

      const qs = new URLSearchParams({
        lat: String(loc.lat),
        lng: String(loc.lng),
        start_date: startDate,
        end_date: endDate,
      });
      const res = await fetch(`/api/weather?${qs}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setForecastRunning(false);
        return;
      }

      const allDays: WeatherDay[] = data.days || [];
      const expectedLen = FORECAST_RANGE_BACK + FORECAST_RANGE_FORWARD + 1;
      if (allDays.length < expectedLen) {
        setError(t("errWeatherPartial", { got: allDays.length, expected: expectedLen }));
        setForecastRunning(false);
        return;
      }

      const weightsSnapshot = { ...DEFAULT_WEIGHTS };
      setForecastWeights(weightsSnapshot);
      const cfg = {} as WeightConfig;
      for (const k of paramKeys) cfg[k] = weightsSnapshot[k] / 100;

      const anchors: ForecastAnchorData[] = [];
      for (let offset = 0; offset < FORECAST_ANCHORS; offset++) {
        const windowDays = allDays.slice(offset, offset + 14);
        if (windowDays.length < 14) break;
        const cmpResult = comparePatterns(reference, windowDays, cfg);
        anchors.push({
          offset,
          anchorDate: addCalendarDaysYmd(todayMinsk, offset),
          label: anchorLabel(offset),
          overall: cmpResult.overall,
          byParameter: cmpResult.byParameter,
          byDay: cmpResult.byDay,
          currentWeather: windowDays,
        });
      }

      if (anchors.length !== FORECAST_ANCHORS) {
        setError(t("errAnchorsFailed"));
        setForecastRunning(false);
        return;
      }

      const persistPayload: ForecastScoresPersistedV2 = {
        version: 2,
        weights: weightsSnapshot,
        anchors,
      };

      const { data: { user: saveUser } } = await supabase.auth.getUser();
      if (saveUser) {
        const { error: saveErr } = await supabase.from("saved_forecast_compares").insert({
          user_id: saveUser.id,
          best_day_id: forecastBdId,
          location_id: forecastLocId,
          run_minsk_date: todayMinsk,
          weather_start: startDate,
          weather_end: endDate,
          scores: persistPayload,
        });
        if (!saveErr) {
          const purgeBefore = new Date();
          purgeBefore.setDate(purgeBefore.getDate() - FORECAST_RETENTION_DAYS);
          await supabase
            .from("saved_forecast_compares")
            .delete()
            .eq("user_id", saveUser.id)
            .lt("created_at", purgeBefore.toISOString());
        }
      }

      setForecastReference(reference);
      setForecastHasFullDetail(true);
      setForecastAnchors(anchors);
    } catch {
      setError(t("errLoadData"));
    } finally {
      setForecastRunning(false);
    }
  };

  const handleForecastWeightChange = (key: keyof WeightConfig, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setForecastWeights((prevW) => {
      const newWeights = { ...prevW, [key]: clamped };
      const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
      setForecastAnchors((prevA) => {
        if (
          total !== 100 ||
          !forecastReference?.length ||
          !prevA ||
          prevA.length !== FORECAST_ANCHORS ||
          !forecastHasFullDetail
        ) {
          return prevA;
        }
        const cfg = {} as WeightConfig;
        for (const k of paramKeys) cfg[k] = newWeights[k] / 100;
        return prevA.map((a) => {
          const r = comparePatterns(forecastReference, a.currentWeather, cfg);
          return { ...a, overall: r.overall, byParameter: r.byParameter, byDay: r.byDay };
        });
      });
      return newWeights;
    });
  };

  const requestCompare = (cmp: Comparison) => {
    const bd = cmp.best_day;
    const loc = cmp.location;
    if (!bd?.weather_data || !loc) { setError(t("errNoCompareData")); return; }
    setConfirmCompare(cmp);
  };

  const handleRunCompare = async (cmp: Comparison) => {
    setConfirmCompare(null);
    const bd = cmp.best_day;
    const loc = cmp.location;
    if (!bd?.weather_data || !loc) { setError(t("errNoCompareData")); return; }

    const spendResult = await spend("compare", t("spendCompare"));
    if (!spendResult.success) { setError(spendResult.error || t("insufficientTokens")); return; }
    toast.success(t("toastCompareCharged", { amount: TOKEN_COSTS.compare }));

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
    } catch { setError(t("errLoadData")); } finally { setRunningId(null); }
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
      toast.info(t("toastAutoOn", { tokens: TOKEN_COSTS.compare * 30 }));
    } else {
      toast.info(t("toastAutoOff"));
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link href="/dashboard" className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">{t("title")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => {
              setShowForecast(false);
              setShowCreate(true);
            }}
            disabled={bestDays.length === 0}
            className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t("newComparison")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setShowForecast(true);
            }}
            disabled={bestDays.length === 0}
            className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <CalendarDays className="h-4 w-4" /> {t("forecast")}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{t("howItWorksBold")}</strong> {t("howItWorks")}
        </p>
        {showInfo && (
          <div className="space-y-3 pt-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{t("forecastExplainBold")}</strong> {t("forecastExplain")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{t("saveForecastBold")}</strong>{" "}
              {t("saveForecast", { days: FORECAST_RETENTION_DAYS })}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{t("autoCompareBold")}</strong> {t("autoCompare")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground/70 italic">{t("exampleNote")}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground/80">
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">{t("priceCompare")}</span>
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                {t("priceForecast", { n: TOKEN_COSTS.compare_forecast })}
              </span>
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">{t("priceAutoDaily")}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
        >
          {showInfo ? t("infoShowLess") : t("infoShowMore")}
          {showInfo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>}

      {/* Create form */}
      {showForecast && (
        <div className="mb-6 glass rounded-2xl border border-orange-500/30 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("forecastBlockTitle")}</h3>
            <button
              type="button"
              onClick={() => setShowForecast(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            {t("forecastBlockHelp", { days: FORECAST_RETENTION_DAYS })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium">{t("labelBestDay")}</label>
              <div className="relative">
                <Star className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                <select
                  value={forecastBdId}
                  onChange={(e) => setForecastBdId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-primary"
                >
                  <option value="" disabled>
                    {t("selectBestDay")}
                  </option>
                  {bestDays.map((bd) => (
                    <option key={bd.id} value={bd.id}>
                      {bd.name} — {bd.location?.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">{t("labelLocation")}</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <select
                  value={forecastLocId}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewLocation(true);
                      return;
                    }
                    setForecastLocId(e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-primary"
                >
                  <option value="" disabled>
                    {t("selectLocation")}
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                  <option value="__new__">{t("createNew")}</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={requestForecastRun}
            disabled={forecastRunning || !forecastBdId || !forecastLocId}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {forecastRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            {t("runForecast", { n: TOKEN_COSTS.compare_forecast })}
          </button>

          {forecastAnchors && forecastAnchors.length > 0 && (
            <div className="mt-6 space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setShowForecastWeights(!showForecastWeights)}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Settings2 className="h-3.5 w-3.5" /> {t("weightParams")}
                  {(() => {
                    const tw = Object.values(forecastWeights).reduce((a, b) => a + b, 0);
                    return tw !== 100 ? (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">{tw}%</span>
                    ) : null;
                  })()}
                  {!forecastHasFullDetail && (
                    <span className="text-[10px] text-amber-400/90">{t("recalcAfterRun")}</span>
                  )}
                  {showForecastWeights ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showForecastWeights && (
                  <div className="mt-3 space-y-3">
                    {paramKeys.map((wkey) => (
                      <div key={wkey}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px]">{wLab(wkey)}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={forecastWeights[wkey]}
                              disabled={!forecastHasFullDetail}
                              onChange={(e) => handleForecastWeightChange(wkey, parseInt(e.target.value) || 0)}
                              className="w-12 rounded border border-border bg-white px-1.5 py-0.5 text-right text-[11px] font-semibold text-gray-900 outline-none focus:border-primary disabled:opacity-50"
                            />
                            <span className="text-[11px] text-muted-foreground">%</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={forecastWeights[wkey]}
                          disabled={!forecastHasFullDetail}
                          onChange={(e) => handleForecastWeightChange(wkey, parseInt(e.target.value))}
                          className="w-full accent-orange-500 disabled:opacity-50"
                        />
                      </div>
                    ))}
                    <div
                      className={`flex items-center justify-between rounded-lg p-2 text-xs ${
                        Object.values(forecastWeights).reduce((a, b) => a + b, 0) === 100
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      <span>{t("sum")}</span>
                      <span className="font-bold">
                        {Object.values(forecastWeights).reduce((a, b) => a + b, 0)}%
                        {Object.values(forecastWeights).reduce((a, b) => a + b, 0) === 100 && " ✓"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("anchorDaysTitle")}
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {forecastAnchors.map((row) => {
                    const hasDetail = row.currentWeather?.length >= 14;
                    return (
                      <button
                        key={row.offset}
                        type="button"
                        onClick={() => {
                          if (!hasDetail) {
                            toast.info(t("toastRerunForecast"));
                            return;
                          }
                          setOpenForecastDetail(row.offset);
                        }}
                        className={`rounded-xl border p-3 text-center transition-colors ${
                          hasDetail
                            ? "border-white/10 bg-white/5 hover:border-orange-400/40 hover:bg-orange-500/10"
                            : "border-white/5 bg-white/[0.03] opacity-80"
                        }`}
                      >
                        <p className="text-[11px] font-medium text-muted-foreground">{anchorLabel(row.offset)}</p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {(() => {
                            const [yy, mo, da] = row.anchorDate.split("-").map(Number);
                            return new Date(yy, mo - 1, da).toLocaleDateString(locale, {
                              day: "numeric",
                              month: "short",
                            });
                          })()}
                        </p>
                        <p className={`mt-2 text-2xl font-bold ${getMatchColor(row.overall)}`}>
                          {Math.round(row.overall)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground/80">{matchLabel(row.overall)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 glass rounded-2xl p-5 border border-violet-500/20">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("newComparisonTitle")}</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium">{t("labelBestDay")}</label>
              <div className="relative">
                <Star className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                <select value={newBdId} onChange={(e) => setNewBdId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-primary">
                  <option value="" disabled>{t("selectBestDay")}</option>
                  {bestDays.map((bd) => <option key={bd.id} value={bd.id}>{bd.name} — {bd.location?.name}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">{t("labelMonitoringLocation")}</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <select value={newLocId} onChange={(e) => { if (e.target.value === "__new__") { setShowNewLocation(true); return; } setNewLocId(e.target.value); }}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none focus:border-primary">
                  <option value="" disabled>{t("selectLocation")}</option>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  <option value="__new__">{t("createNew")}</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {newAuto ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm">{t("dailyAuto")}</span>
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
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("create")}
          </button>
        </div>
      )}

      <NewLocationModal
        open={showNewLocation}
        onClose={() => setShowNewLocation(false)}
        onCreated={(loc) => {
          addLocation(loc);
          setNewLocId(loc.id);
          setForecastLocId(loc.id);
        }}
      />

      {/* Empty state */}
      {comparisons.length === 0 && !showCreate && !showForecast && (
        <div className="mt-12 text-center">
          <GitCompareArrows className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground/70">{t("emptyHint")}</p>
          {bestDays.length === 0 && (
            <Link href="/dashboard/best-day/new" className="mt-3 inline-block text-sm text-primary hover:underline">
              {t("emptyLinkBestDay")}
            </Link>
          )}
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
                      <span className="flex items-center gap-0.5 text-primary">
                        <Bell className="h-2.5 w-2.5" />
                        {t("modeAuto")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <BellOff className="h-2.5 w-2.5" />
                        {t("modeManual")}
                      </span>
                    )}
                    {cmp.last_run_at && (
                      <span>
                        {new Date(cmp.last_run_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                      </span>
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
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-4 pt-4 sm:pt-12 pb-4 sm:pb-12">
            <div className="fixed inset-0 bg-black/70" onClick={() => setOpenId(null)} />
            <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#1a2a1f]/95 backdrop-blur-xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/5 px-4 sm:px-6 py-4">
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
              <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                {/* Actions bar */}
                <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <button type="button" onClick={() => requestCompare(cmp)} disabled={isRunning || !bd?.weather_data}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {t("compareNow", { n: TOKEN_COSTS.compare })}
                  </button>

                  <div className="flex items-center justify-between sm:justify-start gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => requestToggleAuto(cmp)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${cmp.enabled ? "bg-primary" : "bg-white/15"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${cmp.enabled ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                      <span className="text-xs">{cmp.enabled ? t("autoOnShort") : t("autoOffShort")}</span>
                      {cmp.enabled && (
                        <div className="flex items-center gap-1 ml-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <input type="time" value={cmp.run_time?.slice(0, 5) || "08:00"} onChange={(e) => handleTimeChange(cmp, e.target.value)}
                            className="rounded border border-border bg-white px-1.5 py-0.5 text-xs text-gray-900 outline-none focus:border-primary" />
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => { handleDelete(cmp.id); }}
                      className="sm:hidden flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button type="button" onClick={() => { handleDelete(cmp.id); }}
                    className="hidden sm:flex ml-auto items-center gap-1 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
                  </button>
                </div>

                {/* Weights */}
                <div>
                  <button type="button" onClick={() => setShowWeights(!showWeights)}
                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-3.5 w-3.5" /> {t("weightParams")}
                    {!weightsValid && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">{totalW}%</span>}
                    {showWeights ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showWeights && (
                    <div className="mt-3 space-y-3">
                      {paramKeys.map((key) => (
                        <div key={key}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px]">{wLab(key)}</span>
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
                        <span>{t("sum")}</span><span className="font-bold">{totalW}%{weightsValid && " ✓"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Result */}
                {result ? (
                  <>
                    <div className={`rounded-2xl bg-gradient-to-br ${getMatchBgGradient(result.overall)} p-4 sm:p-6 text-center text-white`}>
                      <p className="text-4xl sm:text-5xl font-bold">{Math.round(result.overall)}%</p>
                      <p className="mt-1 text-sm font-medium opacity-90">{matchLabel(result.overall)}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("byParameters")}
                      </h4>
                      {paramKeys.map((key) => {
                        const score = result.byParameter[key] ?? 0;
                        return (
                          <div key={key}>
                            <div className="mb-0.5 flex items-center justify-between">
                              <span className="text-xs">{wLab(key)}</span>
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
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableDay")}</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableMatch")}</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                                  <Thermometer className="mr-0.5 inline h-3 w-3" /> {t("tableTRef")}
                                </th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableTCur")}</th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                                  <Droplets className="mr-0.5 inline h-3 w-3" /> {t("tableRainRef")}
                                </th>
                                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableRainCur")}</th>
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
                                    <td className="px-3 py-2">
                                      {ref.rain_sum.toFixed(1)} {t("unitMm")}
                                    </td>
                                    <td className="px-3 py-2">
                                      {cur.rain_sum.toFixed(1)} {t("unitMm")}
                                    </td>
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
                    <p className="text-sm text-muted-foreground">{t("promptCompare")}</p>
                  </div>
                )}

                {/* History */}
                <div className="border-t border-white/5 pt-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("historyTitle")}
                  </h4>
                  {!historyLoaded ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t("loading")}
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">{t("historyEmpty")}</p>
                  ) : (
                    <div className="space-y-1">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleDateString(locale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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

      {openForecastDetail !== null &&
        forecastAnchors &&
        forecastReference &&
        (() => {
          const detail = forecastAnchors.find((a) => a.offset === openForecastDetail);
          if (!detail?.currentWeather?.length) return null;
          const bdName = bestDays.find((b) => b.id === forecastBdId)?.name ?? t("nameFallbackRef");
          const locName = locations.find((l) => l.id === forecastLocId)?.name ?? t("nameDefaultLoc");

          return (
            <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-2 sm:p-4 pt-4 sm:pt-12 pb-4 sm:pb-12">
              <div className="fixed inset-0 bg-black/70" onClick={() => setOpenForecastDetail(null)} />
              <div className="relative z-[61] w-full max-w-3xl rounded-2xl border border-orange-500/20 bg-[#1a2a1f]/95 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 border-b border-white/5 px-4 sm:px-6 py-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white font-bold bg-gradient-to-br ${getMatchBgGradient(detail.overall)}`}
                  >
                    {Math.round(detail.overall)}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {t("forecastDetailPrefix")} {anchorLabel(detail.offset)}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400" />
                        {bdName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        {locName}
                      </span>
                      <span>
                        {(() => {
                          const [yy, mo, da] = detail.anchorDate.split("-").map(Number);
                          return new Date(yy, mo - 1, da).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                        })()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenForecastDetail(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                  <div
                    className={`rounded-2xl bg-gradient-to-br ${getMatchBgGradient(detail.overall)} p-4 sm:p-6 text-center text-white`}
                  >
                    <p className="text-4xl sm:text-5xl font-bold">{Math.round(detail.overall)}%</p>
                    <p className="mt-1 text-sm font-medium opacity-90">{matchLabel(detail.overall)}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("byParameters")}
                    </h4>
                    {paramKeys.map((key) => {
                      const score = detail.byParameter[key] ?? 0;
                      return (
                        <div key={key}>
                          <div className="mb-0.5 flex items-center justify-between">
                            <span className="text-xs">{wLab(key)}</span>
                            <span className={`text-xs font-bold ${getMatchColor(score)}`}>{Math.round(score)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getMatchBgGradient(score)} transition-all duration-500`}
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {forecastReference.length > 0 && detail.currentWeather.length > 0 && (
                    <CompareChart
                      reference={forecastReference}
                      current={detail.currentWeather}
                      dayScores={detail.byDay}
                    />
                  )}

                  {forecastReference.length > 0 && detail.currentWeather.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-white/5">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/3 text-left">
                              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableDay")}</th>
                              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableMatch")}</th>
                              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                                <Thermometer className="mr-0.5 inline h-3 w-3" /> {t("tableTRef")}
                              </th>
                              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableTWindow")}</th>
                              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                                <Droplets className="mr-0.5 inline h-3 w-3" /> {t("tableRainRef")}
                              </th>
                              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableRainWindow")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.byDay.map((dayScore, i) => {
                              const ref = forecastReference[i];
                              const cur = detail.currentWeather[i];
                              if (!ref || !cur) return null;
                              return (
                                <tr key={i} className="border-b border-white/10">
                                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-2">
                                    <span className={`font-bold ${getMatchColor(dayScore)}`}>{Math.round(dayScore)}%</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {ref.temperature_mean !== null ? `${ref.temperature_mean.toFixed(1)}°` : "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {cur.temperature_mean !== null ? `${cur.temperature_mean.toFixed(1)}°` : "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {ref.rain_sum.toFixed(1)} {t("unitMm")}
                                  </td>
                                  <td className="px-3 py-2">
                                    {cur.rain_sum.toFixed(1)} {t("unitMm")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      <TokenConfirmModal
        open={!!confirmCompare}
        title={t("modalCompareTitle")}
        description={t("modalCompareDesc")}
        cost={TOKEN_COSTS.compare}
        balance={balance}
        loading={runningId !== null}
        onConfirm={() => confirmCompare && handleRunCompare(confirmCompare)}
        onCancel={() => setConfirmCompare(null)}
      />

      <TokenConfirmModal
        open={confirmForecast}
        title={t("modalForecastTitle")}
        description={t("modalForecastDesc")}
        cost={TOKEN_COSTS.compare_forecast}
        balance={balance}
        loading={forecastRunning}
        onConfirm={handleForecastRun}
        onCancel={() => setConfirmForecast(false)}
      />

      {confirmAutoToggle && (
        <TokenConfirmModal
          open
          title={t("modalAutoTitle")}
          description={t("modalAutoDesc", {
            perRun: TOKEN_COSTS.compare,
            perMonth: TOKEN_COSTS.compare * 30,
          })}
          cost={TOKEN_COSTS.compare}
          balance={balance}
          onConfirm={() => doToggleAuto(confirmAutoToggle)}
          onCancel={() => setConfirmAutoToggle(null)}
        />
      )}
    </div>
  );
}
