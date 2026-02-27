"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/lib/supabase/types";
import { MapPin, Save, Loader2, X } from "lucide-react";

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

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (location: Location) => void;
}

export function NewLocationModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      .insert({ user_id: user.id, name: name.trim(), lat, lng })
      .select("*")
      .single();

    if (dbError || !data) {
      setError(dbError?.message || "Ошибка сохранения");
      setSaving(false);
      return;
    }

    setName("");
    setLat(null);
    setLng(null);
    setError("");
    setSaving(false);
    onCreated(data as Location);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Точка на карте</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Кликните на карту, чтобы поставить пин
            </p>
            <LocationPicker
              lat={lat}
              lng={lng}
              onSelect={(la, ln) => { setLat(la); setLng(ln); }}
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
