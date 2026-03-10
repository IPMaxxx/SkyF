"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Save, Loader2, ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";
import { useAppData } from "@/lib/AppDataContext";

const LocationPicker = dynamic(
  () =>
    import("@/components/app/LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-white/5">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    ),
  }
);

interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function NewLocationPage() {
  const router = useRouter();
  const { addLocation } = useAppData();
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [flyLat, setFlyLat] = useState<number | null>(null);
  const [flyLng, setFlyLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery.trim(), 400);

  const searchGeo = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "6",
          "accept-language": "ru",
        })
      );
      const data: GeoResult[] = await res.json();
      setSearchResults(data);
      setShowResults(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchGeo(debouncedQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery, searchGeo]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectGeoResult = (result: GeoResult) => {
    const rLat = parseFloat(result.lat);
    const rLng = parseFloat(result.lon);
    setLat(rLat);
    setLng(rLng);
    setFlyLat(rLat);
    setFlyLng(rLng);

    const addr = result.address;
    const locality = addr?.city || addr?.town || addr?.village || addr?.hamlet || "";
    const region = addr?.state || addr?.county || "";
    if (locality && !name) {
      setName(locality + (region ? `, ${region}` : ""));
    }

    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const formatResult = (r: GeoResult) => {
    const parts = r.display_name.split(", ");
    if (parts.length > 3) {
      return parts.slice(0, 3).join(", ");
    }
    return r.display_name;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Введите название локации");
      return;
    }
    if (lat === null || lng === null) {
      setError("Кликните на карту, чтобы выбрать точку");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Необходимо авторизоваться");
      setSaving(false);
      return;
    }

    const { data: newLoc, error: dbError } = await supabase
      .from("locations")
      .insert({
        user_id: user.id,
        name: name.trim(),
        lat,
        lng,
      })
      .select("id, name, lat, lng, created_at")
      .single();

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    if (newLoc) addLocation(newLoc as never);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="mb-4 sm:mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Добавить локацию</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Укажите место, где вы ходите за грибами
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 sm:mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Локация — это точка на карте, где вы обычно ходите за грибами.
          Добавьте её один раз, и потом сможете отслеживать погоду и сравнивать условия.
        </p>
        <div className="mt-2">
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">Бесплатно</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Geocoding search */}
        <div ref={searchRef} className="relative">
          <label className="mb-1.5 block text-sm font-medium">
            Поиск по названию
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
              placeholder="Город, деревня, улица..."
              className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a2e1f]/98 shadow-2xl backdrop-blur-xl">
              {searchResults.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => selectGeoResult(r)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {formatResult(r)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.display_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && !searchLoading && debouncedQuery.length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-white/10 bg-[#1a2e1f]/98 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <p className="text-sm text-muted-foreground">Ничего не найдено</p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Название локации
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Лес у деревни Заречье"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Точка на карте
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Найдите место через поиск или кликните на карту, чтобы поставить пин
          </p>
          <LocationPicker
            lat={lat}
            lng={lng}
            flyToLat={flyLat}
            flyToLng={flyLng}
            flyToZoom={14}
            onSelect={(la, ln) => {
              setLat(la);
              setLng(ln);
              setFlyLat(la);
              setFlyLng(ln);
            }}
          />
          {lat !== null && lng !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Координаты: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Forest Info Preview */}
        {lat !== null && lng !== null && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Информация о лесе</label>
            <ForestInfoPanel lat={lat} lng={lng} forestInfo={null} />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Сохранить локацию · Бесплатно
        </button>
      </div>
    </div>
  );
}
