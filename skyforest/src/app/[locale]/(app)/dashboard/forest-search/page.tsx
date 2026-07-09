"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft, Trees, Search, Loader2, MapPin, Crosshair, Leaf, Satellite,
  Database, ChevronDown, ChevronUp, CloudSun, Save, Check,
  Thermometer, Droplets, Wind, Globe, History, RotateCcw, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import { HowItWorksPopover } from "@/components/app/HowItWorksPopover";
import { toast } from "sonner";
import type { WeatherDay } from "@/lib/supabase/types";
import type { ForestMatch, ForestPattern } from "@/app/api/forest-search/route";
import { formatReason, formatIgbpClass } from "@/lib/forestSearchReason";
import { useUnits } from "@/lib/units";

interface HistoryItem {
  id: string;
  ref_lat: number;
  ref_lng: number;
  search_lat: number;
  search_lng: number;
  radius_km: number;
  token_cost: number;
  ref_pattern: ForestPattern;
  matches: ForestMatch[];
  stats: { polygons: number; osmMassifs: number; scanZones: number };
  created_at: string;
}

function ForestSearchMapLoading() {
  const t = useTranslations("forestSearch");
  return (
    <div className="flex h-[500px] items-center justify-center rounded-xl bg-white/5">
      <p className="text-sm text-muted-foreground">{t("mapLoading")}</p>
    </div>
  );
}

function tokPlural(n: number, t: (key: string) => string, locale: string) {
  if (locale === "en") return n === 1 ? t("tokenWord") : t("tokenWord5");
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t("tokenWord");
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return t("tokenWord2");
  return t("tokenWord5");
}

const ForestSearchMap = dynamic(
  () => import("@/components/app/ForestSearchMap").then((m) => m.ForestSearchMap),
  { ssr: false, loading: () => <ForestSearchMapLoading /> }
);

type Step = "reference" | "search" | "results";

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];

