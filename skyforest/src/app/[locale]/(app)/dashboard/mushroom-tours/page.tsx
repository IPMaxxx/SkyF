"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  BookOpen,
  ChevronDown,
  Bell,
  BellRing,
  Eye,
} from "lucide-react";
import { TourAdminPanel } from "@/components/app/TourAdminPanel";

export default function MushroomToursPage() {
  const t = useTranslations("mushroomTours");
  const [tours, setTours] = useState<MushroomTour[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tours");
      const data = await res.json();
      if (res.ok) {
        setTours(data.tours ?? []);
        setFollowing(new Set<string>(data.following ?? []));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFollow = useCallback(
    async (tourId: string) => {
      const isFollowing = following.has(tourId);
      setFollowBusy(tourId);
      try {
        const res = await fetch(`/api/tours/${tourId}/follow`, {
          method: isFollowing ? "DELETE" : "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Error");
          return;
        }
        setFollowing((prev) => {
          const next = new Set(prev);
          if (isFollowing) next.delete(tourId);
          else next.add(tourId);
          return next;
        });
        setTours((prev) =>
          prev.map((tr) =>
            tr.id === tourId
              ? { ...tr, followers_count: Math.max(0, tr.followers_count + (isFollowing ? -1 : 1)) }
              : tr
          )
        );
        toast.success(t(isFollowing ? "unfollowed" : "followed"));
      } finally {
        setFollowBusy(null);
      }
    },
    [following, t]
  );

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

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{t("cashHint")}</span>
      </div>

      <AuctionRules t={t} />

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
            const startMs = tour.auction_start_at
              ? new Date(tour.auction_start_at).getTime()
              : 0;
            const canEnter = phase === "live" || phase === "finished";
            const isFollowing = following.has(tour.id);
            return (
              <div
                key={tour.id}
                className="glass flex flex-col overflow-hidden rounded-2xl border border-border p-5"
              >
                {tour.mushroom_image_url && (
                  <div className="relative -mx-5 -mt-5 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tour.mushroom_image_url}
                      alt={tour.mushroom_species ?? ""}
                      className="h-48 w-full object-cover"
                    />
                    <PhaseBadge phase={phase} t={t} className="absolute right-3 top-3" />
                  </div>
                )}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{tour.title}</h2>
                  {!tour.mushroom_image_url && <PhaseBadge phase={phase} t={t} />}
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
                  {phase !== "announced" && (
                    <Row icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
                      {t("startPrice")}: {formatMoney(tour.start_price, tour.currency)} ·{" "}
                      {t("bidStep")}: {formatMoney(tour.bid_step, tour.currency)}
                    </Row>
                  )}
                  <Row icon={<Eye className="h-4 w-4 text-muted-foreground" />}>
                    {t("followersLabel")}: {tour.followers_count}
                  </Row>
                </div>

                {phase === "announced" && (
                  <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-200">
                    {t("announcedHint")}
                  </div>
                )}

                <div className="mt-auto">
                  {phase === "announced" ? (
                    <FollowButton
                      following={isFollowing}
                      busy={followBusy === tour.id}
                      onClick={() => toggleFollow(tour.id)}
                      t={t}
                    />
                  ) : canEnter ? (
                    <Link
                      href={`/dashboard/mushroom-tours/${tour.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/20"
                    >
                      <Ticket className="h-4 w-4" />
                      {t("enterHall")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-border bg-card/60 py-3 text-center text-sm">
                        <span className="text-muted-foreground">{t("opensIn")}: </span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatCountdown(startMs - now)}
                        </span>
                      </div>
                      <FollowButton
                        following={isFollowing}
                        busy={followBusy === tour.id}
                        onClick={() => toggleFollow(tour.id)}
                        t={t}
                        subtle
                      />
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

function AuctionRules({ t }: { t: ReturnType<typeof useTranslations> }) {
  const items = t.raw("rulesItems") as string[];
  return (
    <details className="group mb-6 rounded-2xl border border-border bg-card/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          {t("rulesTitle")}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ol className="space-y-2.5 border-t border-border px-4 pb-4 pt-3 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary-light">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </details>
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

function FollowButton({
  following,
  busy,
  onClick,
  t,
  subtle,
}: {
  following: boolean;
  busy: boolean;
  onClick: () => void;
  t: ReturnType<typeof useTranslations>;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
        following
          ? "border border-border bg-card/60 text-muted-foreground hover:bg-white/5"
          : subtle
            ? "border border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
            : "bg-gradient-to-r from-sky-500 to-primary text-white hover:shadow-lg hover:shadow-primary/20"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <BellRing className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {following ? t("following") : t("follow")}
    </button>
  );
}

function PhaseBadge({
  phase,
  t,
  className = "",
}: {
  phase: "announced" | "upcoming" | "live" | "finished";
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  const map = {
    announced: { label: t("statusAnnounced"), cls: "bg-sky-500/15 text-sky-300" },
    upcoming: { label: t("notStartedYet"), cls: "bg-sky-500/15 text-sky-300" },
    live: { label: t("auctionLive"), cls: "bg-emerald-500/15 text-emerald-300 animate-pulse" },
    finished: { label: t("auctionFinished"), cls: "bg-muted text-muted-foreground" },
  };
  const m = map[phase];
  return (
    <span
      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium shadow ${m.cls} ${className}`}
    >
      {m.label}
    </span>
  );
}
