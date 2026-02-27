"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MushroomSearch } from "@/components/app/MushroomSearch";
import { NewLocationModal } from "@/components/app/NewLocationModal";
import { WeatherChart } from "@/components/app/WeatherChart";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";
import type { Location, BestDay, WeatherDay, ForestInfo } from "@/lib/supabase/types";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import {
  Star,
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Camera,
  X,
  ImagePlus,
  Store,
  XCircle,
} from "lucide-react";
import { SellBestDayModal } from "@/components/app/SellBestDayModal";

interface MushroomResult {
  inaturalist_id: number;
  latin_name: string;
  common_name: string | null;
  image_url: string | null;
}

export default function EditBestDayPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [bestDay, setBestDay] = useState<BestDay | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocId, setSelectedLocId] = useState("");
  const [name, setName] = useState("");
  const [bestDate, setBestDate] = useState("");
  const [mushroom, setMushroom] = useState<MushroomResult | null>(null);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const { balance, spend } = useTokens();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [activeListing, setActiveListing] = useState<{ id: string } | null>(null);
  const [delistLoading, setDelistLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [bdRes, locRes] = await Promise.all([
        supabase
          .from("best_days")
          .select("*, location:locations(*), mushroom:mushroom_species(*)")
          .eq("id", id)
          .single(),
        supabase.from("locations").select("*").order("created_at", { ascending: false }),
      ]);

      if (bdRes.data) {
        const bd = bdRes.data as BestDay;
        setBestDay(bd);
        setName(bd.name);
        setBestDate(bd.best_date);
        setSelectedLocId(bd.location_id);
        if (bd.weather_data) setWeatherDays(bd.weather_data);
        if (bd.photos) setPhotos(bd.photos);
        if (bd.mushroom) {
          setMushroom({
            inaturalist_id: bd.mushroom.inaturalist_id,
            latin_name: bd.mushroom.latin_name,
            common_name: bd.mushroom.common_name,
            image_url: bd.mushroom.image_url,
          });
        }
      }
      if (locRes.data) setLocations(locRes.data);

      const { data: listingData } = await supabase
        .from("marketplace_listings")
        .select("id")
        .eq("best_day_id", id)
        .eq("status", "active")
        .maybeSingle();
      if (listingData) setActiveListing(listingData);

      setLoading(false);
    };
    load();
  }, [id]);

  const handleDelist = async () => {
    if (!activeListing) return;
    setDelistLoading(true);
    try {
      const res = await fetch("/api/marketplace/delist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: activeListing.id }),
      });
      if (res.ok) {
        setActiveListing(null);
      }
    } catch { /* noop */ }
    setDelistLoading(false);
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocId);

  const handleReloadWeather = async () => {
    if (!selectedLocation || !bestDate) {
      setError("Выберите локацию и дату");
      return;
    }

    const spendResult = await spend("best_day_reload", "Перезагрузка погоды Best Day");
    if (!spendResult.success) {
      setError(spendResult.error || "Недостаточно токенов");
      return;
    }

    setLoadingWeather(true);
    setError("");
    try {
      const res = await fetch(
        `/api/weather?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&date=${bestDate}&days=14`
      );
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.days) setWeatherDays(data.days);
    } catch {
      setError("Ошибка загрузки данных о погоде");
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Необходимо авторизоваться"); setUploadingPhoto(false); return; }

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("best-day-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        setError(`Ошибка загрузки: ${uploadErr.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("best-day-photos")
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        newUrls.push(urlData.publicUrl);
      }
    }

    if (newUrls.length > 0) {
      setPhotos((prev) => [...prev, ...newUrls]);
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = async (url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
    const path = url.split("/best-day-photos/")[1];
    if (path) {
      const supabase = createClient();
      await supabase.storage.from("best-day-photos").remove([path]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Введите название"); return; }
    if (!selectedLocId) { setError("Выберите локацию"); return; }
    if (!bestDate) { setError("Укажите дату"); return; }
    if (!mushroom) { setError("Выберите гриб"); return; }

    setSaving(true);
    setError("");

    const supabase = createClient();

    const { data: existingM } = await supabase
      .from("mushroom_species")
      .select("id")
      .eq("inaturalist_id", mushroom.inaturalist_id)
      .single();

    let mushroomDbId: string;
    if (existingM) {
      mushroomDbId = existingM.id;
    } else {
      const { data: newM, error: mErr } = await supabase
        .from("mushroom_species")
        .insert({
          inaturalist_id: mushroom.inaturalist_id,
          latin_name: mushroom.latin_name,
          common_name: mushroom.common_name,
          image_url: mushroom.image_url,
        })
        .select("id")
        .single();
      if (mErr || !newM) {
        setError("Ошибка сохранения гриба: " + (mErr?.message || ""));
        setSaving(false);
        return;
      }
      mushroomDbId = newM.id;
    }

    const { error: dbErr } = await supabase
      .from("best_days")
      .update({
        name: name.trim(),
        location_id: selectedLocId,
        best_date: bestDate,
        mushroom_id: mushroomDbId,
        weather_data: weatherDays.length > 0 ? weatherDays : undefined,
        photos,
      })
      .eq("id", id);

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    router.push("/dashboard");
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    if (photos.length > 0) {
      const paths = photos
        .map((url) => url.split("/best-day-photos/")[1])
        .filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("best-day-photos").remove(paths);
      }
    }
    await supabase.from("best_days").delete().eq("id", id);
    router.push("/dashboard");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!bestDay) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-muted-foreground">Запись не найдена</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
          Назад к Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <Star className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Редактировать Best Day</h1>
          <p className="text-sm text-muted-foreground">
            Создан {new Date(bestDay.created_at).toLocaleDateString("ru-RU")}
          </p>
        </div>
      </div>

      {/* Marketplace sell/delist */}
      <div className="mb-5">
        {activeListing ? (
          <div className="glass flex items-center justify-between rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Выставлен на маркетплейсе
              </span>
            </div>
            <button
              onClick={handleDelist}
              disabled={delistLoading}
              className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              {delistLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Снять с продажи
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSellModal(true)}
            className="glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/10"
          >
            <Store className="h-4 w-4" />
            Продать на маркетплейсе
          </button>
        )}
      </div>

      {bestDay && (
        <SellBestDayModal
          open={showSellModal}
          onClose={() => setShowSellModal(false)}
          bestDay={bestDay}
          onListed={() => {
            setShowSellModal(false);
            setActiveListing({ id: "new" });
          }}
        />
      )}

      <div className="space-y-5">
        {/* Compact header: Name + Location + Date + Mushroom */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="bd-name" className="mb-1 block text-xs font-medium text-muted-foreground">Название</label>
            <input
              id="bd-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bd-location" className="mb-1 block text-xs font-medium text-muted-foreground">Локация</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="bd-location"
                  value={selectedLocId}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewLocation(true);
                      return;
                    }
                    setSelectedLocId(e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>Выберите</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                  <option value="__new__">+ Новая</option>
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="bd-date" className="mb-1 block text-xs font-medium text-muted-foreground">Дата лучшего дня</label>
              <input
                id="bd-date"
                type="date"
                value={bestDate}
                onChange={(e) => setBestDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Основной гриб</label>
            <MushroomSearch value={mushroom} onChange={setMushroom} />
          </div>
        </div>

        <NewLocationModal
          open={showNewLocation}
          onClose={() => setShowNewLocation(false)}
          onCreated={(loc) => {
            setLocations((prev) => [loc, ...prev]);
            setSelectedLocId(loc.id);
          }}
        />

        {/* Weather: reload button + charts + table */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Погодный паттерн</p>
            <button
              type="button"
              onClick={handleReloadWeather}
              disabled={loadingWeather || !selectedLocation || !bestDate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingWeather ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Thermometer className="h-3.5 w-3.5" />}
              Обновить · {TOKEN_COSTS.best_day_reload}т
            </button>
          </div>
          {weatherDays.length > 0 && <WeatherChart data={weatherDays} />}
        </div>

        {/* Forest Info */}
        {selectedLocation && (
          <div className="glass rounded-2xl p-5">
            <label className="mb-1.5 block text-sm font-medium">Информация о лесе</label>
            <ForestInfoPanel
              lat={selectedLocation.lat}
              lng={selectedLocation.lng}
              forestInfo={selectedLocation.forest_info}
              onLoaded={(info: ForestInfo) => {
                const supabase = createClient();
                supabase
                  .from("locations")
                  .update({ forest_info: info as unknown as Record<string, unknown> })
                  .eq("id", selectedLocation.id)
                  .then();
              }}
            />
          </div>
        )}

        {/* Photos */}
        <div className="glass rounded-2xl p-5">
          <label className="mb-2 block text-sm font-medium">
            <Camera className="mr-1 inline h-4 w-4" />
            Фото
          </label>

          {photos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadPhoto}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
          >
            {uploadingPhoto ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploadingPhoto ? "Загрузка..." : "Добавить фото"}
          </button>
        </div>

        {/* Weather table */}
        {weatherDays.length > 0 && (
          <div className="overflow-hidden glass rounded-2xl">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-medium">Погодный паттерн ({weatherDays.length} дней)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3 text-left">
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">День</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">Дата</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                      <Thermometer className="mr-0.5 inline h-3 w-3" /> t° макс
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">t° мин</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                      <Droplets className="mr-0.5 inline h-3 w-3" /> Осадки
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">Дождь</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">t° ср.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">Влажн.</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                      <Wind className="mr-0.5 inline h-3 w-3" /> Ветер
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weatherDays.map((d, i) => (
                    <tr key={d.date} className={`border-b border-white/10 ${i === weatherDays.length - 1 ? "bg-amber-500/10 font-medium" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-3 py-2 text-red-400">
                        {d.temperature_max !== null ? `${d.temperature_max.toFixed(1)}°` : "—"}
                      </td>
                      <td className="px-3 py-2 text-blue-400">
                        {d.temperature_min !== null ? `${d.temperature_min.toFixed(1)}°` : "—"}
                      </td>
                      <td className="px-3 py-2">{d.precipitation_sum.toFixed(1)} мм</td>
                      <td className="px-3 py-2">{d.rain_sum.toFixed(1)} мм</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.temperature_mean !== null ? `${d.temperature_mean.toFixed(1)}°` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.relative_humidity_mean != null ? `${Math.round(d.relative_humidity_mean)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.wind_speed_max != null ? `${d.wind_speed_max.toFixed(0)} км/ч` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить изменения
        </button>

        {/* Delete */}
        <div className="border-t border-white/10 pt-4">
          {showDeleteConfirm ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="mb-3 text-sm text-red-400">
                Удалить запись «{bestDay.name}»? Это действие необратимо.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-red-500/10"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Удалить Best Day
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
