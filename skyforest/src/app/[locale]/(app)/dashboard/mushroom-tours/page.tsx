"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { MushroomTour } from "@/lib/supabase/types";
import { tourPhase, formatCountdown, formatMoney } from "@/lib/tourFormat";
import {
  Ticket,
  MapPin,
  CalendarDays,
  Clock,
  Users,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { TourAdminPanel } from "@/components/app/TourAdminPanel";

export default function MushroomToursPage() {
  const t = useTranslations("mushroomTours");
  const [tours, setTours] = useState<MushroomTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tours");
      const data = await res.json();
      if (res.ok) setTours(data.tours ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const checkAdmin = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .single();
      if (data?.account_type === "admin") setIsAdmin(true);
    };
    checkAdmin();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2">
        <Ticket className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{t("cashHint")}</span>
      </div>

      {isAdmin && <TourAdminPanel onChange={load} />}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("loading")}
        </div>
      ) : tours.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 py-16 text-center text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tours.map((tour) => {
            const phase = tourPhase(tour);
            const startMs = new Date(tour.auction_start_at).getTime();
            const canEnter = phase === "live" || phase === "finished";
            return (
              <div
                key={tour.id}
                className="glass flex flex-col rounded-2xl border border-border p-5"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{tour.title}</h2>
                  <PhaseBadge phase={phase} t={t} />
                </div>

                {tour.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {tour.description}
                  </p>
                )}

                <div className="mb-4 space-y-1.5 text-sm">
                  {tour.mushroom_species && (
                    <Row icon={<Sparkles className="h-4 w-4 text-amber-400" />}>
                      <span className="text-muted-foreground">{t("mushroom")}:</span>{" "}
                      {tour.mushroom_species}
                    </Row>
                  )}
                  {tour.departure_desc && (
                    <Row icon={<MapPin className="h-4 w-4 text-emerald-400" />}>
                      {tour.departure_desc}
                    </Row>
                  )}
                  {tour.tour_date && (
                    <Row icon={<CalendarDays className="h-4 w-4 text-sky-400" />}>
                      {new Date(tour.tour_date).toLocaleDateString()}
                      {tour.departure_time ? ` · ${tour.departure_time.slice(0, 5)}` : ""}
                    </Row>
                  )}
                  <Row icon={<Users className="h-4 w-4 text-purple-400" />}>
                    {t("spots")}: {tour.spots}
                  </Row>
                  <Row icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
                    {t("startPrice")}: {formatMoney(tour.start_price, tour.currency)} ·{" "}
                    {t("bidStep")}: {formatMoney(tour.bid_step, tour.currency)}
                  </Row>
                </div>

                <div className="mt-auto">
                  {canEnter ? (
                    <Link
                      href={`/dashboard/mushroom-tours/${tour.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/20"
                    >
                      <Ticket className="h-4 w-4" />
                      {t("enterHall")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-border bg-card/60 py-3 text-center text-sm">
                      <span className="text-muted-foreground">{t("opensIn")}: </span>
                      <span className="font-mono font-semibold text-foreground">
                        {formatCountdown(startMs - now)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function PhaseBadge({
  phase,
  t,
}: {
  phase: "upcoming" | "live" | "finished";
  t: ReturnType<typeof useTranslations>;
}) {
  const map = {
    upcoming: { label: t("notStartedYet"), cls: "bg-sky-500/15 text-sky-300" },
    live: { label: t("auctionLive"), cls: "bg-emerald-500/15 text-emerald-300 animate-pulse" },
    finished: { label: t("auctionFinished"), cls: "bg-muted text-muted-foreground" },
  };
  const m = map[phase];
  return (
    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
