"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTokens } from "@/lib/TokenContext";
import { getSeasonLabel } from "@/lib/supabase/types";
import type { MarketplaceListing, Season, BestDay } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Loader2,
  Store,
  Coins,
  MapPin,
  Trees,
  User,
  X,
  ShoppingCart,
  Search,
  Crosshair,
  Star,
} from "lucide-react";

const MarketplaceSearchMap = dynamic(
  () =>
    import("@/components/app/MarketplaceSearchMap").then(
      (m) => m.MarketplaceSearchMap
    ),
  { ssr: false }
);

const SEASON_FILTERS: {
  value: Season | "all";
  label: string;
  color: string;
}[] = [
  { value: "all", label: "Все", color: "from-gray-500 to-gray-600" },
  { value: "winter", label: "Зима", color: "from-blue-400 to-blue-600" },
  { value: "spring", label: "Весна", color: "from-green-400 to-green-600" },
  { value: "summer", label: "Лето", color: "from-yellow-400 to-yellow-600" },
  { value: "autumn", label: "Осень", color: "from-orange-400 to-orange-600" },
];

const SEASON_COLORS: Record<string, string> = {
  winter: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  spring: "bg-green-500/15 text-green-400 border-green-500/20",
  summer: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  autumn: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const FOREST_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Любой лес" },
  { value: "coniferous", label: "Хвойный" },
  { value: "broadleaved", label: "Лиственный" },
  { value: "mixed", label: "Смешанный" },
];

const FOREST_TYPE_LABELS: Record<string, string> = {
  coniferous: "Хвойный",
  broadleaved: "Лиственный",
  mixed: "Смешанный",
  unknown: "Не определён",
};

interface MushroomOption {
  id: string;
  inaturalist_id: number | null;
  latin_name: string;
  common_name: string | null;
  image_url: string | null;
  count: number;
}

interface MushroomDetails {
  latin_name: string;
  common_name: string | null;
  wikipedia_summary: string | null;
  wikipedia_url: string | null;
  observations_count: number;
  photos: { url: string; attribution: string }[];
  taxonomy: {
    rank: string;
    rank_label: string;
    name: string;
    common_name: string | null;
  }[];
}

interface OwnedBestDay {
  lat: number;
  lng: number;
  name: string;
}

