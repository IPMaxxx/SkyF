"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { WeatherChart } from "@/components/app/WeatherChart";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_COSTS } from "@/lib/tokens";
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

const RainMapView = dynamic(
  () => import("@/components/app/RainMapView").then((m) => m.RainMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-xl bg-white/5">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    ),
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
  const [tab, setTab] = useState<Tab>("weather");

  // --- Weather state ---
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocs, setLoadingLocs] = useState(true);
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
  const [savedRainList, setSavedRainList] = useState<{ id: string; center_lat: number; center_lng: number; radius_km: number; step_km: number; days: number; created_at: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [locRes, savedRes, lastRes, rainRes] = await Promise.all([
        supabase.from("locations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("saved_weather").select("id, check_date, created_at, location:locations(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("saved_weather").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("saved_rain_maps").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (locRes.data) {
        setLocations(locRes.data);
        if (locRes.data.length > 0) setSelectedId(locRes.data[0].id);
      }
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
        setGridData(last.grid_data);
      }

      setLoadingLocs(false);
    };
    load();
  }, []);

  const selectedLocation = locations.find((l) => l.id === selectedId);

  // --- Weather handlers ---
  const handleGetData = async () => {
    if (!selectedLocation) return;

    const spendResult = await spend("weather_check", "Проверка погоды");
    if (!spendResult.success) {
      setError(spendResult.error || "Недостаточно токенов");
      return;
    }

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
      setError("Ошибка загрузки данных о погоде");
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
      setRainError("Кликните на карту, чтобы поставить центральную точку");
      return;
    }
    if (tooManyPoints) {
      setRainError(`Слишком много точек (${pointCount}). Увеличьте шаг или уменьшите радиус. Максимум: 200.`);
      return;
    }
    if (pointCount === 0) {
      setRainError("Нет точек для запроса. Проверьте параметры.");
      return;
    }
    setRainError("");
    setShowConfirm(true);
  };

  const handleConfirmGenerate = async () => {
    setShowConfirm(false);
    if (centerLat === null || centerLng === null) return;
    const points = generateGridPoints(centerLat, centerLng, radius, step);

    const spendResult = await spend("rain_map_per_batch", `Карта осадков (${points.length} точек)`);
    if (!spendResult.success) {
      setRainError(spendResult.error || "Недостаточно токенов");
      return;
    }

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
      setRainError("Ошибка загрузки данных");
    } finally {
      setRainLoading(false);
    }
  };

  const loadSavedMap = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("saved_rain_maps").select("*").eq("id", id).single();
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <CloudSun className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Погода</h1>
          <p className="text-sm text-muted-foreground">
            Архив погоды и карта осадков — всё в одном месте
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setTab("weather")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "weather"
              ? "bg-white/10 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CloudSun className="h-4 w-4" />
          Проверить погоду
        </button>
        <button
          type="button"
          onClick={() => setTab("rain-map")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "rain-map"
              ? "bg-white/10 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CloudRain className="h-4 w-4" />
          Карта осадков
        </button>
      </div>

      {/* ===== WEATHER TAB ===== */}
      {tab === "weather" && (
        <>
          <div className="mb-6 glass rounded-2xl p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Локация</label>
                {loadingLocs ? (
                  <div className="flex h-12 items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка...
                  </div>
                ) : locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Нет сохранённых локаций.{" "}
                    <Link href="/dashboard/locations/new" className="text-primary hover:underline">
                      Добавить
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setSelectedId(loc.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          selectedId === loc.id
                            ? "border-primary/50 bg-primary/15"
                            : "border-white/10 hover:border-primary/30 bg-white/5"
                        }`}
                      >
                        <MapPin
                          className={`h-4 w-4 flex-shrink-0 ${
                            selectedId === loc.id ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">{loc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
                  Дата (день 1 из 14)
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Будут загружены данные за 14 дней в прошлое от этой даты
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGetData}
              disabled={loading || !selectedLocation}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudSun className="h-4 w-4" />
              )}
              Get Data · {TOKEN_COSTS.weather_check} токен
            </button>
          </div>

          {weatherDays.length > 0 && <WeatherChart data={weatherDays} />}

          {weatherDays.length > 0 && (
            <div className="overflow-hidden glass rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-left">
                      <th className="whitespace-nowrap px-4 py-3 font-medium">День</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">Дата</th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text="Средняя температура воздуха на высоте 2м за сутки (°C). Ключевой параметр для оценки условий роста грибов. Оптимально: 10–20°C.">
                          <Thermometer className="h-3.5 w-3.5" />
                          t°C ср.
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text="Минимальная температура воздуха за сутки (°C). Важно для оценки ночных заморозков, которые могут остановить рост грибницы.">
                          t°C мин
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text="Максимальная температура воздуха за сутки (°C). Слишком высокая температура (>30°C) замедляет рост грибов.">
                          t°C макс
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text="Сумма всех осадков за сутки в мм (дождь + снег). Осадки за 7–14 дней до сбора — главный фактор появления грибов.">
                          <Droplets className="h-3.5 w-3.5" />
                          Осадки
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text="Сумма жидких осадков (только дождь, без снега) за сутки в мм. Дождь эффективнее снега для увлажнения почвы и роста грибницы.">
                          Дождь
                        </Tooltip>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-medium">
                        <Tooltip text="Максимальная скорость ветра на высоте 10м за сутки (км/ч). Сильный ветер (>40 км/ч) высушивает почву и ухудшает условия для грибов.">
                          <Wind className="h-3.5 w-3.5" />
                          Ветер
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
                          {new Date(day.date).toLocaleDateString("ru-RU", {
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
                          {day.precipitation_sum.toFixed(1)} мм
                        </td>
                        <td className="px-4 py-2.5">
                          {day.rain_sum.toFixed(1)} мм
                        </td>
                        <td className="px-4 py-2.5">
                          {day.wind_speed_max !== null && day.wind_speed_max !== undefined
                            ? `${day.wind_speed_max.toFixed(0)} км/ч`
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
              <h2 className="mb-4 text-lg font-semibold">Сохранённые проверки</h2>
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
                          {(Array.isArray(s.location) ? s.location[0]?.name : (s.location as { name: string })?.name) || "Локация"} &middot;{" "}
                          {new Date(s.check_date).toLocaleDateString("ru-RU")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSaved(s.id)}
                      className="flex-shrink-0 text-xs text-red-400 hover:text-red-300"
                    >
                      Удалить
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
          <div className="mb-3 glass rounded-2xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Inputs */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="radius" className="text-xs font-medium text-muted-foreground">Радиус</label>
                  <input
                    id="radius"
                    type="number"
                    min={5}
                    max={100}
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value) || 30)}
                    className="w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="step" className="text-xs font-medium text-muted-foreground">Шаг</label>
                  <input
                    id="step"
                    type="number"
                    min={1}
                    max={50}
                    value={step}
                    onChange={(e) => setStep(parseInt(e.target.value) || 5)}
                    className="w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="rain-days" className="text-xs font-medium text-muted-foreground">Дней</label>
                  <input
                    id="rain-days"
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value) || 14)}
                    className="w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2">
                {centerLat !== null && centerLng !== null ? (
                  <>
                    <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px]">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
                    </span>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                      tooManyPoints ? "bg-red-500/15 text-red-400" : "bg-white/5"
                    }`}>
                      {pointCount} точек{tooManyPoints ? " (макс 200)" : ""}
                    </span>
                    <span className={`flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
                      notEnoughTokens ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      <Coins className="h-2.5 w-2.5" />
                      {tokenCost} ток.
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Кликните на карту, чтобы выбрать центр
                  </span>
                )}
              </div>

              {/* Buttons */}
              <div className="ml-auto flex items-center gap-2">
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
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Новое измерение
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestGenerate}
                  disabled={rainLoading || centerLat === null || tooManyPoints || notEnoughTokens || gridData.length > 0}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {rainLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CloudRain className="h-3.5 w-3.5" />
                  )}
                  Загрузить
                </button>
              </div>
            </div>

            {/* Confirm / Error row */}
            {showConfirm && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                <p className="flex-1 text-[11px] text-amber-400/80">
                  <strong>{pointCount}</strong> точек &middot; <strong>{tokenCost} ток.</strong> &middot; Баланс: <strong>{balance}</strong>
                </p>
                <button
                  type="button"
                  onClick={handleConfirmGenerate}
                  className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-amber-600"
                >
                  <Coins className="h-3 w-3" />
                  Да, списать
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md px-3 py-1.5 text-[11px] text-foreground/70 hover:bg-white/5"
                >
                  Отмена
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
                    <span className="text-xs font-medium">Сумма дождя за {days} дн.</span>
                    <span className="text-[11px] text-muted-foreground">
                      {gridData.length} тчк &middot; {minRain.toFixed(1)}–{maxRain.toFixed(1)} мм &middot; ср. {avgRain.toFixed(1)} мм
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
                    <span className="flex-1 text-right">{Math.round(maxRain)} мм</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Map — full width */}
          <div style={{ height: "calc(100vh - 320px)", minHeight: 350 }}>
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
              <h3 className="mb-2 text-sm font-semibold">Сохранённые карты</h3>
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
                        R:{s.radius_km} &middot; Ш:{s.step_km} &middot; {s.days}д
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
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
