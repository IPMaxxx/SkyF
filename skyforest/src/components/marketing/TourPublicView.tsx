"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  MapPin,
  CalendarDays,
  Clock,
  Sparkles,
  Users,
  Gavel,
  ArrowRight,
} from "lucide-react";
import type { MushroomTour } from "@/lib/supabase/types";
import { formatCountdown, tourPhase } from "@/lib/tourFormat";

const TourMap = dynamic(() => import("@/components/app/TourMap").then((m) => m.TourMap), {
  ssr: false,
});

export function TourPublicView({ tour }: { tour: MushroomTour }) {
  const t = useTranslations("mushroomTours");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const phase = tourPhase(tour);
  const startMs = new Date(tour.auction_start_at).getTime();
  const endMs = new Date(tour.auction_end_at).getTime();

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const noteByPhase = {
    upcoming: t("public.upcomingNote"),
    live: t("public.liveNote"),
    finished: t("public.finishedNote"),
  }[phase];

  const facts: { icon: typeof MapPin; label: string; value: string }[] = [];
  if (tour.mushroom_species)
    facts.push({ icon: Sparkles, label: t("mushroom"), value: tour.mushroom_species });
  if (tour.tour_date)
    facts.push({
      icon: CalendarDays,
      label: t("tourDate"),
      value: new Date(tour.tour_date).toLocaleDateString(
        locale === "en" ? "en-GB" : "ru-RU"
      ),
    });
  if (tour.departure_time)
    facts.push({
      icon: Clock,
      label: t("departureTime"),
      value: tour.departure_time.slice(0, 5),
    });
  facts.push({ icon: Users, label: t("public.spotsLine"), value: String(tour.spots) });

  return (
    <div className="space-y-6">
      {tour.mushroom_image_url && (
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tour.mushroom_image_url}
            alt={tour.mushroom_species ?? ""}
            className="h-64 w-full object-cover sm:h-80"
          />
        </div>
      )}

      {tour.description && (
        <p className="whitespace-pre-line text-sm text-muted-foreground sm:text-base">
          {tour.description}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="glass flex items-center gap-3 rounded-2xl p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <f.icon className="h-5 w-5 text-primary-light" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="truncate font-medium">{f.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Auction window + countdown */}
      <div className="glass rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("public.auctionStarts")}</p>
            <p className="font-medium">{dateFmt(tour.auction_start_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("public.auctionEnds")}</p>
            <p className="font-medium">{dateFmt(tour.auction_end_at)}</p>
          </div>
        </div>

        {phase === "upcoming" && (
          <div className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{t("public.startsIn")}</p>
            <p className="font-mono text-2xl font-bold text-primary-light">
              {formatCountdown(startMs - now)}
            </p>
          </div>
        )}
        {phase === "live" && (
          <div className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-center">
            <p className="text-xs text-emerald-300/80">{t("timeLeft")}</p>
            <p className="font-mono text-2xl font-bold text-emerald-400">
              {formatCountdown(endMs - now)}
            </p>
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">{noteByPhase}</p>
      </div>

      {/* Departure point map */}
      {tour.departure_lat != null && tour.departure_lng != null && (
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-amber-400" aria-hidden="true" />
            {t("departurePoint")}
          </h2>
          {tour.departure_desc && (
            <p className="mb-3 text-sm text-muted-foreground">{tour.departure_desc}</p>
          )}
          <TourMap lat={tour.departure_lat} lng={tour.departure_lng} />
        </div>
      )}

      {/* CTA */}
      <div className="glass rounded-2xl p-6 text-center">
        <Link
          href={`/dashboard/mushroom-tours/${tour.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          <Gavel className="h-4 w-4" aria-hidden="true" />
          {t("public.join")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">{t("public.loginHint")}</p>
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-semibold">{t("public.howTitle")}</h2>
        <div className="space-y-3">
          {[t("public.how1"), t("public.how2"), t("public.how3")].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-light">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("cashHint")}</p>
      </div>
    </div>
  );
}
