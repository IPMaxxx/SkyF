"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ForestInfoPanel } from "@/components/app/ForestInfoPanel";

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

export default function NewLocationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    const { error: dbError } = await supabase.from("locations").insert({
      user_id: user.id,
      name: name.trim(),
      lat,
      lng,
    });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Dashboard
      </Link>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Добавить локацию</h1>
            <p className="text-sm text-muted-foreground">
              Шаг 1: Укажите название и кликните на карту
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
            Кликните на карту, чтобы поставить пин
          </p>
          <LocationPicker lat={lat} lng={lng} onSelect={(la, ln) => { setLat(la); setLng(ln); }} />
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
          Сохранить локацию
        </button>
      </div>
    </div>
  );
}
