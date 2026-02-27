"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  CloudSun,
  Star,
  ChevronRight,
  Plus,
  GitCompareArrows,
  AlertCircle,
  Trees,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Location, BestDay } from "@/lib/supabase/types";

export default function DashboardPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [bestDays, setBestDays] = useState<BestDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const [locRes, bdRes] = await Promise.all([
      supabase.from("locations").select("*").order("created_at", { ascending: false }),
      supabase
        .from("best_days")
        .select("*, location:locations(*), mushroom:mushroom_species(*)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    if (locRes.data) setLocations(locRes.data);
    if (bdRes.data) setBestDays(bdRes.data);
    setLoading(false);
  };

  const hasLocations = locations.length > 0;
  const hasBestDays = bestDays.length > 0;

  const mainCards = [
    {
      title: "Погода",
      desc: "Архив погоды за 14 дней и карта осадков",
      icon: CloudSun,
      href: "/dashboard/weather",
      color: "from-blue-500 to-cyan-600",
      iconBg: "from-blue-500/20 to-cyan-500/20",
      needsLocation: true,
    },
    {
      title: "Сравнения",
      desc: "Мониторинг совпадения погоды с эталоном по локациям",
      icon: GitCompareArrows,
      href: "/dashboard/compare",
      color: "from-violet-500 to-purple-600",
      iconBg: "from-violet-500/20 to-purple-500/20",
      needsBestDay: true,
    },
    {
      title: "Поиск леса",
      desc: "Найти участки с таким же типом леса и породами деревьев",
      icon: Trees,
      href: "/dashboard/forest-search",
      color: "from-emerald-500 to-teal-600",
      iconBg: "from-emerald-500/20 to-teal-500/20",
    },
    {
      title: "Маркетплейс Best Days",
      desc: "Покупайте и продавайте проверенные грибные локации",
      icon: Store,
      href: "/dashboard/marketplace",
      color: "from-pink-500 to-rose-600",
      iconBg: "from-pink-500/20 to-rose-500/20",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Инструменты для поиска грибных мест
        </p>
      </div>

      {/* Main cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {mainCards.map((card) => {
          const blocked =
            (card.needsLocation && !hasLocations) ||
            (card.needsBestDay && !hasBestDays);

          if (blocked) {
            return (
              <div
                key={card.title}
                className="glass relative overflow-hidden rounded-2xl p-6"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white opacity-30`}
                >
                  <card.icon className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground/40">
                  {card.title}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground/50">
                  {card.desc}
                </p>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {card.needsLocation && !hasLocations
                      ? "Сначала добавьте локацию"
                      : "Сначала создайте лучший день"}
                  </div>
                  <Link
                    href={
                      card.needsLocation && !hasLocations
                        ? "/dashboard/locations/new"
                        : "/dashboard/best-day/new"
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500"
                  >
                    <Plus className="h-3 w-3" />
                    {card.needsLocation && !hasLocations
                      ? "Добавить локацию"
                      : "Создать Best Day"}
                  </Link>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={card.title}
              href={card.href}
              className="glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:bg-glass-hover hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div
                className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}
              >
                <card.icon className="h-6 w-6" />
              </div>
              <h2 className="relative mb-2 text-lg font-semibold">{card.title}</h2>
              <p className="relative text-sm leading-relaxed text-muted-foreground">
                {card.desc}
              </p>
              <ChevronRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>

      {/* Quick action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/locations/new"
          className="glass inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-glass-hover"
        >
          <MapPin className="h-4 w-4 text-emerald-400" />
          Добавить локацию
          {hasLocations && (
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
              {locations.length}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/best-day/new"
          className={`glass inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-glass-hover ${
            !hasLocations ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <Star className="h-4 w-4 text-amber-400" />
          Добавить лучший день
          {hasBestDays && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
              {bestDays.length}
            </span>
          )}
        </Link>
      </div>

      {/* Best days */}
      {hasBestDays && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Лучшие дни</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {bestDays.map((bd) => (
              <Link
                key={bd.id}
                href={`/dashboard/best-day/${bd.id}`}
                className="glass flex items-center gap-3 rounded-xl p-4 transition-all hover:bg-glass-hover hover:shadow-md hover:shadow-black/10"
              >
                {bd.mushroom?.image_url ? (
                  <img
                    src={bd.mushroom.image_url}
                    alt={bd.mushroom.latin_name}
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <Star className="h-5 w-5 text-amber-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{bd.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {bd.location?.name} &middot;{" "}
                    {new Date(bd.best_date).toLocaleDateString("ru-RU")}
                  </p>
                  {bd.mushroom && (
                    <p className="truncate text-xs italic text-muted-foreground/70">
                      {bd.mushroom.latin_name}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Locations — compact chips */}
      {hasLocations && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Мои локации</h2>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => (
              <Link
                key={loc.id}
                href={`/dashboard/locations/${loc.id}`}
                className="glass inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all hover:bg-glass-hover hover:shadow-md hover:shadow-black/10"
              >
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                <span className="font-medium">{loc.name}</span>
                <span className="text-xs text-muted-foreground">
                  {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
