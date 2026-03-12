"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MushroomSearch } from "@/components/app/MushroomSearch";
import { WeatherChart } from "@/components/app/WeatherChart";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";
import type { Location, BestDay, WeatherDay, ForestInfo } from "@/lib/supabase/types";
import { getSeason, getSeasonLabel } from "@/lib/supabase/types";
import { useAppData } from "@/lib/AppDataContext";
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
  ShoppingCart,
  CloudSun,
} from "lucide-react";
import { toast } from "sonner";
import { SellBestDayModal } from "@/components/app/SellBestDayModal";
import { ListingChat } from "@/components/app/ListingChat";
import { checkPhotoLocation } from "@/lib/photo-geo";

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
  const { locations, removeBestDay } = useAppData();

  const [bestDay, setBestDay] = useState<BestDay | null>(null);
  const [selectedLocId, setSelectedLocId] = useState("");
  const [name, setName] = useState("");
  const [bestDate, setBestDate] = useState("");
  const [mushroom, setMushroom] = useState<MushroomResult | null>(null);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [geoWarnings, setGeoWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [activeListing, setActiveListing] = useState<{ id: string } | null>(null);
  const [delistLoading, setDelistLoading] = useState(false);
  const [chatListingId, setChatListingId] = useState<string | null>(null);
  const [creatingMonitor, setCreatingMonitor] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: bdRes } = await supabase
        .from("best_days")
        .select("*, location:locations(*), mushroom:mushroom_species(*)")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (bdRes) {
        const bd = bdRes as BestDay;
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

        if (bd.purchased_from_listing_id) {
          setChatListingId(bd.purchased_from_listing_id);
        } else {
          const { data: soldListing } = await supabase
            .from("marketplace_listings")
            .select("id")
            .eq("best_day_id", id)
            .eq("seller_id", user.id)
            .eq("status", "sold")
            .order("sold_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (soldListing) setChatListingId(soldListing.id);
        }
      }

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

  const handleCreateMonitor = async () => {
    if (!bestDay) return;
    setCreatingMonitor(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Необходимо авторизоваться"); setCreatingMonitor(false); return; }

      const loc = locations.find((l) => l.id === bestDay.location_id);
      const defaultWeights = {
        rain_sum: 30,
        temperature_mean: 25,
        temperature_min: 10,
        temperature_max: 10,
        wind_speed_max: 10,
        relative_humidity_mean: 15,
      };

      const { data, error: dbErr } = await supabase.from("auto_compares").insert({
        user_id: user.id,
        best_day_id: bestDay.id,
        location_id: bestDay.location_id,
        name: `${bestDay.name || "Грибной день"} → ${loc?.name || "Локация"}`,
        enabled: false,
        run_time: "08:00:00",
        weights: defaultWeights,
      }).select("id").single();

      if (dbErr) { toast.error(dbErr.message); setCreatingMonitor(false); return; }
      if (data) {
        toast.success("Мониторинг создан");
        router.push(`/dashboard/compare?open=${data.id}`);
      }
    } catch {
      toast.error("Ошибка создания мониторинга");
    }
    setCreatingMonitor(false);
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocId);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setError("");
    setGeoWarnings([]);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Необходимо авторизоваться"); setUploadingPhoto(false); return; }

    const newUrls: string[] = [];
    const warnings: string[] = [];

    for (const file of Array.from(files)) {
      if (selectedLocation) {
        const geoCheck = await checkPhotoLocation(file, selectedLocation.lat, selectedLocation.lng);
        if (!geoCheck.ok) {
          warnings.push(
            `${file.name}: фото из другой локации (${geoCheck.distance} км от указанной точки)`
          );
          continue;
        }
      }

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

    if (warnings.length > 0) setGeoWarnings(warnings);
    if (newUrls.length > 0) setPhotos((prev) => [...prev, ...newUrls]);
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
    try {
      await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "best_day", id }),
      });
    } catch { /* archive is best-effort */ }
    if (photos.length > 0 && !bestDay?.purchased_from_listing_id) {
      const paths = photos
        .map((url) => url.split("/best-day-photos/")[1])
        .filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("best-day-photos").remove(paths);
      }
    }
    await supabase.from("best_days").delete().eq("id", id);
    removeBestDay(id);
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
          Назад
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <Star className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Редактировать грибной день</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Создан {new Date(bestDay.created_at).toLocaleDateString("ru-RU")}
          </p>
        </div>
      </div>

      {/* Purchased badge */}
      {bestDay?.purchased_from_listing_id && (
        <div className="mb-4 sm:mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 sm:px-4 py-3">
            <ShoppingCart className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-blue-300">Куплено на маркетплейсе</span>
            <span className="ml-auto text-[11px] sm:text-xs text-muted-foreground">Перепродажа недоступна</span>
          </div>
          <button
            onClick={handleCreateMonitor}
            disabled={creatingMonitor}
            className="glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-violet-400 transition-all hover:bg-violet-500/10 disabled:opacity-50"
          >
            {creatingMonitor ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudSun className="h-4 w-4" />}
            Мониторинг погоды
          </button>
        </div>
      )}

      {/* Chat with buyer/seller */}
      {chatListingId && (
        <div className="mb-5">
          <ListingChat listingId={chatListingId} />
        </div>
      )}

      {/* Marketplace sell/delist (hidden for purchased days) */}
      {!bestDay?.purchased_from_listing_id && (
        <div className="mb-5">
          {activeListing ? (
            <div className="glass flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-emerald-400">
                  На маркетплейсе
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
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowSellModal(true)}
                className="glass flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/10"
              >
                <Store className="h-4 w-4" />
                Продать на маркетплейсе
              </button>
              <button
                onClick={handleCreateMonitor}
                disabled={creatingMonitor}
                className="glass flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-violet-400 transition-all hover:bg-violet-500/10 disabled:opacity-50"
              >
                {creatingMonitor ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudSun className="h-4 w-4" />}
                Мониторинг погоды
              </button>
            </div>
          )}
        </div>
      )}

      {bestDay && !bestDay.purchased_from_listing_id && (
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Локация</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm text-foreground/70">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                {selectedLocation?.name || "—"}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {bestDay?.purchased_from_listing_id ? "Сезон" : "Дата лучшего дня"}
              </label>
              <div className="rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm text-foreground/70">
                {bestDay?.purchased_from_listing_id
                  ? getSeasonLabel(getSeason(bestDate))
                  : bestDate
                    ? new Date(bestDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Основной гриб</label>
            <MushroomSearch value={mushroom} onChange={setMushroom} />
          </div>
        </div>

        {/* Weather pattern */}
        <div className="glass rounded-2xl p-5">
          <p className="mb-3 text-sm font-medium">Погодный паттерн</p>
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
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photos.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl">
                  <img src={url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
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

          {geoWarnings.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              {geoWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}
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
                      <Droplets className="mr-0.5 inline h-3 w-3" /> Дождь
                    </th>
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
              Удалить грибной день
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
