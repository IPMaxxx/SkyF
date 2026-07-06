"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Location, ForestInfo } from "@/lib/supabase/types";
import { MapPin, Save, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";
import { DifficultySelect } from "@/components/app/DifficultySelect";
import { useAppData } from "@/lib/AppDataContext";
import type { LocationDifficulty } from "@/lib/supabase/types";
import { useLocale, useTranslations } from "next-intl";

function MapLoading() {
  const t = useTranslations("common");
  return (
    <div className="flex h-[400px] items-center justify-center rounded-xl bg-white/5">
      <p className="text-sm text-muted-foreground">{t("loadingMap")}</p>
    </div>
  );
}

const LocationPicker = dynamic(
  () => import("@/components/app/LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <MapLoading />,
  }
);

export default function EditLocationPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.locationForm");
  const tc = useTranslations("common");
  const params = useParams();
  const id = params.id as string;
  const { removeLocation, updateLocation: updateLocationCtx, refreshBestDays } = useAppData();

  const [location, setLocation] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<LocationDifficulty | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("locations")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (data) {
        setLocation(data);
        setName(data.name);
        setLat(data.lat);
        setLng(data.lng);
        setDifficulty(data.difficulty ?? null);
        setDescription(data.description ?? "");
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) { setError(t("errNameShort")); return; }
    if (lat === null || lng === null) { setError(t("errPointShort")); return; }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: dbErr } = await supabase
      .from("locations")
      .update({ name: name.trim(), lat, lng, difficulty, description: description.trim() || null })
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
        body: JSON.stringify({ type: "location", id }),
      });
    } catch { /* archive is best-effort */ }
    await supabase.from("locations").delete().eq("id", id);
    removeLocation(id);
    await refreshBestDays();
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

  if (!location) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
          {tc("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{t("editTitle")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("createdAt", { date: new Date(location.created_at).toLocaleDateString(locale) })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {t("nameLabel")}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <DifficultySelect value={difficulty} onChange={setDifficulty} />

        <div>
          <label htmlFor="loc-desc" className="mb-1.5 block text-sm font-medium">
            {t("descLabel")}
          </label>
          <textarea
            id="loc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("pointLabel")}</label>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("pointHintEdit")}
          </p>
          <LocationPicker lat={lat} lng={lng} onSelect={(la, ln) => { setLat(la); setLng(ln); }} />
          {lat !== null && lng !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("coords", { coords: `${lat.toFixed(6)}, ${lng.toFixed(6)}` })}
            </p>
          )}
        </div>

        {/* Forest Info */}
        {lat !== null && lng !== null && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("forestInfoLabel")}</label>
            <ForestInfoPanel
              lat={lat}
              lng={lng}
              forestInfo={location?.forest_info ?? null}
              onLoaded={(info: ForestInfo) => {
                updateLocationCtx(id, { forest_info: info });
                const supabase = createClient();
                supabase
                  .from("locations")
                  .update({ forest_info: info as unknown as Record<string, unknown> })
                  .eq("id", id)
                  .then();
              }}
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("saveChanges")}
        </button>

        <div className="border-t border-white/10 pt-4">
          {showDeleteConfirm ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="mb-3 text-sm text-red-400">
                {t("deleteConfirm", { name: location.name })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {t("yesDelete")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-red-500/10"
                >
                  {tc("cancel")}
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
              {t("deleteLocation")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