export default function MarketplacePage() {
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [ownedDays, setOwnedDays] = useState<OwnedBestDay[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<Season | "all">("all");
  const [mushroomFilter, setMushroomFilter] = useState<string>("all");
  const [forestFilter, setForestFilter] = useState<string>("all");
  const [buying, setBuying] = useState<string | null>(null);
  const [buyConfirm, setBuyConfirm] = useState<MarketplaceListing | null>(
    null
  );
  const [mushroomPreview, setMushroomPreview] = useState<MushroomOption | null>(
    null
  );
  const [mushroomDetails, setMushroomDetails] =
    useState<MushroomDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { balance, refresh } = useTokens();

  useEffect(() => {
    const loadOwned = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("best_days")
        .select("name, location:locations(lat, lng)")
        .eq("user_id", user.id);
      if (data) {
        const days: OwnedBestDay[] = [];
        for (const d of data) {
          const loc = d.location as unknown as { lat: number; lng: number } | null;
          if (loc) days.push({ lat: loc.lat, lng: loc.lng, name: d.name });
        }
        setOwnedDays(days);
      }
    };
    loadOwned();
  }, []);

  const handleSearch = async () => {
    if (centerLat === null || centerLng === null) {
      setError("Поставьте точку на карте");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    setSearched(true);
    try {
      const res = await fetch(
        `/api/marketplace/listings?lat=${centerLat}&lng=${centerLng}&radius_km=${radiusKm}`
      );
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch {
      setError("Ошибка поиска");
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(pos.coords.latitude);
        setCenterLng(pos.coords.longitude);
      },
      () => setError("Не удалось определить местоположение")
    );
  };

  const mushroomOptions = useMemo<MushroomOption[]>(() => {
    const map = new Map<string, MushroomOption>();
    for (const l of listings) {
      const m = l.best_day?.mushroom;
      if (!m) continue;
      const existing = map.get(m.id);
      if (existing) {
        existing.count++;
      } else {
        map.set(m.id, {
          id: m.id,
          inaturalist_id: m.inaturalist_id ?? null,
          latin_name: m.latin_name,
          common_name: m.common_name,
          image_url: m.image_url,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (seasonFilter !== "all" && l.season !== seasonFilter) return false;
      if (
        mushroomFilter !== "all" &&
        l.best_day?.mushroom?.id !== mushroomFilter
      )
        return false;
      if (forestFilter !== "all") {
        const ft = l.best_day?.location?.forest_info?.forest_type;
        if (ft !== forestFilter) return false;
      }
      return true;
    });
  }, [listings, seasonFilter, mushroomFilter, forestFilter]);

  const activeFilterCount =
    (seasonFilter !== "all" ? 1 : 0) +
    (mushroomFilter !== "all" ? 1 : 0) +
    (forestFilter !== "all" ? 1 : 0);

  const openMushroomPreview = async (m: MushroomOption) => {
    setMushroomPreview(m);
    setMushroomDetails(null);
    setPhotoIndex(0);
    if (!m.inaturalist_id) return;
    setDetailsLoading(true);
    try {
      const res = await fetch(
        `/api/mushrooms/details?inaturalist_id=${m.inaturalist_id}`
      );
      if (res.ok) setMushroomDetails(await res.json());
    } catch {
      /* noop */
    }
    setDetailsLoading(false);
  };

  const clearFilters = () => {
    setSeasonFilter("all");
    setMushroomFilter("all");
    setForestFilter("all");
  };

  const confirmBuy = async () => {
    if (!buyConfirm) return;
    setBuying(buyConfirm.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: buyConfirm.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка покупки");
        setBuying(null);
        setBuyConfirm(null);
        return;
      }
      setSuccess(
        `Best Day «${buyConfirm.best_day?.name}» успешно куплен! Он уже в вашем профиле.`
      );
      setBuyConfirm(null);
      await refresh();
      if (centerLat !== null && centerLng !== null) await handleSearch();
    } catch {
      setError("Ошибка сети");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Маркетплейс Best Days</h1>
          <p className="text-sm text-muted-foreground">
            Найдите проверенные грибные локации рядом с вами
          </p>
        </div>
      </div>

      {/* Search: map + controls */}
      <div className="glass rounded-2xl p-5 mb-6">
        <p className="mb-3 text-sm font-medium">
          Поставьте точку на карте и выберите радиус поиска
        </p>

        {/* Map */}
        <div className="mb-4 rounded-xl overflow-hidden border border-border">
          <MarketplaceSearchMap
            centerLat={centerLat}
            centerLng={centerLng}
            radiusKm={radiusKm}
            ownedDays={ownedDays}
            onSelect={(lat, lng) => {
              setCenterLat(lat);
              setCenterLng(lng);
            }}
          />
        </div>

        {/* Controls row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <button
            onClick={handleGeolocate}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Моё местоположение
          </button>

          <div className="flex-1 min-w-[180px]">
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Радиус поиска: <strong className="text-foreground">{radiusKm} км</strong>
            </label>
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full accent-primary h-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-0.5">
              <span>10 км</span>
              <span>150 км</span>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || centerLat === null}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Найти Best Days
          </button>
        </div>

        {centerLat !== null && centerLng !== null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Центр: {centerLat.toFixed(4)}, {centerLng.toFixed(4)} · Радиус:{" "}
            {radiusKm} км
          </p>
        )}

        {ownedDays.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400/70">
            <Star className="h-3 w-3" />
            Ваши Best Days отмечены на карте золотыми маркерами
          </p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-300 hover:text-red-200"
          >
            <X className="inline h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {success}
          <button
            onClick={() => setSuccess("")}
            className="ml-2 text-emerald-300 hover:text-emerald-200"
          >
            <X className="inline h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <>
          {listings.length > 0 && (
            <div className="mb-4 space-y-3">
              {/* Mushroom filter */}
              {mushroomOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Гриб
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => setMushroomFilter("all")}
                      className={`flex h-[72px] items-center rounded-2xl px-5 text-sm font-medium transition-all ${
                        mushroomFilter === "all"
                          ? "bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10"
                          : "glass text-muted-foreground hover:text-foreground hover:bg-white/10"
                      }`}
                    >
                      Все грибы
                    </button>
                    {mushroomOptions.map((m) => {
                      const isActive = mushroomFilter === m.id;
                      return (
                        <div
                          key={m.id}
                          className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2 transition-all cursor-pointer ${
                            isActive
                              ? "bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10"
                              : "glass text-muted-foreground hover:text-foreground hover:bg-white/10"
                          }`}
                          onClick={() =>
                            setMushroomFilter(isActive ? "all" : m.id)
                          }
                        >
                          {m.image_url ? (
                            <button
                              type="button"
                              className="relative flex-shrink-0 overflow-hidden rounded-xl focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMushroomPreview(m);
                              }}
                            >
                              <img
                                src={m.image_url}
                                alt={m.latin_name}
                                className="h-14 w-14 rounded-xl object-cover transition-transform group-hover:scale-105"
                              />
                            </button>
                          ) : (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-xl">
                              ★
                            </div>
                          )}
                          <div className="min-w-0 pr-1">
                            <p className="text-sm font-semibold leading-tight truncate max-w-[130px]">
                              {m.common_name || m.latin_name}
                            </p>
                            {m.common_name && (
                              <p className="text-[11px] italic text-muted-foreground/60 truncate max-w-[130px]">
                                {m.latin_name}
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {m.count}{" "}
                              {m.count === 1
                                ? "предложение"
                                : m.count < 5
                                ? "предложения"
                                : "предложений"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Season + Forest type */}
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Сезон
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SEASON_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setSeasonFilter(f.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          seasonFilter === f.value
                            ? `bg-gradient-to-r ${f.color} text-white shadow-md`
                            : "glass text-muted-foreground hover:text-foreground hover:bg-white/10"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Тип леса
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {FOREST_TYPE_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setForestFilter(f.value)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          forestFilter === f.value
                            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                            : "glass text-muted-foreground hover:text-foreground hover:bg-white/10"
                        }`}
                      >
                        {f.value !== "all" && <Trees className="h-3 w-3" />}
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Сбросить ({activeFilterCount})
                    </button>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Store className="h-3.5 w-3.5" />
                    {filteredListings.length} предложений
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Listing cards */}
          {filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl glass py-12">
              <Store className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Нет предложений в радиусе {radiusKm} км
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Попробуйте увеличить радиус или сместить точку
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredListings.map((listing) => {
                const bd = listing.best_day;
                const loc = bd?.location;
                const mushroom = bd?.mushroom;
                const seller = listing.seller;
                return (
                  <div
                    key={listing.id}
                    className="glass rounded-xl p-4 transition-all hover:bg-glass-hover"
                  >
                    <div className="flex items-start gap-3">
                      {mushroom?.image_url ? (
                        <img
                          src={mushroom.image_url}
                          alt={mushroom.latin_name}
                          className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                          <span className="text-xl">★</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{bd?.name}</p>
                        {mushroom && (
                          <p className="truncate text-xs italic text-muted-foreground/70">
                            {mushroom.common_name || mushroom.latin_name}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                              SEASON_COLORS[listing.season] ?? ""
                            }`}
                          >
                            {getSeasonLabel(listing.season)}
                          </span>
                          {loc?.forest_info?.forest_type && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Trees className="h-3 w-3" />
                              {FOREST_TYPE_LABELS[
                                loc.forest_info.forest_type
                              ] ?? "Лес"}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-sm font-bold text-amber-400">
                        <Coins className="h-3.5 w-3.5" />
                        {listing.price}
                      </span>
                    </div>
                    {bd?.photos && bd.photos.length > 0 && (
                      <div className="mt-3 flex gap-1.5 overflow-x-auto">
                        {bd.photos.slice(0, 4).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-16 w-20 flex-shrink-0 rounded-lg object-cover"
                          />
                        ))}
                        {bd.photos.length > 4 && (
                          <div className="flex h-16 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs text-muted-foreground">
                            +{bd.photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {seller?.full_name || "Пользователь"}
                      </span>
                      <button
                        onClick={() => setBuyConfirm(listing)}
                        disabled={buying === listing.id}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {buying === listing.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3.5 w-3.5" />
                        )}
                        Купить · {listing.price} т.
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!searched && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl glass py-12">
          <MapPin className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Поставьте точку на карте и нажмите «Найти Best Days»
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Мы покажем доступные предложения в вашем радиусе
          </p>
        </div>
      )}

      {/* Mushroom preview modal */}
      {mushroomPreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMushroomPreview(null)}
          />
          <div className="relative z-[10000] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a2a1f]/95 border border-white/10 shadow-2xl backdrop-blur-xl">
            {(() => {
              const photos =
                mushroomDetails?.photos && mushroomDetails.photos.length > 0
                  ? mushroomDetails.photos
                  : mushroomPreview.image_url
                  ? [{ url: mushroomPreview.image_url, attribution: "" }]
                  : [];
              if (photos.length === 0) return null;
              const current = photos[photoIndex] || photos[0];
              return (
                <div className="relative">
                  <img
                    src={current.url}
                    alt={mushroomPreview.latin_name}
                    className="h-72 w-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setPhotoIndex((i) =>
                            i > 0 ? i - 1 : photos.length - 1
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() =>
                          setPhotoIndex((i) =>
                            i < photos.length - 1 ? i + 1 : 0
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {photos.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPhotoIndex(i)}
                            className={`h-1.5 rounded-full transition-all ${
                              i === photoIndex
                                ? "w-4 bg-white"
                                : "w-1.5 bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="p-5">
              <h3 className="text-lg font-bold">
                {mushroomDetails?.common_name ||
                  mushroomPreview.common_name ||
                  mushroomPreview.latin_name}
              </h3>
              <p className="mt-0.5 text-sm italic text-muted-foreground">
                {mushroomPreview.latin_name}
              </p>
              {detailsLoading && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Загрузка данных из iNaturalist...
                </div>
              )}
              {mushroomDetails?.wikipedia_summary && (
                <div className="mt-4">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {mushroomDetails.wikipedia_summary}
                  </p>
                  {mushroomDetails.wikipedia_url && (
                    <a
                      href={mushroomDetails.wikipedia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Читать на Wikipedia →
                    </a>
                  )}
                </div>
              )}
              {mushroomDetails?.taxonomy &&
                mushroomDetails.taxonomy.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Таксономия
                    </p>
                    <div className="space-y-1">
                      {mushroomDetails.taxonomy.map((t) => (
                        <div
                          key={t.rank}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="w-20 flex-shrink-0 text-right text-muted-foreground">
                            {t.rank_label}
                          </span>
                          <span className="h-px flex-1 bg-white/10" />
                          <span className="font-medium italic">{t.name}</span>
                          {t.common_name && (
                            <span className="text-muted-foreground">
                              ({t.common_name})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-muted-foreground">
                  {mushroomPreview.count} на маркетплейсе
                </span>
                <button
                  onClick={() => {
                    setMushroomFilter(mushroomPreview.id);
                    setMushroomPreview(null);
                    setMushroomDetails(null);
                  }}
                  className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
                >
                  Показать все
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setMushroomPreview(null);
                setMushroomDetails(null);
              }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Buy confirmation modal */}
      {buyConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setBuyConfirm(null)}
          />
          <div className="relative z-[10000] w-full max-w-sm rounded-2xl bg-[#1a2a1f]/95 border border-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-3 text-lg font-bold">Подтвердить покупку</h3>
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">
                {buyConfirm.best_day?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {buyConfirm.best_day?.location?.name} ·{" "}
                {getSeasonLabel(buyConfirm.season)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg font-bold text-amber-400">
                  {buyConfirm.price}
                </span>
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">токенов</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Ваш баланс: <strong>{balance ?? 0}</strong> токенов
              </p>
              {(balance ?? 0) < buyConfirm.price && (
                <p className="mt-1 text-xs text-red-400">
                  Недостаточно токенов.{" "}
                  <Link
                    href="/payment"
                    className="underline hover:text-red-300"
                  >
                    Пополнить
                  </Link>
                </p>
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
              После покупки вы получите полные данные: точные координаты, дату и
              погодный паттерн. Best Day будет добавлен в ваш профиль.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBuyConfirm(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
              >
                Отмена
              </button>
              <button
                onClick={confirmBuy}
                disabled={
                  buying !== null || (balance ?? 0) < buyConfirm.price
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {buying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Купить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
