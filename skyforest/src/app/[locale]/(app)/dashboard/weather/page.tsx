"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { WeatherChart } from "@/components/app/WeatherChart";
import { useTokens } from "@/lib/TokenContext";
import { useAppData } from "@/lib/AppDataContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import { toast } from "sonner";
import type { Location, WeatherDay } from "@/lib/supabase/types";
import {
  CloudSun,
  CloudRain,
  ArrowLeft,
  Loader2,
  Droplets,
  Thermometer,
  Wind,
  MapPin,
  Info,
  Coins,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

function WeatherMapLoading() {
  const t = useTranslations("weather");
  return (
    <div className="flex h-[500px] items-center justify-center rounded-xl bg-white/5">
      <p className="text-sm text-muted-foreground">{t("mapLoading")}</p>
    </div>
  );
}

const RainMapView = dynamic(
  () => import("@/components/app/RainMapView").then((m) => m.RainMapView),
  {
    ssr: false,
    loading: WeatherMapLoading,
  }
);

type Tab = "weather" | "rain-map";

interface GridPoint {
  lat: number;
  lng: number;
  rain_total: number;
  rain_daily: number[];
  temp_mean: number;
  temp_daily_max?: number[];
  temp_daily_min?: number[];
  dates?: string[];
}

function generateGridPoints(
  lat: number,
  lng: number,
  radiusKm: number,
  stepKm: number
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  const latDeg = stepKm / 111.32;
  const lngDeg = stepKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const stepsCount = Math.ceil(radiusKm / stepKm);

  for (let i = -stepsCount; i <= stepsCount; i++) {
    for (let j = -stepsCount; j <= stepsCount; j++) {
      const pLat = lat + i * latDeg;
      const pLng = lng + j * lngDeg;
      const distKm = Math.sqrt(
        Math.pow(i * stepKm, 2) + Math.pow(j * stepKm, 2)
      );
      if (distKm <= radiusKm) {
        points.push({ lat: pLat, lng: pLng });
      }
    }
  }
  return points;
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipW = 280;
    let left = rect.left;
    if (left + tooltipW > window.innerWidth - 12) {
      left = window.innerWidth - tooltipW - 12;
    }
    if (left < 12) left = 12;
    setPos({ top: rect.bottom + 8, left });
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      <Info className="h-3 w-3 text-muted-foreground/60" />
      {pos && (
        <div
          className="fixed z-[9999] rounded-xl bg-gray-900 shadow-2xl ring-1 ring-white/10"
          style={{ top: pos.top, left: pos.left, width: 300, maxWidth: "calc(100vw - 24px)" }}
        >
          <div className="whitespace-normal break-words px-4 py-3 text-xs font-normal leading-relaxed text-gray-100">
            {text}
          </div>
        </div>
      )}
    </span>
  );
}

