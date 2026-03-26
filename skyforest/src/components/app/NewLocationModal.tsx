"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/lib/supabase/types";
import { MapPin, Save, Loader2, X, Search } from "lucide-react";
import { DifficultySelect } from "@/components/app/DifficultySelect";
import type { LocationDifficulty } from "@/lib/supabase/types";

const LocationPicker = dynamic(
  () => import("@/components/app/LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center rounded-xl bg-white/5">
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
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    county?: string;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (location: Location) => void;
}

export function NewLocationModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [flyLat, setFlyLat] = useState<number | null>(null);
  const [flyLng, setFlyLng] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<LocationDifficulty | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchGeo = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query, format: "json", addressdetails: "1",
          limit: "5", "accept-language": "ru",
        })
      );
      const data: GeoResult[] = await res.json();
      setSearchResults(data);
      setShowResults(true);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 2) searchGeo(val.trim());
      else { setSearchResults([]); setShowResults(false); }
    }, 400);
  };

  const selectResult = (r: GeoResult) => {
    const rLat = parseFloat(r.lat);
    const rLng = parseFloat(r.lon);
    setLat(rLat); setLng(rLng);
    setFlyLat(rLat); setFlyLng(rLng);
    const addr = r.address;
    const locality = addr?.city || addr?.town || addr?.village || addr?.hamlet || "";
    const region = addr?.state || addr?.county || "";
    if (locality && !name) setName(locality + (region ? `, ${region}` : ""));
    setSearchQuery(""); setSearchResults([]); setShowResults(false);
  };

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) { setError("Введите название локации"); return; }
    if (lat === null || lng === null) { setError("Кликните на карту, чтобы выбрать точку"); return; }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Необходимо авторизоваться"); setSaving(false); return; }

    const { data, error: dbError } = await supabase
      .from("locations")
      .insert({ user_id: user.id, name: name.trim(), lat, lng, difficulty, description: description.trim() || null })
      .select("*")
      .single();

    if (dbError || !data) {
      setError(dbError?.message || "Ошибка сохранения");
      setSaving(false);
      return;
    }

    setName(""); setLat(null); setLng(null);
    setFlyLat(null); setFlyLng(null);
    setDifficulty(null); setDescription("");
    setError(""); setSaving(false);
    onCreated(data as Location);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 pb-8">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--color-glass-bg,#1a1a2e)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <MapPin className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold">Новая локация</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Geocoding search */}
          <div ref={searchRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium">Поиск по названию</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                placeholder="Город, деревня, улица..."
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {searchQuery && !searchLoading && (
                <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a2e1f]/98 shadow-2xl backdrop-blur-xl">
                {searchResults.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => selectResult(r)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <p className="truncate text-sm">{r.display_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="loc-name" className="mb-1.5 block text-sm font-medium">
              Название
            </label>
            <input
              id="loc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Лес у деревни Заречье"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <DifficultySelect value={difficulty} onChange={setDifficulty} />

          <div>
            <label htmlFor="modal-loc-desc" className="mb-1.5 block text-sm font-medium">
              Описание локации
            </label>
            <textarea
              id="modal-loc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите особенности: подъезд, тропы, ориентиры..."
              rows={2}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Точка на карте</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Найдите через поиск или кликните на карту
            </p>
            <LocationPicker
              lat={lat}
              lng={lng}
              flyToLat={flyLat}
              flyToLng={flyLng}
              flyToZoom={14}
              onSelect={(la, ln) => { setLat(la); setLng(ln); setFlyLat(la); setFlyLng(ln); }}
            />
            {lat !== null && lng !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Координаты: {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
