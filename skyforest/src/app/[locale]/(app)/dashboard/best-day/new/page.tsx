"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MushroomSearch } from "@/components/app/MushroomSearch";
import { NewLocationModal } from "@/components/app/NewLocationModal";
import { WeatherChart } from "@/components/app/WeatherChart";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";
import type { Location, WeatherDay, ForestInfo } from "@/lib/supabase/types";
import { checkPhotoLocation } from "@/lib/photo-geo";
import { useTokens } from "@/lib/TokenContext";
import { useAppData } from "@/lib/AppDataContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { useUnits } from "@/lib/units";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  Star,
  ArrowLeft,
  Loader2,
  Save,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Camera,
  X,
  ImagePlus,
} from "lucide-react";

interface MushroomResult {
  inaturalist_id: number;
  latin_name: string;
  common_name: string | null;
  image_url: string | null;
}

export default function NewBestDayPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.bestDayForm");
  const tc = useTranslations("common");
  const units = useUnits();
  const { locations, loading: appLoading, addLocation, updateLocation, addBestDay } = useAppData();
  const [selectedLocId, setSelectedLocId] = useState("");
  const [name, setName] = useState("");
  const [bestDate, setBestDate] = useState("");
  const [mushroom, setMushroom] = useState<MushroomResult | null>(null);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [geoWarnings, setGeoWarnings] = useState<string[]>([]);
  const { balance, spend } = useTokens();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [savedBestDayId, setSavedBestDayId] = useState<string | null>(null);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [showConfirmGetData, setShowConfirmGetData] = useState(false);
  const loadingLocs = appLoading;

  useEffect(() => {
    if (!appLoading && locations.length > 0 && !selectedLocId) {
      setSelectedLocId(locations[0].id);
    }
  }, [appLoading, locations, selectedLocId]);

  const selectedLocation = locations.find((l) => l.id === selectedLocId);

  const todayStr = new Date().toISOString().split("T")[0];

  const requestGetData = () => {
    if (!name.trim()) {
      setError(t("errName"));
      return;
    }
    if (!selectedLocation || !selectedLocId) {
      setError(t("errLocation"));
      return;
    }
    if (!bestDate) {
      setError(t("errDate"));
      return;
    }
    const selected = new Date(`${bestDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(selected.getTime()) || selected.getTime() > today.getTime()) {
      setError(t("errDateFuture"));
      return;
    }
    if (!mushroom) {
      setError(t("errMushroom"));
      return;
    }
    setError("");
    setShowConfirmGetData(true);
  };

  const saveAfterWeather = async (days: WeatherDay[]) => {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(tc("authRequired"));
      setSaving(false);
      return;
    }

    const { data: existingMushroom } = await supabase
      .from("mushroom_species")
      .select("id")
      .eq("inaturalist_id", mushroom!.inaturalist_id)
      .single();

    let mushroomDbId: string;

    if (existingMushroom) {
      mushroomDbId = existingMushroom.id;
    } else {
      const { data: newMushroom, error: mErr } = await supabase
        .from("mushroom_species")
        .insert({
          inaturalist_id: mushroom!.inaturalist_id,
          latin_name: mushroom!.latin_name,
          common_name: mushroom!.common_name,
          image_url: mushroom!.image_url,
        })
        .select("id")
        .single();

      if (mErr || !newMushroom) {
        setError(t("errSaveMushroom") + (mErr?.message || ""));
        setSaving(false);
        return;
      }
      mushroomDbId = newMushroom.id;
    }

    const { data: newBd, error: bdErr } = await supabase.from("best_days").insert({
      user_id: user.id,
      location_id: selectedLocId,
      mushroom_id: mushroomDbId,
      name: name.trim(),
      best_date: bestDate,
      weather_data: days,
      photos,
    }).select("id, name, best_date, location_id, created_at").single();

    if (bdErr) {
      setError(bdErr.message);
      setSaving(false);
      return;
    }

    if (newBd) {
      const loc = locations.find((l) => l.id === selectedLocId);
      addBestDay({
        ...newBd,
        location: loc ? { id: loc.id, name: loc.name } : undefined,
        mushroom: mushroom
          ? {
              id: mushroomDbId,
              latin_name: mushroom.latin_name,
              common_name: mushroom.common_name,
              image_url: mushroom.image_url,
            }
          : undefined,
      } as never);
    }

    toast.success(t("toastSaved"));
    router.push("/dashboard");
    router.refresh();
  };

  const handleGetData = async () => {
    setShowConfirmGetData(false);
    if (!selectedLocation || !bestDate) return;

    setLoadingWeather(true);
    setError("");
    setWeatherDays([]);

    let days: WeatherDay[] | null = null;
    try {
      const res = await fetch(
        `/api/weather?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&date=${bestDate}&days=14`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || t("errWeatherLoad"));
        setLoadingWeather(false);
        return;
      }
      if (!Array.isArray(data.days) || data.days.length === 0) {
        setError(t("errWeatherFetch"));
        setLoadingWeather(false);
        return;
      }
      days = data.days as WeatherDay[];
    } catch {
      setError(t("errWeatherLoad"));
      setLoadingWeather(false);
      return;
    }

    // Списываем токены только после того, как погода успешно получена —
    // чтобы ошибка API (например, дата вне допустимого диапазона) не сжигала баланс.
    const spendResult = await spend("best_day_create", t("spendReason"));
    if (!spendResult.success) {
      setError(spendResult.error || t("errNotEnoughTokens"));
      setLoadingWeather(false);
      return;
    }
    toast.success(t("toastCharged", { n: TOKEN_COSTS.best_day_create }));

    setWeatherDays(days);
    try {
      await saveAfterWeather(days);
    } finally {
      setLoadingWeather(false);
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setError("");
    setGeoWarnings([]);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError(tc("authRequired")); setUploadingPhoto(false); return; }

    const tempId = savedBestDayId || "new";
    const newUrls: string[] = [];
    const warnings: string[] = [];

    for (const file of Array.from(files)) {
      if (selectedLocation) {
        const geoCheck = await checkPhotoLocation(file, selectedLocation.lat, selectedLocation.lng);
        if (!geoCheck.ok) {
          warnings.push(
            t("photoOtherLocation", {
              file: file.name,
              km: units.fmtDist(geoCheck.distance ?? 0, 0),
              unit: units.distUnit,
            })
          );
          continue;
        }
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${tempId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("best-day-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        setError(t("errUpload", { msg: uploadErr.message }));
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
    if (!name.trim()) {
      setError(t("errName"));
      return;
    }
    if (!selectedLocId) {
      setError(t("errLocation"));
      return;
    }
    if (!bestDate) {
      setError(t("errDate"));
      return;
    }
    if (!mushroom) {
      setError(t("errMushroom"));
      return;
    }
    if (weatherDays.length === 0) {
      setError(t("errWeatherFirst"));
      return;
    }
    setError("");
    await saveAfterWeather(weatherDays);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <Star className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight">{t("newTitle")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("newSubtitle")}
          </p>
        </div>
      </div>

      <div className="mb-4 sm:mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground/80">
          <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">{t("costBadge")}</span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Name */}
        <div className="glass rounded-2xl p-5">
          <label htmlFor="bd-name" className="mb-1.5 block text-sm font-medium">
            {t("nameLabel")}
          </label>
          <input
            id="bd-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Location — dropdown */}
        <div className="glass rounded-2xl p-5">
          <label htmlFor="bd-location" className="mb-1.5 block text-sm font-medium">{t("locationLabel")}</label>
          {loadingLocs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  className="w-full appearance-none rounded-xl border border-border bg-white py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {locations.length === 0 && <option value="" disabled>{t("noLocations")}</option>}
                  {locations.length > 0 && <option value="" disabled>{t("selectLocation")}</option>}
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
                    </option>
                  ))}
                  <option value="__new__">{t("createNewLocation")}</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Forest Info */}
        {selectedLocation && (
          <div className="glass rounded-2xl p-5">
            <label className="mb-1.5 block text-sm font-medium">{t("forestInfoLabel")}</label>
            <ForestInfoPanel
              lat={selectedLocation.lat}
              lng={selectedLocation.lng}
              forestInfo={selectedLocation.forest_info}
              onLoaded={(info: ForestInfo) => {
                updateLocation(selectedLocation.id, { forest_info: info });
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

        <NewLocationModal
          open={showNewLocation}
          onClose={() => setShowNewLocation(false)}
          onCreated={(loc) => {
            addLocation(loc);
            setSelectedLocId(loc.id);
          }}
        />

        {/* Date */}
        <div className="glass rounded-2xl p-5">
          <label htmlFor="bd-date" className="mb-1.5 block text-sm font-medium">
            {t("dateLabel")}
          </label>
          <input
            id="bd-date"
            type="date"
            value={bestDate}
            max={todayStr}
            onChange={(e) => setBestDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("dateHint")}
          </p>
        </div>

        {/* Mushroom */}
        <div className="glass rounded-2xl p-5">
          <label className="mb-2 block text-sm font-medium">
            {t("mushroomLabel")}
          </label>
          <MushroomSearch value={mushroom} onChange={setMushroom} />
        </div>

        {/* Photos */}
        <div className="glass rounded-2xl p-5">
          <label className="mb-2 block text-sm font-medium">
            <Camera className="mr-1 inline h-4 w-4" />
            {t("photosLabel")}
          </label>

          {photos.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photos.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl">
                  <img
                    src={url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                    onClick={() => setFullscreenPhoto(url)}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(url); }}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-lg sm:h-6 sm:w-6 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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
            {uploadingPhoto ? t("uploading") : t("addPhoto")}
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

        {/* Get Data */}
        <button
          type="button"
          onClick={requestGetData}
          disabled={loadingWeather || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {loadingWeather || saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {loadingWeather
            ? t("loadingWeather")
            : saving
              ? t("saving")
              : t("saveWeatherBtn", { n: TOKEN_COSTS.best_day_create })}
        </button>

        <TokenConfirmModal
          open={showConfirmGetData}
          title={t("confirmTitle")}
          description={t("confirmDesc")}
          cost={TOKEN_COSTS.best_day_create}
          balance={balance}
          loading={loadingWeather || saving}
          onConfirm={handleGetData}
          onCancel={() => setShowConfirmGetData(false)}
        />

        {/* Weather charts */}
        {weatherDays.length > 0 && <WeatherChart data={weatherDays} />}

        {/* Weather results */}
        {weatherDays.length > 0 && (
          <div className="overflow-hidden glass rounded-2xl">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-medium">
                {t("patternTitleNew", { n: weatherDays.length })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3 text-left">
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableDay")}</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableDate")}</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                      <Thermometer className="mr-0.5 inline h-3 w-3" /> {t("tableTMax")}
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableTMin")}</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                      <Droplets className="mr-0.5 inline h-3 w-3" /> {t("tableRain")}
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableTMean")}</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">{t("tableHumidity")}</th>
                    <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">
                      <Wind className="mr-0.5 inline h-3 w-3" /> {t("tableWind")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weatherDays.map((d, i) => (
                    <tr key={d.date} className={`border-b border-white/10 ${i === weatherDays.length - 1 ? "bg-amber-500/10 font-medium" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(d.date).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-3 py-2 text-red-400">
                        {d.temperature_max !== null ? `${units.fmtTemp(d.temperature_max)}°` : "—"}
                      </td>
                      <td className="px-3 py-2 text-blue-400">
                        {d.temperature_min !== null ? `${units.fmtTemp(d.temperature_min)}°` : "—"}
                      </td>
                      <td className="px-3 py-2">{units.fmtPrecip(d.rain_sum)} {units.precipUnit}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.temperature_mean !== null ? `${units.fmtTemp(d.temperature_mean)}°` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.relative_humidity_mean != null ? `${Math.round(d.relative_humidity_mean)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {d.wind_speed_max != null ? `${units.fmtWind(d.wind_speed_max, 0)} ${units.windUnit}` : "—"}
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
      </div>

      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            onClick={() => setFullscreenPhoto(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = photos.indexOf(fullscreenPhoto);
                  setFullscreenPhoto(photos[idx > 0 ? idx - 1 : photos.length - 1]);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = photos.indexOf(fullscreenPhoto);
                  setFullscreenPhoto(photos[idx < photos.length - 1 ? idx + 1 : 0]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                ›
              </button>
            </>
          )}
          <img
            src={fullscreenPhoto}
            alt=""
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
              {photos.indexOf(fullscreenPhoto) + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