export default function WeatherPage() {
  const t = useTranslations("weather");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("weather");
  const { locations, loading: appLoading } = useAppData();

  // --- Weather state ---
  const [selectedId, setSelectedId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageDataLoaded, setPageDataLoaded] = useState(false);
  const [error, setError] = useState("");
  const { balance, spend } = useTokens();
  const [savedList, setSavedList] = useState<{ id: string; check_date: string; location: unknown; created_at: string }[]>([]);

  // --- Rain map state ---
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(30);
  const [step, setStep] = useState(5);
  const [days, setDays] = useState(14);
  const [rainLoading, setRainLoading] = useState(false);
  const [gridData, setGridData] = useState<GridPoint[]>([]);
  const [rainError, setRainError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWeatherConfirm, setShowWeatherConfirm] = useState(false);
  const [savedRainList, setSavedRainList] = useState<{ id: string; center_lat: number; center_lng: number; radius_km: number; step_km: number; days: number; created_at: string }[]>([]);

  useEffect(() => {
    if (!appLoading && locations.length > 0 && !selectedId) {
      setSelectedId(locations[0].id);
    }
  }, [appLoading, locations, selectedId]);

  useEffect(() => {
    if (pageDataLoaded) return;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPageDataLoaded(true); return; }

      const [savedRes, lastRes, rainRes] = await Promise.all([
        supabase.from("saved_weather").select("id, check_date, created_at, location:locations(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("saved_weather").select("location_id, check_date, weather_data").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("saved_rain_maps").select("id, center_lat, center_lng, radius_km, step_km, days, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (savedRes.data) setSavedList(savedRes.data as never[]);

      if (lastRes.data) {
        setSelectedId(lastRes.data.location_id);
        setDate(lastRes.data.check_date);
        setWeatherDays(lastRes.data.weather_data);
      }

      if (rainRes.data && rainRes.data.length > 0) {
        setSavedRainList(rainRes.data);
        const last = rainRes.data[0];
        setCenterLat(last.center_lat);
        setCenterLng(last.center_lng);
        setRadius(last.radius_km);
        setStep(last.step_km);
        setDays(last.days);
        const { data: fullLast } = await supabase.from("saved_rain_maps").select("grid_data").eq("id", last.id).single();
        if (fullLast) setGridData(fullLast.grid_data);
      }

      setPageDataLoaded(true);
    };
    load();
  }, [pageDataLoaded]);

  const loadingLocs = appLoading || !pageDataLoaded;
  const selectedLocation = locations.find((l) => l.id === selectedId);

  // --- Weather handlers ---
  const requestGetData = () => {
    if (!selectedLocation) return;
    setShowWeatherConfirm(true);
  };

  const handleGetData = async () => {
    setShowWeatherConfirm(false);
    if (!selectedLocation) return;

    const spendResult = await spend("weather_check", t("spendReasonWeather"));
    if (!spendResult.success) {
      setError(spendResult.error || t("insufficientTokens"));
      return;
    }
    toast.success(t("toastWeatherCharged", { amount: TOKEN_COSTS.weather_check }));

    setLoading(true);
    setError("");
    setWeatherDays([]);

    try {
      const res = await fetch(
        `/api/weather?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&date=${date}&days=14`
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.days) {
        setWeatherDays(data.days);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: saved } = await supabase.from("saved_weather").insert({
            user_id: user.id,
            location_id: selectedId,
            check_date: date,
            weather_data: data.days,
          }).select("id, check_date, created_at").single();
          if (saved) {
            setSavedList((prev) => [{ ...saved, location: { name: selectedLocation!.name } }, ...prev].slice(0, 10));
          }
        }
      }
    } catch {
      setError(t("errorWeatherLoad"));
    } finally {
      setLoading(false);
    }
  };

  const loadSaved = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("saved_weather").select("*, location:locations(*)").eq("id", id).single();
    if (data) {
      setWeatherDays(data.weather_data);
      setDate(data.check_date);
      setSelectedId(data.location_id);
    }
  };

  const deleteSaved = async (id: string) => {
    const supabase = createClient();
    await supabase.from("saved_weather").delete().eq("id", id);
    setSavedList((prev) => prev.filter((s) => s.id !== id));
  };

  // --- Rain map handlers ---
  const pointCount = useMemo(() => {
    if (centerLat === null || centerLng === null) return 0;
    return generateGridPoints(centerLat, centerLng, radius, step).length;
  }, [centerLat, centerLng, radius, step]);

  const batchCount = Math.ceil(pointCount / 50);
  const tokenCost = Math.max(batchCount, pointCount > 0 ? 1 : 0) * TOKEN_COSTS.rain_map_per_batch;
  const tooManyPoints = pointCount > 200;
  const notEnoughTokens = balance !== null && tokenCost > balance;

  const handleRequestGenerate = () => {
    if (centerLat === null || centerLng === null) {
      setRainError(t("rainClickCenterSet"));
      return;
    }
    if (tooManyPoints) {
      setRainError(t("rainTooManyPoints", { count: pointCount }));
      return;
    }
    if (pointCount === 0) {
      setRainError(t("rainNoPoints"));
      return;
    }
    setRainError("");
    setShowConfirm(true);
  };

  const handleConfirmGenerate = async () => {
    setShowConfirm(false);
    if (centerLat === null || centerLng === null) return;
    const points = generateGridPoints(centerLat, centerLng, radius, step);

    const spendResult = await spend(
      "rain_map_per_batch",
      t("spendReasonRainMap", { count: points.length }),
      batchCount
    );
    if (!spendResult.success) {
      setRainError(spendResult.error || t("insufficientTokens"));
      return;
    }
    toast.success(t("toastRainCharged", { amount: tokenCost }));

    setRainLoading(true);
    setRainError("");
    setGridData([]);

    try {
      const res = await fetch("/api/weather/grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, days }),
      });
      const data = await res.json();
      if (data.error) {
        setRainError(data.error);
      } else {
        const results = data.results || [];
        setGridData(results);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && results.length > 0) {
          const { data: saved } = await supabase.from("saved_rain_maps").insert({
            user_id: user.id,
            center_lat: centerLat,
            center_lng: centerLng,
            radius_km: radius,
            step_km: step,
            days,
            grid_data: results,
          }).select("id, center_lat, center_lng, radius_km, step_km, days, created_at").single();
          if (saved) {
            setSavedRainList((prev) => [saved, ...prev].slice(0, 10));
          }
        }
      }
    } catch {
      setRainError(t("rainLoadError"));
    } finally {
      setRainLoading(false);
    }
  };

  const loadSavedMap = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("saved_rain_maps").select("center_lat, center_lng, radius_km, step_km, days, grid_data").eq("id", id).single();
    if (data) {
      setCenterLat(data.center_lat);
      setCenterLng(data.center_lng);
      setRadius(data.radius_km);
      setStep(data.step_km);
      setDays(data.days);
      setGridData(data.grid_data);
    }
  };

  const deleteSavedMap = async (id: string) => {
    const supabase = createClient();
    await supabase.from("saved_rain_maps").delete().eq("id", id);
    setSavedRainList((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex-shrink-0">
          <CloudSun className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground/80">
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">{t("priceWeather")}</span>
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">{t("priceRainMap")}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setTab("weather")}
          className={`group relative flex items-center gap-2 sm:gap-3 rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 ${
            tab === "weather"
              ? "border-blue-500/40 bg-gradient-to-br from-blue-500/15 to-cyan-500/5 shadow-lg shadow-blue-500/10"
              : "border-white/10 bg-white/5 hover:border-blue-500/20 hover:bg-blue-500/5"
          }`}
        >
          <div className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
            tab === "weather"
              ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-500/25"
              : "bg-white/10 text-muted-foreground group-hover:bg-blue-500/20 group-hover:text-blue-400"
          }`}>
            <CloudSun className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs sm:text-sm font-semibold transition-colors ${
              tab === "weather" ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            }`}>{t("tabWeather")}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground/70 truncate">
              {t("tabWeatherCost", { n: TOKEN_COSTS.weather_check })}
            </p>
          </div>
          {tab === "weather" && (
            <div className="absolute -top-px left-4 right-4 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("rain-map")}
          className={`group relative flex items-center gap-2 sm:gap-3 rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 ${
            tab === "rain-map"
              ? "border-sky-500/40 bg-gradient-to-br from-sky-500/15 to-blue-500/5 shadow-lg shadow-sky-500/10"
              : "border-white/10 bg-white/5 hover:border-sky-500/20 hover:bg-sky-500/5"
          }`}
        >
          <div className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
            tab === "rain-map"
              ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25"
              : "bg-white/10 text-muted-foreground group-hover:bg-sky-500/20 group-hover:text-sky-400"
          }`}>
            <CloudRain className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs sm:text-sm font-semibold transition-colors ${
              tab === "rain-map" ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            }`}>{t("tabRainMap")}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground/70 truncate">{t("tabRainMapSub")}</p>
          </div>
          {tab === "rain-map" && (
            <div className="absolute -top-px left-4 right-4 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500" />
          )}
        </button>
      </div>

      {/* ===== WEATHER TAB ===== */}
      {tab === "weather" && (
        <>
          <div className="mb-4 sm:mb-6 glass rounded-2xl p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("labelLocation")}</label>
                {loadingLocs ? (
                  <div className="flex h-12 items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading")}
                  </div>
                ) : locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("noLocations")}{" "}
                    <Link href="/dashboard/locations/new" className="text-primary hover:underline">
                      {t("addLocation")}
                    </Link>
                  </p>
                ) : (
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      {locations.length === 0 && <option value="" disabled>{t("noLocations")}</option>}
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
                  {t("endDateLabel")}
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{t("endDateHint")}</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={requestGetData}
              disabled={loading || !selectedLocation}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudSun className="h-4 w-4" />
              )}
              {t("loadWeatherCta", { n: TOKEN_COSTS.weather_check })}
            </button>

            <TokenConfirmModal
              open={showWeatherConfirm}
              title={t("confirmWeatherTitle")}
              description={t("confirmWeatherDesc")}
              cost={TOKEN_COSTS.weather_check}
              balance={balance}
              loading={loading}
              onConfirm={handleGetData}
              onCancel={() => setShowWeatherConfirm(false)}
            />
          </div>

          {weatherDays.length > 0 && <WeatherChart data={weatherDays} />}

          {weatherDays.length > 0 && (
            <div className="overflow-hidden glass rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-left">
                      <th className="whitespace-nowrap px-4 py-3 font-medium">{t("tableDay")}</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">{t("tableDate")}</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text={t("tooltipTempMean")}>
                          <Thermometer className="h-3.5 w-3.5" />
                          {t("tempMeanShort")}
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text={t("tooltipTempMin")}>{t("tempMin")}</Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text={t("tooltipTempMax")}>{t("tempMax")}</Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text={t("tooltipRain")}>
                          <Droplets className="h-3.5 w-3.5" />
                          {t("rain")}
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text={t("tooltipWind")}>
                          <Wind className="h-3.5 w-3.5" />
                          {t("wind")}
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weatherDays.map((day, i) => (
                      <tr
                        key={day.date}
                        className={`border-b border-white/10 ${
                          i === 0 ? "bg-primary/10 font-medium" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {new Date(day.date).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-4 py-2.5">
                          {day.temperature_mean !== null
                            ? `${day.temperature_mean.toFixed(1)}°`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-blue-400">
                          {day.temperature_min !== null
                            ? `${day.temperature_min.toFixed(1)}°`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-red-400">
                          {day.temperature_max !== null
                            ? `${day.temperature_max.toFixed(1)}°`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {day.rain_sum.toFixed(1)} {t("unitMm")}
                        </td>
                        <td className="px-4 py-2.5">
                          {day.wind_speed_max !== null && day.wind_speed_max !== undefined
                            ? `${day.wind_speed_max.toFixed(0)} ${t("unitKmH")}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {savedList.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">{t("savedChecks")}</h2>
              <div className="space-y-2">
                {savedList.map((s) => (
                  <div key={s.id} className="glass flex items-center gap-3 rounded-xl px-4 py-3">
                    <button
                      type="button"
                      onClick={() => loadSaved(s.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <CloudSun className="h-4 w-4 flex-shrink-0 text-blue-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {(Array.isArray(s.location) ? s.location[0]?.name : (s.location as { name: string })?.name) ||
                            t("defaultLocationName")}{" "}
                          &middot;{" "}
                          {new Date(s.check_date).toLocaleDateString(locale)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSaved(s.id)}
                      className="flex-shrink-0 text-xs text-red-400 hover:text-red-300"
                    >
                      {t("delete")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== RAIN MAP TAB ===== */}
      {tab === "rain-map" && (
        <>
          {/* Top bar: controls + stats + legend */}
          <div className="mb-3 glass rounded-2xl px-3 sm:px-4 py-3">
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
              {/* Inputs */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
                <div>
                  <label htmlFor="radius" className="mb-1 block text-[10px] sm:hidden font-medium text-muted-foreground">
                    {t("radius")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="radius" className="hidden sm:block text-xs font-medium text-muted-foreground">
                      {t("radius")}
                    </label>
                    <input
                      id="radius"
                      type="number"
                      min={5}
                      max={100}
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value) || 30)}
                      className="w-full sm:w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="step" className="mb-1 block text-[10px] sm:hidden font-medium text-muted-foreground">
                    {t("step")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="step" className="hidden sm:block text-xs font-medium text-muted-foreground">
                      {t("step")}
                    </label>
                    <input
                      id="step"
                      type="number"
                      min={1}
                      max={50}
                      value={step}
                      onChange={(e) => setStep(parseInt(e.target.value) || 5)}
                      className="w-full sm:w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="rain-days" className="mb-1 block text-[10px] sm:hidden font-medium text-muted-foreground">
                    {t("days")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="rain-days" className="hidden sm:block text-xs font-medium text-muted-foreground">
                      {t("days")}
                    </label>
                    <input
                      id="rain-days"
                      type="number"
                      min={1}
                      max={30}
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 14)}
                      className="w-full sm:w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {centerLat !== null && centerLng !== null ? (
                  <>
                    <span className="hidden sm:flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px]">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
                    </span>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                      tooManyPoints ? "bg-red-500/15 text-red-400" : "bg-white/5"
                    }`}>
                      {t("pointsCount", { count: pointCount })}
                      {tooManyPoints ? t("pointsTooMany") : ""}
                    </span>
                    <span className={`flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
                      notEnoughTokens ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      <Coins className="h-2.5 w-2.5" />
                      {t("tokensAbbr", { n: tokenCost })}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("clickMapPickCenter")}</span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 sm:ml-auto">
                {gridData.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGridData([]);
                      setCenterLat(null);
                      setCenterLng(null);
                      setShowConfirm(false);
                      setRainError("");
                    }}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3 sm:px-4 py-2 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("newMeasurement")}</span>
                    <span className="sm:hidden">{t("resetShort")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestGenerate}
                  disabled={rainLoading || centerLat === null || tooManyPoints || notEnoughTokens || gridData.length > 0}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 sm:px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {rainLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CloudRain className="h-3.5 w-3.5" />
                  )}
                  {t("load")}
                </button>
              </div>
            </div>

            {/* Confirm / Error row */}
            {showConfirm && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                <p className="flex-1 text-[11px] text-amber-400/80">
                  {t("confirmSpendLine", {
                    points: pointCount,
                    cost: tokenCost,
                    balance: balance ?? "—",
                  })}
                </p>
                <button
                  type="button"
                  onClick={handleConfirmGenerate}
                  className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-amber-600"
                >
                  <Coins className="h-3 w-3" />
                  {t("yesCharge")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md px-3 py-1.5 text-[11px] text-foreground/70 hover:bg-white/5"
                >
                  {t("cancel")}
                </button>
              </div>
            )}

            {rainError && (
              <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                {rainError}
              </div>
            )}

            {/* Legend */}
            {gridData.length > 0 && (() => {
              const maxRain = Math.max(...gridData.map((p) => p.rain_total));
              const minRain = Math.min(...gridData.map((p) => p.rain_total));
              const avgRain = gridData.reduce((a, b) => a + b.rain_total, 0) / gridData.length;
              const step8 = maxRain / 8;
              return (
                <div className="mt-3 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium">{t("rainSumForDays", { days })}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t("legendStats", {
                        pts: gridData.length,
                        min: minRain.toFixed(1),
                        max: maxRain.toFixed(1),
                        avg: avgRain.toFixed(1),
                      })}
                    </span>
                  </div>
                  <div className="flex h-6 overflow-hidden rounded-lg">
                    <div className="flex-1 bg-blue-100" />
                    <div className="flex-1 bg-blue-200" />
                    <div className="flex-1 bg-blue-300" />
                    <div className="flex-1 bg-cyan-400" />
                    <div className="flex-1 bg-green-400" />
                    <div className="flex-1 bg-yellow-400" />
                    <div className="flex-1 bg-orange-400" />
                    <div className="flex-1 bg-red-500" />
                  </div>
                  <div className="mt-1 flex text-[10px] text-muted-foreground">
                    <span className="flex-1 text-left">0</span>
                    <span className="flex-1 text-center">{Math.round(step8 * 2)}</span>
                    <span className="flex-1 text-center">{Math.round(step8 * 3)}</span>
                    <span className="flex-1 text-center">{Math.round(step8 * 4)}</span>
                    <span className="flex-1 text-center">{Math.round(step8 * 5)}</span>
                    <span className="flex-1 text-center">{Math.round(step8 * 6)}</span>
                    <span className="flex-1 text-center">{Math.round(step8 * 7)}</span>
                    <span className="flex-1 text-right">
                      {Math.round(maxRain)} {t("unitMm")}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Map — full width */}
          <div style={{ height: "calc(100vh - 360px)", minHeight: 300 }}>
            <RainMapView
              centerLat={centerLat}
              centerLng={centerLng}
              radius={radius}
              step={step}
              gridData={gridData}
              onCenterSelect={(lat, lng) => {
                if (gridData.length > 0) return;
                setCenterLat(lat);
                setCenterLng(lng);
                setShowConfirm(false);
              }}
            />
          </div>

          {/* Saved rain maps — below the map */}
          {savedRainList.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold">{t("savedMaps")}</h3>
              <div className="flex flex-wrap gap-2">
                {savedRainList.map((s) => (
                  <div key={s.id} className="glass flex items-center gap-2 rounded-xl px-3 py-2">
                    <button
                      type="button"
                      onClick={() => loadSavedMap(s.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <CloudRain className="h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
                      <span className="text-xs font-medium">
                        {t("savedMapParams", {
                          radius: s.radius_km,
                          step: s.step_km,
                          days: s.days,
                        })}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedMap(s.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
