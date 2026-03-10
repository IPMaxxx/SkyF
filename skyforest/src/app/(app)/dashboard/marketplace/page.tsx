"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTokens } from "@/lib/TokenContext";
import { getSeasonLabel } from "@/lib/supabase/types";
import type { MarketplaceListing, Season, BestDay } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UserName } from "@/components/app/UserName";
import {
  ArrowLeft,
  Loader2,
  Store,
  Coins,
  MapPin,
  User,
  X,
  ShoppingCart,
  Search,
  Crosshair,
  Star,
  Trees,
  Leaf,
  MessageCircle,
} from "lucide-react";
import { ListingChat } from "@/components/app/ListingChat";

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
  id: string;
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
  const [buying, setBuying] = useState<string | null>(null);
  const [buyConfirm, setBuyConfirm] = useState<MarketplaceListing | null>(
    null
  );
  const [listingPreview, setListingPreview] = useState<MarketplaceListing | null>(null);
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

      const { data: bdData } = await supabase
        .from("best_days")
        .select("id, name, location:locations(lat, lng)")
        .eq("user_id", user.id);

      if (bdData) {
        const days: OwnedBestDay[] = [];
        for (const d of bdData) {
          const loc = d.location as unknown as { lat: number; lng: number } | null;
          if (loc) days.push({ id: d.id, lat: loc.lat, lng: loc.lng, name: d.name });
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
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: centerLat,
          lng: centerLng,
          radius_km: radiusKm,
        }),
      });
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
      return true;
    });
  }, [listings, seasonFilter, mushroomFilter]);

  const activeFilterCount =
    (seasonFilter !== "all" ? 1 : 0) +
    (mushroomFilter !== "all" ? 1 : 0);

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
      const msg = `Грибной день «${buyConfirm.best_day?.name}» успешно куплен! Он уже в вашем профиле.`;
      setSuccess(msg);
      toast.success(msg);
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Маркетплейс</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Покупайте проверенные грибные места
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Здесь вы можете купить проверенные грибные локации других пользователей.
          Каждый лот содержит координаты, сезон, вид грибов, тип леса и погодные данные.
          Стоимость устанавливается продавцом.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground/80">
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">Поиск — бесплатно</span>
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">Покупка — цена продавца в токенах</span>
        </div>
      </div>

      {/* How to sell */}
      <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="mb-2 text-sm font-semibold text-emerald-400">Хотите продавать свои локации?</p>
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Создайте <strong>грибной день</strong> — укажите локацию, сезон и вид гриба</li>
          <li>Загрузите хотя бы одно <strong>фото</strong></li>
          <li>Нажмите <strong>«Продать на маркетплейсе»</strong> и укажите цену</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Комиссия за размещение — <strong className="text-amber-400">10 токенов</strong> (списывается сразу).
          Комиссия площадки с продажи — <strong className="text-amber-400">20%</strong> (удерживается при покупке).
          Цена продажи устанавливается вами, вы получаете 80% от указанной цены.
        </p>
      </div>


      {/* Search: map + controls */}
      <div className="glass rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6">
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
              max={1000}
              step={5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full accent-primary h-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-0.5">
              <span>10 км</span>
              <span>1000 км</span>
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
            Найти грибные локации
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
            Ваши грибные дни отмечены на карте золотыми маркерами
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
                  <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
                    <button
                      onClick={() => setMushroomFilter("all")}
                      className={`flex h-14 sm:h-[72px] items-center rounded-2xl px-4 sm:px-5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
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
                          className={`group relative flex items-center gap-2 sm:gap-3 rounded-2xl px-2.5 sm:px-3 py-2 transition-all cursor-pointer flex-shrink-0 ${
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
                                className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl object-cover transition-transform group-hover:scale-105"
                              />
                            </button>
                          ) : (
                            <div className="flex h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-xl">
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

              {/* Season */}
              <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-end sm:gap-6">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Сезон
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SEASON_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setSeasonFilter(f.value)}
                        className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all ${
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
                <div className="flex items-center gap-3 sm:ml-auto">
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
                const mushroom = bd?.mushroom;
                const seller = listing.seller;
                return (
                  <button
                    key={listing.id}
                    onClick={() => setListingPreview(listing)}
                    className="glass text-left rounded-xl p-4 transition-all hover:bg-glass-hover hover:shadow-lg hover:shadow-black/10"
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
                          {(() => {
                            const fi = bd?.forest_info as { forest_type?: string } | null;
                            if (!fi?.forest_type || fi.forest_type === "unknown") return null;
                            const labels: Record<string, string> = { coniferous: "Хвойный", broadleaved: "Лиственный", mixed: "Смешанный" };
                            return (
                              <span className="flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                                <Trees className="h-2.5 w-2.5" />
                                {labels[fi.forest_type] || fi.forest_type}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-sm font-bold text-amber-400">
                        <Coins className="h-3.5 w-3.5" />
                        {listing.price}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <UserName name={seller?.full_name} accountType={seller?.account_type} />
                    </div>
                  </button>
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
            Поставьте точку на карте и нажмите «Найти грибные локации»
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Мы покажем доступные предложения в вашем радиусе
          </p>
        </div>
      )}

      {/* Listing detail preview modal */}
      {listingPreview && (() => {
        const bd = listingPreview.best_day;
        const mushroom = bd?.mushroom;
        const previewPhoto = bd?.photos?.[0] ?? null;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setListingPreview(null)}
            />
            <div className="relative z-[10000] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a2a1f]/95 border border-white/10 shadow-2xl backdrop-blur-xl">
              {/* Photo preview */}
              {previewPhoto && (
                <div className="p-3 pb-0">
                  <img
                    src={previewPhoto}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-48 w-full rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  {mushroom?.image_url ? (
                    <img
                      src={mushroom.image_url}
                      alt={mushroom.latin_name}
                      className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-xl">
                      ★
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold">{bd?.name}</h3>
                    {mushroom && (
                      <p className="text-sm italic text-muted-foreground">
                        {mushroom.common_name || mushroom.latin_name}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-3 py-1.5 text-lg font-bold text-amber-400">
                    <Coins className="h-4 w-4" />
                    {listingPreview.price}
                  </span>
                </div>

                {/* Info rows */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Сезон:</span>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${SEASON_COLORS[listingPreview.season] ?? ""}`}>
                      {getSeasonLabel(listingPreview.season)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Продавец:</span>
                    <UserName name={listingPreview.seller?.full_name} accountType={listingPreview.seller?.account_type} className="font-medium" />
                  </div>
                </div>

                {/* Forest type (visible before purchase) */}
                {(() => {
                  const fi = bd?.forest_info as { forest_type?: string; leaf_cycle?: string; forest_name?: string | null; dominant_species?: { latin_name: string; common_name: string | null; image_url: string | null; source: string }[] } | null;
                  if (!fi) return null;
                  const FOREST_TYPE_LABELS: Record<string, string> = {
                    coniferous: "Хвойный лес",
                    broadleaved: "Лиственный лес",
                    mixed: "Смешанный лес",
                    unknown: "Лесная зона",
                  };
                  const FOREST_TYPE_COLORS: Record<string, string> = {
                    coniferous: "from-emerald-600 to-green-700",
                    broadleaved: "from-lime-500 to-green-600",
                    mixed: "from-teal-500 to-emerald-600",
                    unknown: "from-gray-500 to-gray-600",
                  };
                  const LEAF_CYCLE_LABELS: Record<string, string> = {
                    deciduous: "Листопадный",
                    evergreen: "Вечнозелёный",
                    mixed: "Смешанный",
                  };
                  const species = fi.dominant_species?.slice(0, 4) ?? [];
                  return (
                    <div className="rounded-xl border border-emerald-500/20 overflow-hidden mb-3">
                      <div className={`flex items-center gap-2 bg-gradient-to-r ${FOREST_TYPE_COLORS[fi.forest_type ?? "unknown"]} px-3 py-2.5`}>
                        <Trees className="h-4 w-4 text-white/90" />
                        <span className="text-sm font-semibold text-white">
                          {FOREST_TYPE_LABELS[fi.forest_type ?? "unknown"]}
                        </span>
                        {fi.leaf_cycle && fi.leaf_cycle !== "unknown" && (
                          <span className="flex items-center gap-1 text-[11px] text-white/70">
                            <Leaf className="h-3 w-3" />
                            {LEAF_CYCLE_LABELS[fi.leaf_cycle] ?? ""}
                          </span>
                        )}
                      </div>
                      {species.length > 0 && (
                        <div className="px-3 py-2 bg-emerald-500/5 space-y-1">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Породы деревьев
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {species.map((sp, i) => (
                              <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1">
                                {sp.image_url && (
                                  <img src={sp.image_url} alt="" className="h-5 w-5 rounded object-cover" />
                                )}
                                <span className="text-xs">{sp.common_name || sp.latin_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Hidden: Location coordinates */}
                <div className="relative rounded-xl border border-white/10 bg-white/5 p-4 mb-3 overflow-hidden">
                  <div className="blur-[6px] select-none pointer-events-none">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">XX.XXXX, XX.XXXX</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Координаты и название скрыты до покупки
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
                    <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-amber-400 backdrop-blur-sm">
                      🔒 Координаты откроются после покупки
                    </div>
                  </div>
                </div>

                {/* Blurred: Weather pattern */}
                <div className="relative rounded-xl border border-white/10 bg-white/5 p-4 mb-4 overflow-hidden">
                  <div className="blur-[6px] select-none pointer-events-none">
                    <p className="text-sm font-medium mb-2">Погодный паттерн (14 дней)</p>
                    <div className="flex gap-1">
                      {[28, 22, 35, 18, 40, 25, 30, 22, 38, 20, 32, 27, 35, 24].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded bg-blue-500/30"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>t° 12-18°C</span>
                      <span>Осадки: 23мм</span>
                      <span>Влажн: 78%</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
                    <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-amber-400 backdrop-blur-sm">
                      🔒 Откроется после покупки
                    </div>
                  </div>
                </div>

                {/* Pre-purchase chat */}
                <div className="mb-4">
                  <ListingChat
                    listingId={listingPreview.id}
                    sellerId={listingPreview.seller_id}
                    compact
                  />
                </div>

                {/* Buy button */}
                <button
                  onClick={() => {
                    setBuyConfirm(listingPreview);
                    setListingPreview(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Купить за {listingPreview.price} токенов
                </button>
              </div>

              <button
                onClick={() => setListingPreview(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}

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
                Анонимная локация · {getSeasonLabel(buyConfirm.season)}
              </p>
              <div className="mt-2 space-y-1.5 rounded-lg bg-white/5 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Стоимость</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-400">
                    -{buyConfirm.price} <Coins className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Текущий баланс</span>
                  <span className="font-semibold">{balance ?? 0}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                  <span className="text-muted-foreground">После операции</span>
                  <span className={`font-bold ${(balance ?? 0) - buyConfirm.price < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {(balance ?? 0) - buyConfirm.price}
                  </span>
                </div>
              </div>
              {(balance ?? 0) < buyConfirm.price && (
                <p className="mt-2 text-xs text-red-400">
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
              После покупки вы получите полные данные: точные координаты и
              погодный паттерн. Грибной день будет добавлен в ваш профиль.
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