export default function ForestSearchPage() {
  const t = useTranslations("forestSearch");
  const locale = useLocale();
  const units = useUnits();
  const searchParams = useSearchParams();
  const initLat = searchParams.get("lat");
  const initLng = searchParams.get("lng");
  const { balance, spend, refresh: refreshTokens } = useTokens();
  const [step, setStep] = useState<Step>("reference");

  const [refLat, setRefLat] = useState<number | null>(null);
  const [refLng, setRefLng] = useState<number | null>(null);
  const [refPattern, setRefPattern] = useState<ForestPattern | null>(null);
  const [refLoading, setRefLoading] = useState(false);

  const [searchLat, setSearchLat] = useState<number | null>(null);
  const [searchLng, setSearchLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);

  const [matches, setMatches] = useState<ForestMatch[]>([]);
  const [stats, setStats] = useState<{ polygons: number; osmMassifs: number; scanZones: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherDay[] | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherLoadedSet, setWeatherLoadedSet] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [showSearchConfirm, setShowSearchConfirm] = useState(false);
  const [weatherConfirmIdx, setWeatherConfirmIdx] = useState<number | null>(null);

  const tokenCost = Math.max(2, 2 * Math.ceil(Math.min(radiusKm, 20) / 2));

  const genusLine = (genera: string[]) =>
    genera.map((g) => t(`genus.${g}` as never)).join(", ");
  const forestTypeLabel = (ft: string) => t(`forestType.${ft}` as never);
  const tReason = t as unknown as (key: string, values?: Record<string, string | number>) => string;
  const tIgbp = t as unknown as ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean };
  const igbpLabel = (cls: number | string | null | undefined) => formatIgbpClass(tIgbp, cls);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/forest-search/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Эталонная точка из URL (переход с попапа на карте дашборда).
  useEffect(() => {
    if (!initLat || !initLng) return;
    const la = parseFloat(initLat);
    const ln = parseFloat(initLng);
    if (Number.isNaN(la) || Number.isNaN(ln)) return;
    setRefLat(la);
    setRefLng(ln);
    setRefPattern(null);
    setStep("reference");
  }, [initLat, initLng]);

  const restoreFromHistory = (item: HistoryItem) => {
    setRefLat(item.ref_lat);
    setRefLng(item.ref_lng);
    setSearchLat(item.search_lat);
    setSearchLng(item.search_lng);
    setRadiusKm(item.radius_km);
    setRefPattern(item.ref_pattern);
    setMatches(item.matches);
    setStats(item.stats);
    setStep("results");
    setSelectedIdx(null);
    setDetailIdx(null);
    setWeather(null);
    setSavedSet(new Set());
    setWeatherLoadedSet(new Set());
    setShowHistory(false);
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await fetch("/api/forest-search/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch { /* ignore */ }
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (step === "reference") {
      setRefLat(lat);
      setRefLng(lng);
      setRefPattern(null);
    } else if (step === "search") {
      setSearchLat(lat);
      setSearchLng(lng);
    }
  }, [step]);

  const runSearch = async () => {
    if (refLat === null || refLng === null || searchLat === null || searchLng === null) return;
    setShowSearchConfirm(false);
    setSearching(true);
    setError("");
    setMatches([]);

    try {
      const res = await fetch("/api/forest-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_lat: refLat, ref_lng: refLng,
          search_lat: searchLat, search_lng: searchLng,
          radius_km: radiusKm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errSearch"));
        return;
      }
      setMatches(data.matches || []);
      setRefPattern(data.ref_pattern || null);
      setStats({ polygons: data.total_osm_polygons, osmMassifs: data.total_osm_massifs, scanZones: data.total_scan_zones });
      setStep("results");
      refreshTokens();
      fetchHistory();
    } catch {
      setError(t("errConnection"));
    } finally {
      setSearching(false);
    }
  };

  const fetchWeather = async (idx: number) => {
    const m = matches[idx];
    if (!m) return;
    if (selectedIdx === idx && weather) {
      setSelectedIdx(null);
      setWeather(null);
      return;
    }
    if (!weatherLoadedSet.has(idx)) {
      setWeatherConfirmIdx(idx);
      return;
    }
    await doFetchWeather(idx);
  };

  const doFetchWeather = async (idx: number) => {
    const m = matches[idx];
    if (!m) return;

    if (!weatherLoadedSet.has(idx)) {
      const spendResult = await spend("weather_check", t("spendWeatherMassif", { n: idx + 1 }));
      if (!spendResult.success) {
        setError(spendResult.error || t("insufficientTokens"));
        return;
      }
      toast.success(t("toastWeatherCharged", { amount: TOKEN_COSTS.weather_check }));
      setWeatherLoadedSet((prev) => new Set(prev).add(idx));
      refreshTokens();
    }

    setSelectedIdx(idx);
    setWeather(null);
    setWeatherLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/weather?lat=${m.lat}&lng=${m.lng}&date=${today}&days=14`);
      const data = await res.json();
      if (res.ok && data.days) setWeather(data.days);
    } catch { /* ignore */ }
    setWeatherLoading(false);
  };

  const saveAsLocation = async (idx: number) => {
    const m = matches[idx];
    if (!m) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name = m.pattern.dominant_species
        ? `${m.pattern.dominant_species} (${m.lat.toFixed(3)}, ${m.lng.toFixed(3)})`
        : t("saveLocationName", { lat: m.lat.toFixed(3), lng: m.lng.toFixed(3) });
      await supabase.from("locations").insert({ user_id: user.id, name, lat: m.lat, lng: m.lng });
      setSavedSet((prev) => new Set(prev).add(idx));
    } catch { /* ignore */ }
    setSaving(false);
  };

  const reset = () => {
    setStep("reference");
    setRefLat(null); setRefLng(null); setRefPattern(null);
    setSearchLat(null); setSearchLng(null);
    setMatches([]); setStats(null); setError("");
    setSelectedIdx(null); setDetailIdx(null); setWeather(null);
    setSavedSet(new Set()); setWeatherLoadedSet(new Set());
  };

  const visibleMatches = expanded ? matches : matches.slice(0, 6);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link href="/dashboard" className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Trees className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold">{t("title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {step === "reference" && t("stepRef")}
            {step === "search" && t("stepSearch")}
            {step === "results" && t("stepResults", { count: matches.length })}
          </p>
        </div>
        <HowItWorksPopover>
          <p><span className="text-foreground/80 font-medium">1.</span> {t("howStep1")}</p>
          <p><span className="text-foreground/80 font-medium">2.</span> {t("howStep2")}</p>
          <div className="space-y-4 pt-2 border-t border-border/30">
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-xs">{t("sourcesTitle")}</h3>
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/15 p-2">
                  <span className="font-semibold text-amber-400">{t("sourceFgisTitle")}</span>
                  <p className="text-muted-foreground mt-0.5">{t("sourceFgisDesc")}</p>
                </div>
                <div className="rounded-lg bg-green-500/10 border border-green-500/15 p-2">
                  <span className="font-semibold text-green-400">iNaturalist</span>
                  <p className="text-muted-foreground mt-0.5">{t("sourceInatDesc")}</p>
                </div>
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/15 p-2">
                  <span className="font-semibold text-purple-400">MODIS</span>
                  <p className="text-muted-foreground mt-0.5">{t("sourceModisDesc")}</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/15 p-2">
                  <span className="font-semibold text-blue-400">OpenStreetMap</span>
                  <p className="text-muted-foreground mt-0.5">{t("sourceOsmDesc")}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-xs">{t("scoringTitle")}</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" /><span className="flex-1 text-muted-foreground">{t("scoreGenera")}</span><span className="font-medium text-green-400">{t("maxPoints", { n: 50 })}</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" /><span className="flex-1 text-muted-foreground">{t("scoreDominant")}</span><span className="font-medium">{t("maxPoints", { n: 20 })}</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" /><span className="flex-1 text-muted-foreground">{t("scoreForestType")}</span><span className="font-medium">{t("maxPoints", { n: 20 })}</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" /><span className="flex-1 text-muted-foreground">{t("scoreModis")}</span><span className="font-medium">{t("maxPoints", { n: 10 })}</span></div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1 text-xs">{t("costTitle")}</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><Search className="inline h-3 w-3 mr-1" />{t("costSearchLine")}</p>
                <p><CloudSun className="inline h-3 w-3 mr-1" />{t("costWeatherLine")}</p>
              </div>
            </div>
          </div>
        </HowItWorksPopover>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 ${showHistory ? "bg-blue-600 text-white" : "bg-white/10 text-muted-foreground hover:bg-white/20 hover:text-foreground"}`}
          >
            <History className="h-4 w-4" />
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{history.length}</span>
          </button>
        )}
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-blue-500/15">
            <History className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400 flex-1">{t("historyTitle")}</span>
            <button onClick={() => setShowHistory(false)} className="text-xs text-muted-foreground hover:text-foreground">{t("hide")}</button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground text-center">{t("historyEmpty")}</p>
          ) : (
            <div className="divide-y divide-blue-500/10 max-h-80 overflow-y-auto">
              {history.map((item) => {
                const date = new Date(item.created_at);
                const locTag = locale === "en" ? "en-US" : "ru-RU";
                const dateStr = date.toLocaleDateString(locTag, { day: "numeric", month: "short", year: "numeric" });
                const bestMatch = item.matches.length > 0 ? item.matches[0].similarity : 0;
                const rp = item.ref_pattern;
                return (
                  <div key={item.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                        <span className="font-medium">{rp.dominant_species || forestTypeLabel(rp.forest_type)}</span>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">{t("historyMeta", { radius: units.isImperial ? units.fmtDist(item.radius_km) : item.radius_km, unit: units.distUnit, count: item.matches.length })}</span>
                        {bestMatch > 0 && (
                          <span className={`text-[11px] sm:text-xs font-bold ${bestMatch >= 70 ? "text-emerald-400" : bestMatch >= 40 ? "text-amber-400" : "text-gray-400"}`}>
                            {bestMatch}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        <span>{dateStr}</span>
                        <span className="ml-1.5 sm:ml-2">{t("tokensAbbr", { n: item.token_cost })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => restoreFromHistory(item)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                        title={t("restoreTitle")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("open")}</span>
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title={t("deleteTitle")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Steps indicator */}
      <div className="mb-6 flex gap-1">
        {(["reference", "search", "results"] as Step[]).map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= ["reference", "search", "results"].indexOf(step) ? "bg-emerald-500" : "bg-white/10"}`} />
        ))}
      </div>

      {/* Reference pattern summary */}
      {refPattern && step !== "reference" && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/15">
            <Leaf className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400 flex-1">
              {t("refSummary", {
                type: forestTypeLabel(refPattern.forest_type),
                genera: refPattern.genera.length,
                points: refPattern.points_sampled,
              })}
            </span>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">{t("reset")}</button>
          </div>
          <div className="px-4 py-3 space-y-2 text-xs">
            <div className="text-muted-foreground">
              <MapPin className="inline h-3 w-3 mr-0.5" />{refLat?.toFixed(5)}, {refLng?.toFixed(5)}
            </div>
            {refPattern.genera.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/15 p-2">
                <Globe className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                <div><span className="font-medium text-green-400">{t("generaLabel")}</span> <span className="text-foreground/80">{genusLine(refPattern.genera)}</span></div>
              </div>
            )}
            {refPattern.dominant_species && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/15 p-2">
                <Database className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div><span className="font-medium text-amber-400">{t("dominantLabel")}</span> <span className="text-foreground/80 font-medium">{refPattern.dominant_species}</span></div>
              </div>
            )}
            {refPattern.modis_class && (
              <div className="flex items-start gap-2 rounded-lg bg-purple-500/10 border border-purple-500/15 p-2">
                <Satellite className="h-3.5 w-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div><span className="font-medium text-purple-400">{t("modisLabel")}</span> <span className="text-foreground/80">{igbpLabel(refPattern.modis_class)}</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="mb-4">
        <ForestSearchMap
          step={step}
          refLat={refLat} refLng={refLng}
          searchLat={searchLat} searchLng={searchLng}
          radiusKm={radiusKm}
          matches={step === "results" ? matches : []}
          onClick={handleMapClick}
        />
      </div>

      {/* Step: reference */}
      {step === "reference" && (
        <div className="space-y-3">
          {refLat !== null && refLng !== null ? (
            <div className="rounded-xl border border-border bg-white/5 p-4">
              <p className="mb-2 text-sm"><MapPin className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />{t("pointCoords", { lat: refLat.toFixed(5), lng: refLng.toFixed(5) })}</p>
              <p className="mb-3 text-xs text-muted-foreground">{t("refHint")}</p>
              <button
                onClick={() => { setStep("search"); }}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <Trees className="h-4 w-4" /> {t("useAsRef")}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">{t("clickRefHint")}</p>
          )}
        </div>
      )}

      {/* Step: search */}
      {step === "search" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium">
              {t("radiusLabel", { km: units.isImperial ? units.fmtDist(radiusKm) : radiusKm, unit: units.distUnit })}
              <span className="ml-2 text-xs text-muted-foreground font-normal">{t("tokensInParens", { cost: tokenCost, tokens: tokPlural(tokenCost, t, locale) })}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => {
                const cost = Math.max(1, Math.ceil(r / 2));
                return (
                  <button key={r} onClick={() => setRadiusKm(r)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${radiusKm === r ? "bg-emerald-600 text-white" : "bg-white/10 text-muted-foreground hover:bg-white/20"}`}
                  >
                    {units.isImperial ? units.fmtDist(r) : r} {units.distUnit} <span className={`ml-1 text-[10px] ${radiusKm === r ? "text-white/70" : "text-muted-foreground/60"}`}>{t("tokenShort", { n: cost })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {searchLat !== null && searchLng !== null ? (
            <div className="rounded-xl border border-border bg-white/5 p-4">
              <p className="mb-2 text-sm"><Crosshair className="mr-1 inline h-3.5 w-3.5 text-blue-400" />{t("searchCenter", { lat: searchLat.toFixed(5), lng: searchLng.toFixed(5) })}</p>
              <button
                onClick={() => setShowSearchConfirm(true)}
                disabled={searching}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? t("analyzing") : t("findForest", { cost: tokenCost, tokens: tokPlural(tokenCost, t, locale) })}
              </button>
              {searching && (
                <p className="mt-2 text-xs text-muted-foreground">{t("searchProgress")}</p>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-2">{t("clickSearchHint")}</p>
          )}
        </div>
      )}

      {/* Step: results */}
      {step === "results" && (
        <div className="space-y-4">
          {stats && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{t("statPolygons", { n: stats.polygons })}</span>
              <span>{t("statMassifs", { n: stats.osmMassifs })}</span>
              <span>{t("statZones", { n: stats.scanZones })}</span>
              <span>{t("statResults", { n: matches.length })}</span>
              <button onClick={() => setStep("search")} className="ml-auto text-blue-400 hover:text-blue-300">{t("newSearch")}</button>
            </div>
          )}

          {matches.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-white/5 border-b border-border text-xs text-muted-foreground">
                {t("analyzedLine", { count: matches.length })}
              </div>
              <div className="divide-y divide-border/50">
                {visibleMatches.map((m, i) => {
                  const globalIdx = matches.indexOf(m);
                  const isSelected = selectedIdx === globalIdx;
                  const isDetailOpen = detailIdx === globalIdx;
                  const isSaved = savedSet.has(globalIdx);
                  const p = m.pattern;

                  return (
                    <div key={`${m.lat}-${m.lng}-${i}`}>
                      {/* Main row */}
                      <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 transition-colors ${isSelected ? "bg-white/5" : ""}`}>
                        <button onClick={() => setDetailIdx(isDetailOpen ? null : globalIdx)}
                          className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg flex-shrink-0 cursor-pointer transition-transform hover:scale-110 ${m.similarity >= 70 ? "bg-emerald-500/20" : m.similarity >= 40 ? "bg-amber-500/20" : "bg-gray-500/20"}`}
                          title={t("showDetails")}>
                          <span className={`text-xs sm:text-sm font-bold ${m.similarity >= 70 ? "text-emerald-400" : m.similarity >= 40 ? "text-amber-400" : "text-gray-400"}`}>{m.similarity}%</span>
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">{p.dominant_species || m.name || t("massifFallback", { n: i + 1 })}</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            {m.lat.toFixed(3)}, {m.lng.toFixed(3)}
                            {p.genera.length > 0 && <span className="ml-1 text-green-400">{t("generaCount", { n: p.genera.length })}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                          {p.dominant_species && <span className="hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-400">{t("fgisBadge")}</span>}
                          {p.modis_class && <span className="hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/15 text-purple-400">MODIS</span>}
                          <button onClick={() => saveAsLocation(globalIdx)} disabled={isSaved || saving}
                            className={`rounded-lg p-1.5 transition-colors ${isSaved ? "text-emerald-400" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`}
                            title={isSaved ? t("saved") : t("save")}>
                            {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isDetailOpen && (
                        <div className="mx-4 mb-2 space-y-2">
                          {/* Score breakdown */}
                          <div className="rounded-lg border border-border/50 bg-white/[0.02] overflow-hidden">
                            <div className="px-3 py-2 border-b border-border/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("scoreTitle", { pct: m.similarity, points: p.points_sampled })}
                            </div>
                            <ScoreRow label={t("scoreGeneraRow")} score={m.breakdown.genera_overlap.score} max={m.breakdown.genera_overlap.max} reason={formatReason(tReason, m.breakdown.genera_overlap)} color="green" />
                            <ScoreRow label={t("scoreDominantRow")} score={m.breakdown.dominant_species.score} max={m.breakdown.dominant_species.max} reason={formatReason(tReason, m.breakdown.dominant_species)} color="amber" />
                            <ScoreRow label={t("scoreForestRow")} score={m.breakdown.forest_type.score} max={m.breakdown.forest_type.max} reason={formatReason(tReason, m.breakdown.forest_type)} color="blue" />
                            <ScoreRow label={t("scoreModisRow")} score={m.breakdown.modis.score} max={m.breakdown.modis.max} reason={formatReason(tReason, m.breakdown.modis)} color="purple" />
                          </div>

                          {/* Data from all sources */}
                          {p.genera.length > 0 && (
                            <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/15 p-2">
                              <Globe className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs"><span className="font-medium text-green-400">{t("generaShort")}</span> <span className="text-foreground/80">{genusLine(p.genera)}</span></div>
                            </div>
                          )}
                          {p.fgis_species_list.length > 0 && (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/15 p-2">
                              <Database className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs"><span className="font-medium text-amber-400">{t("fgisSpecies")}</span> <span className="text-foreground/80">{p.fgis_species_list.join(", ")}</span></div>
                            </div>
                          )}
                          <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/15 p-2">
                            <MapPin className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs"><span className="font-medium text-blue-400">{t("forestTypeShort")}</span> <span className="text-foreground/80">{forestTypeLabel(p.forest_type)}</span></div>
                          </div>
                          {p.modis_class && (
                            <div className="flex items-start gap-2 rounded-lg bg-purple-500/10 border border-purple-500/15 p-2">
                              <Satellite className="h-3.5 w-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                              <div className="text-xs"><span className="font-medium text-purple-400">{t("modisLabel")}</span> <span className="text-foreground/80">{igbpLabel(p.modis_class)}</span>{p.modis_is_forest && <span className="text-emerald-400 ml-1">{t("modisForest")}</span>}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Weather button */}
                      <div className="px-4 pb-2">
                        <button onClick={() => fetchWeather(globalIdx)} disabled={weatherLoading && selectedIdx === globalIdx}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${isSelected && weather ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" : "bg-white/5 border border-border text-foreground/80 hover:bg-white/10"}`}>
                          {weatherLoading && selectedIdx === globalIdx ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("weatherLoading")}</>
                            : isSelected && weather ? <><ChevronUp className="h-4 w-4" /> {t("weatherHide")}</>
                            : <><CloudSun className="h-4 w-4" /> {t("weatherShow")}{!weatherLoadedSet.has(globalIdx) ? t("weatherCost") : ""}</>}
                        </button>
                      </div>

                      {/* Weather table */}
                      {isSelected && weather && (
                        <div className="px-2 sm:px-4 pb-3">
                          <div className="rounded-lg border border-border/50 overflow-x-auto">
                            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-0 text-[10px] sm:text-[11px] min-w-[360px]">
                              <div className="px-2 py-1.5 font-medium text-muted-foreground bg-white/5">{t("colDate")}</div>
                              <div className="px-2 py-1.5 font-medium text-muted-foreground bg-white/5 text-center"><Thermometer className="inline h-3 w-3 mr-0.5" />{t("colTemp", { u: units.tempUnit })}</div>
                              <div className="px-2 py-1.5 font-medium text-muted-foreground bg-white/5 text-center"><Droplets className="inline h-3 w-3 mr-0.5" />{t("colRain")}</div>
                              <div className="px-2 py-1.5 font-medium text-muted-foreground bg-white/5 text-center">{t("colHumidity")}</div>
                              <div className="px-2 py-1.5 font-medium text-muted-foreground bg-white/5 text-center"><Wind className="inline h-3 w-3 mr-0.5" />{t("colWind")}</div>
                              {weather.map((d) => <WeatherRow key={d.date} day={d} locale={locale} />)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {matches.length > 6 && (
                <button onClick={() => setExpanded((v) => !v)}
                  className="flex w-full items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground border-t border-border/50">
                  {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> {t("expandLess")}</> : <><ChevronDown className="h-3.5 w-3.5" /> {t("expandMore", { n: matches.length - 6 })}</>}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">{t("noMassifs", { km: units.isImperial ? units.fmtDist(radiusKm) : radiusKm, unit: units.distUnit })}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{t("noMassifsHint")}</p>
              <button onClick={() => setStep("search")} className="mt-3 text-sm text-blue-400 hover:text-blue-300">{t("newSearch")}</button>
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      <TokenConfirmModal
        open={showSearchConfirm}
        title={t("confirmSearchTitle")}
        description={t("confirmSearchDesc", { km: units.isImperial ? units.fmtDist(radiusKm) : radiusKm, unit: units.distUnit })}
        cost={tokenCost}
        balance={balance}
        loading={searching}
        onConfirm={runSearch}
        onCancel={() => setShowSearchConfirm(false)}
      />

      <TokenConfirmModal
        open={weatherConfirmIdx !== null}
        title={t("confirmWeatherTitle")}
        description={t("confirmWeatherDesc")}
        cost={TOKEN_COSTS.weather_check}
        balance={balance}
        loading={weatherLoading}
        onConfirm={() => {
          const idx = weatherConfirmIdx!;
          setWeatherConfirmIdx(null);
          doFetchWeather(idx);
        }}
        onCancel={() => setWeatherConfirmIdx(null)}
      />
    </div>
  );
}

function ScoreRow({ label, score, max, reason, color }: {
  label: string; score: number; max: number; reason: string; color: "green" | "amber" | "blue" | "purple";
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const barCls = { green: "bg-green-500", amber: "bg-amber-500", blue: "bg-blue-500", purple: "bg-purple-500" }[color];
  const textCls = { green: "text-green-400", amber: "text-amber-400", blue: "text-blue-400", purple: "text-purple-400" }[color];
  return (
    <div className="px-3 py-2 border-t border-border/20">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${textCls}`}>{label}</span>
        <span className="text-xs text-muted-foreground">{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 mb-1.5">
        <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{reason}</p>
    </div>
  );
}

function WeatherRow({
  day,
  locale,
}: {
  day: WeatherDay;
  locale: string;
}) {
  const units = useUnits();
  const date = new Date(day.date);
  const locTag = locale === "en" ? "en-US" : "ru-RU";
  const dayStr = date.toLocaleDateString(locTag, { day: "numeric", month: "short" });
  const weekday = date.toLocaleDateString(locTag, { weekday: "short" });
  // Пороги цветов — по метрическим значениям, независимо от отображаемых единиц
  const tempColor = day.temperature_mean > 20 ? "text-red-400" : day.temperature_mean > 10 ? "text-amber-400" : day.temperature_mean > 0 ? "text-blue-300" : "text-blue-500";
  const rainBg = day.rain_sum > 5 ? "bg-blue-500/20" : day.rain_sum > 0 ? "bg-blue-500/10" : "";
  return (
    <>
      <div className="px-2 py-1 border-t border-border/30 text-muted-foreground">
        <span className="font-medium text-foreground/80">{dayStr}</span>
        <span className="ml-1 text-[10px]">{weekday}</span>
      </div>
      <div className={`px-2 py-1 border-t border-border/30 text-center font-medium ${tempColor}`}>
        {day.temperature_mean != null ? units.fmtTemp(day.temperature_mean) : "—"}°
        <span className="text-[10px] text-muted-foreground ml-0.5">({day.temperature_min != null ? units.fmtTemp(day.temperature_min, 0) : "—"}…{day.temperature_max != null ? units.fmtTemp(day.temperature_max, 0) : "—"})</span>
      </div>
      <div className={`px-2 py-1 border-t border-border/30 text-center ${rainBg}`}>{day.rain_sum > 0 ? `${units.fmtPrecip(day.rain_sum)} ${units.precipUnit}` : "—"}</div>
      <div className="px-2 py-1 border-t border-border/30 text-center text-muted-foreground">{day.relative_humidity_mean != null ? `${Math.round(day.relative_humidity_mean)}%` : "—"}</div>
      <div className="px-2 py-1 border-t border-border/30 text-center text-muted-foreground">{day.wind_speed_max != null ? `${units.fmtWind(day.wind_speed_max, 0)} ${units.windUnit}` : "—"}</div>
    </>
  );
}
