"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  CloudSun,
  CloudRain,
  Trees,
  Plus,
  MapPin,
  Loader2,
  ArrowUpRight,
  Star,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTokens } from "@/lib/TokenContext";
import { useAppData } from "@/lib/AppDataContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { useIsNative } from "@/lib/native/useIsNative";
import { WeatherChart } from "@/components/app/WeatherChart";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import type { Location, WeatherDay, ForestInfo } from "@/lib/supabase/types";
import type { MapSelection } from "@/components/app/DashboardMap";

const RainMapView = dynamic(
  () => import("@/components/app/RainMapView").then((m) => m.RainMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-2xl bg-white/5">
        <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
      </div>
    ),
  }
);

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

// Параметры быстрой карты дождя с дашборда: компактно и предсказуемо по цене
// (20 точек ≤ 50 = 1 батч = 10 токенов по rain_map_per_batch).
const PRECIP_RADIUS_KM = 20;
const PRECIP_POINTS = 20;
const PRECIP_DAYS = 14;
// Стоимость одной карты дождя: ceil(20 / 50) = 1 батч → 10 токенов.
const PRECIP_BATCH_COUNT = Math.ceil(PRECIP_POINTS / 50);
const PRECIP_COST = PRECIP_BATCH_COUNT * TOKEN_COSTS.rain_map_per_batch;

// Равномерное распределение точек в круге (спираль Фогеля) — как на weather-странице.
function generateEvenPoints(
  lat: number,
  lng: number,
  radiusKm: number,
  count: number
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
  for (let i = 0; i < count; i++) {
    const r = radiusKm * Math.sqrt((i + 0.5) / count);
    const theta = i * golden;
    const dxKm = r * Math.cos(theta);
    const dyKm = r * Math.sin(theta);
    points.push({
      lat: lat + dyKm / 111.32,
      lng: lng + dxKm / (111.32 * cosLat),
    });
  }
  return points;
}

function evenCellStep(radiusKm: number, count: number): number {
  if (count <= 0) return radiusKm;
  return Math.max(1, (2 * radiusKm) / Math.sqrt(count));
}

type ActiveAction = "weather" | "precip" | "forest" | null;

interface Props {
  selection: MapSelection | null;
  /** Вызывается после авто-сохранения пустой точки как новой локации. */
  onLocationCreated: (loc: Location) => void;
}

export function MapActionPanel({ selection, onLocationCreated }: Props) {
  const t = useTranslations("dashboard.mapPanel");
  const locale = useLocale();
  const isNative = useIsNative();
  const { spend, balance } = useTokens();
  const { updateLocation } = useAppData();

  const [active, setActive] = useState<ActiveAction>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  // Действие, ожидающее подтверждения списания в модалке (null — модалка скрыта).
  const [pending, setPending] = useState<Exclude<ActiveAction, null> | null>(null);

  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const [gridData, setGridData] = useState<GridPoint[]>([]);
  const [precipLoading, setPrecipLoading] = useState(false);
  const [precipError, setPrecipError] = useState("");

  const isSaved = selection?.kind === "location" || selection?.kind === "bestDay";
  const savedLocation =
    selection?.kind === "location" || selection?.kind === "bestDay"
      ? selection.location
      : null;

  // Сброс результатов при смене выбранной точки.
  useEffect(() => {
    setActive(null);
    setPending(null);
    setAddError("");
    setWeatherDays([]);
    setWeatherError("");
    setGridData([]);
    setPrecipError("");
  }, [selection?.kind, selection?.lat, selection?.lng]);

  const handleAdd = async () => {
    if (selection?.kind !== "empty") return;
    setAdding(true);
    setAddError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAddError(t("addLocationError"));
        return;
      }
      const name = `${selection.lat.toFixed(5)}, ${selection.lng.toFixed(5)}`;
      const { data, error } = await supabase
        .from("locations")
        .insert({
          user_id: user.id,
          name,
          lat: selection.lat,
          lng: selection.lng,
        })
        .select("*")
        .single();
      if (error || !data) {
        setAddError(t("addLocationError"));
        return;
      }
      onLocationCreated(data as Location);
    } catch {
      setAddError(t("addLocationError"));
    } finally {
      setAdding(false);
    }
  };

  const runWeather = async () => {
    if (!selection || !savedLocation) return;
    setActive("weather");
    setWeatherError("");
    setWeatherDays([]);

    const spendResult = await spend("weather_check", t("weatherReason"));
    if (!spendResult.success) {
      setWeatherError(spendResult.error || t("insufficientTokens"));
      return;
    }
    toast.success(t("toastCharged", { amount: TOKEN_COSTS.weather_check }));

    setWeatherLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/weather?lat=${selection.lat}&lng=${selection.lng}&date=${today}&days=14&source=open-meteo`
      );
      const data = await res.json();
      if (data.error) {
        setWeatherError(data.error);
      } else if (data.days?.length) {
        setWeatherDays(data.days);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("saved_weather").insert({
            user_id: user.id,
            location_id: savedLocation.id,
            check_date: today,
            weather_data: data.days,
            source: data.source ?? "open-meteo",
          });
        }
      } else {
        setWeatherError(t("noResult"));
      }
    } catch {
      setWeatherError(t("error"));
    } finally {
      setWeatherLoading(false);
    }
  };

  const runPrecip = async () => {
    if (!selection || !savedLocation) return;
    setActive("precip");
    setPrecipError("");
    setGridData([]);

    const points = generateEvenPoints(
      selection.lat,
      selection.lng,
      PRECIP_RADIUS_KM,
      PRECIP_POINTS
    );

    const spendResult = await spend("rain_map_per_batch", t("precipReason"), PRECIP_BATCH_COUNT);
    if (!spendResult.success) {
      setPrecipError(spendResult.error || t("insufficientTokens"));
      return;
    }
    toast.success(t("toastCharged", { amount: PRECIP_COST }));

    setPrecipLoading(true);
    try {
      const res = await fetch("/api/weather/grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, days: PRECIP_DAYS }),
      });
      const data = await res.json();
      if (data.error) {
        setPrecipError(data.error);
      } else {
        const results: GridPoint[] = data.results || [];
        setGridData(results);
        if (results.length > 0) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const step = Math.max(
              1,
              Math.round(evenCellStep(PRECIP_RADIUS_KM, results.length))
            );
            await supabase.from("saved_rain_maps").insert({
              user_id: user.id,
              center_lat: selection.lat,
              center_lng: selection.lng,
              radius_km: PRECIP_RADIUS_KM,
              step_km: step,
              days: PRECIP_DAYS,
              grid_data: results,
            });
          }
        } else {
          setPrecipError(t("noResult"));
        }
      }
    } catch {
      setPrecipError(t("error"));
    } finally {
      setPrecipLoading(false);
    }
  };

  const persistForestInfo = (info: ForestInfo) => {
    if (!savedLocation) return;
    updateLocation(savedLocation.id, { forest_info: info });
    const supabase = createClient();
    supabase
      .from("locations")
      .update({ forest_info: info as unknown as Record<string, unknown> })
      .eq("id", savedLocation.id)
      .then();
  };

  const detailHref =
    selection?.kind === "bestDay"
      ? `/dashboard/best-day/${selection.bestDay.id}`
      : selection?.kind === "location"
        ? `/dashboard/locations/${selection.location.id}`
        : null;

  const selectionName =
    selection?.kind === "bestDay"
      ? selection.bestDay.name
      : selection?.kind === "location"
        ? selection.location.name
        : null;

  // Тап по кнопке действия открывает подтверждение списания; сам запуск и
  // списание токенов происходят только после подтверждения в модалке.
  const actions: {
    key: Exclude<ActiveAction, null>;
    label: string;
    icon: typeof CloudSun;
    cost: number;
  }[] = [
    { key: "weather", label: t("weather"), icon: CloudSun, cost: TOKEN_COSTS.weather_check },
    { key: "precip", label: t("rainMap"), icon: CloudRain, cost: PRECIP_COST },
    { key: "forest", label: t("forest"), icon: Trees, cost: TOKEN_COSTS.forest_info },
  ];

  // Конфиг подтверждения по действию: стоимость и тексты. Forest списывается
  // на сервере внутри GET /api/forest-info (1 токен; подписчики Forager/Pro —
  // без списаний), модалка показывает стоимость единообразно для всех.
  const confirmConfig = {
    weather: { cost: TOKEN_COSTS.weather_check, free: false, title: t("confirmWeatherTitle"), description: t("confirmWeatherDesc") },
    precip: { cost: PRECIP_COST, free: false, title: t("confirmRainTitle"), description: t("confirmRainDesc") },
    forest: { cost: TOKEN_COSTS.forest_info, free: false, title: t("confirmForestTitle"), description: t("confirmForestDesc") },
  } as const;

  const handleConfirm = () => {
    const action = pending;
    setPending(null);
    if (action === "weather") runWeather();
    else if (action === "precip") runPrecip();
    else if (action === "forest") setActive("forest");
  };

  const panelClass = isNative
    ? "rounded-t-[22px] border border-white/[0.08] border-b-0 bg-[#0d160f] px-[18px] pb-5 pt-4 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.6)]"
    : "glass rounded-2xl p-3 sm:p-4";

  return (
    <div className={panelClass}>
      {isNative && selection && <div className="sheet-handle" aria-hidden="true" />}

      {/* Заголовок: имя точки + Детали (saved) / координаты + Добавить (empty) */}
      {!selection ? (
        <p className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" aria-hidden="true" />
          {t("prompt")}
        </p>
      ) : selection.kind === "empty" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading text-[15px] font-bold">{t("pointSelected")}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[#8aa090]">
              {selection.lat.toFixed(4)}, {selection.lng.toFixed(4)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("emptyHint")}</p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[9px] border border-primary/30 bg-primary/15 px-3 text-sm font-bold text-primary-light transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {adding ? t("adding") : t("addLocation")}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              {selection.kind === "bestDay" ? (
                <Star className="h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
              )}
              <span className="truncate">{selectionName}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("savedHint")}</p>
          </div>
          {detailHref && (
            <Link
              href={detailHref}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/5 px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            >
              {t("details")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      {addError && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {addError}
        </p>
      )}

      {/* Ряд действий */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          const disabled = !isSaved;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() =>
                a.key === "forest" && savedLocation?.forest_info
                  ? setActive("forest")
                  : setPending(a.key)
              }
              disabled={disabled}
              aria-pressed={active === a.key}
              className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] border px-2 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light ${
                disabled
                  ? "cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-muted-foreground/40"
                  : active === a.key
                    ? "border-primary/35 bg-primary/15 text-primary-light"
                    : "border-white/[0.09] bg-white/[0.045] text-foreground/90 hover:bg-white/[0.07]"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[11px] font-bold leading-tight">{a.label}</span>
              {!disabled && (
                <span className="text-[9px] font-bold text-token">
                  {a.cost} {locale === "en" ? "tokens" : "т."}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Инлайн-результаты */}
      {isSaved && active === "weather" && (
        <div className="mt-3">
          {weatherLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              {t("loading")}
            </div>
          ) : weatherError ? (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {weatherError}
            </p>
          ) : weatherDays.length > 0 ? (
            <WeatherChart data={weatherDays} />
          ) : null}
        </div>
      )}

      {isSaved && active === "precip" && (
        <div className="mt-3">
          {precipLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              {t("loading")}
            </div>
          ) : precipError ? (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {precipError}
            </p>
          ) : gridData.length > 0 && selection ? (
            <div className="h-[320px]">
              <RainMapView
                centerLat={selection.lat}
                centerLng={selection.lng}
                radius={PRECIP_RADIUS_KM}
                step={Math.max(1, Math.round(evenCellStep(PRECIP_RADIUS_KM, gridData.length)))}
                gridData={gridData}
                onCenterSelect={() => {}}
              />
            </div>
          ) : null}
        </div>
      )}

      {isSaved && active === "forest" && selection && (
        <div className="mt-3">
          <ForestInfoPanel
            lat={selection.lat}
            lng={selection.lng}
            forestInfo={savedLocation?.forest_info ?? null}
            onLoaded={persistForestInfo}
            autoLoad
            locale={locale}
          />
        </div>
      )}

      {/* Подтверждение списания перед запуском действия. */}
      {pending && (
        <TokenConfirmModal
          open
          locale={locale}
          free={confirmConfig[pending].free}
          title={confirmConfig[pending].title}
          description={confirmConfig[pending].description}
          cost={confirmConfig[pending].cost}
          balance={balance}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
