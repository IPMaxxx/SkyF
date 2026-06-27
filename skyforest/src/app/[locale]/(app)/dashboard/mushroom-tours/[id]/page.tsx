"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useTokens } from "@/lib/TokenContext";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import type {
  MushroomTour,
  TourLeaderboardRow,
  TourMyParticipation,
} from "@/lib/supabase/types";
import {
  formatBidTime,
  formatCountdown,
  formatMoney,
  tourPhase,
  participantStatusKey,
} from "@/lib/tourFormat";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock,
  Sparkles,
  Users,
  Loader2,
  Gavel,
  Trophy,
  Hourglass,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

const TourMap = dynamic(() => import("@/components/app/TourMap").then((m) => m.TourMap), {
  ssr: false,
});

type Board = {
  success: boolean;
  spots: number;
  status: string;
  auction_start_at: string;
  auction_end_at: string;
  leaderboard: TourLeaderboardRow[];
  me: TourMyParticipation | null;
};

export default function AuctionHallPage() {
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations("mushroomTours");
  const locale = useLocale();
  const { balance, refresh } = useTokens();

  const [tour, setTour] = useState<MushroomTour | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const amountTouched = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tours/${id}`);
      const data = await res.json();
      if (res.ok) {
        setTour(data.tour);
        setBoard(data.board);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll the board while the auction is not finished
  const isFinished = board
    ? tourPhase({
        auction_start_at: board.auction_start_at,
        auction_end_at: board.auction_end_at,
        status: board.status as MushroomTour["status"],
      }) === "finished"
    : false;

  useEffect(() => {
    if (isFinished) return;
    const poll = setInterval(load, 4000);
    return () => clearInterval(poll);
  }, [isFinished, load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const minRequired = useMemo(() => {
    if (!tour) return 0;
    if (board?.me) return Number(board.me.best_amount) + Number(tour.bid_step);
    return Number(tour.start_price);
  }, [tour, board]);

  useEffect(() => {
    if (!amountTouched.current && minRequired > 0) {
      setAmount(String(minRequired));
    }
  }, [minRequired]);

  const phase = board
    ? tourPhase({
        auction_start_at: board.auction_start_at,
        auction_end_at: board.auction_end_at,
        status: board.status as MushroomTour["status"],
      })
    : "upcoming";

  const endMs = board ? new Date(board.auction_end_at).getTime() : 0;

  const submitBid = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tours/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error");
        return;
      }
      toast.success(t("bidPlaced"));
      amountTouched.current = false;
      await refresh();
      await load();
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const winnerAction = async (action: "confirm" | "decline") => {
    const res = await fetch(`/api/tours/${id}/${action}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Error");
      return;
    }
    toast.success(action === "confirm" ? t("confirmed") : t("declined"));
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!tour || !board) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="mb-4 text-muted-foreground">{t("loadError")}</p>
        <BackLink t={t} />
      </div>
    );
  }

  const greenZone = board.leaderboard.filter((r) => r.position <= board.spots);
  const waitlist = board.leaderboard.filter((r) => r.position > board.spots);
  const me = board.me;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <BackLink t={t} />

      <div className="mb-2 mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{tour.title}</h1>
        {phase === "live" ? (
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
            <Gavel className="h-4 w-4" />
            {t("auctionLive")}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            {t("auctionFinished")}
          </span>
        )}
      </div>

      {tour.description && (
        <p className="mb-4 text-sm text-muted-foreground">{tour.description}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: tour info + map */}
        <div className="space-y-3">
          {tour.mushroom_image_url && (
            <div className="overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tour.mushroom_image_url}
                alt={tour.mushroom_species ?? ""}
                className="h-56 w-full object-cover"
              />
            </div>
          )}
          {tour.departure_lat != null && tour.departure_lng != null && (
            <TourMap lat={tour.departure_lat} lng={tour.departure_lng} />
          )}
          <div className="glass space-y-2 rounded-2xl border border-border p-4 text-sm">
            {tour.mushroom_species && (
              <InfoRow icon={<Sparkles className="h-4 w-4 text-amber-400" />} label={t("mushroom")}>
                {tour.mushroom_species}
              </InfoRow>
            )}
            {tour.departure_desc && (
              <InfoRow icon={<MapPin className="h-4 w-4 text-emerald-400" />} label={t("departurePoint")}>
                {tour.departure_desc}
              </InfoRow>
            )}
            {tour.tour_date && (
              <InfoRow icon={<CalendarDays className="h-4 w-4 text-sky-400" />} label={t("tourDate")}>
                {new Date(tour.tour_date).toLocaleDateString()}
                {tour.departure_time ? ` · ${tour.departure_time.slice(0, 5)}` : ""}
              </InfoRow>
            )}
            <InfoRow icon={<Users className="h-4 w-4 text-purple-400" />} label={t("spots")}>
              {board.spots}
            </InfoRow>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{t("cashHint")}</span>
          </div>
        </div>

        {/* Right: auction controls */}
        <div className="space-y-3">
          {phase === "live" && (
            <div className="glass rounded-2xl border border-border p-4 text-center">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                {t("timeLeft")}
              </p>
              <p className="font-mono text-3xl font-bold text-emerald-400">
                {formatCountdown(endMs - now)}
              </p>
            </div>
          )}

          {/* My status banner after finish */}
          {phase === "finished" && me && (
            <MyResult me={me} tour={tour} t={t} onAction={winnerAction} now={now} />
          )}

          {/* Bid form (only while live) */}
          {phase === "live" && (
            <div className="glass rounded-2xl border border-border p-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("yourBid")}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                min={minRequired}
                step="0.01"
                onChange={(e) => {
                  amountTouched.current = true;
                  setAmount(e.target.value);
                }}
                placeholder={t("bidPlaceholder", { currency: tour.currency })}
                className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("minBid", { amount: minRequired, currency: tour.currency })}
              </p>
              <button
                type="button"
                disabled={Number(amount) < minRequired}
                onClick={() => setConfirmOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
              >
                <Gavel className="h-4 w-4" />
                {t("placeBid")}
              </button>
              {me && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {t("youAre", { no: me.participant_no })} ·{" "}
                  {formatMoney(me.best_amount, tour.currency)}
                  {me.best_amount_at ? ` · ${formatBidTime(me.best_amount_at, locale)}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Leaderboard */}
          <div className="glass rounded-2xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-400" />
              {t("leaderboard")}
            </p>

            {board.leaderboard.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("noBids")}</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-emerald-400">
                    {t("greenZone")} ({board.spots})
                  </p>
                  <div className="space-y-1">
                    {greenZone.map((row) => (
                      <BoardRow key={row.position} row={row} tour={tour} t={t} green />
                    ))}
                    {greenZone.length === 0 && (
                      <p className="text-xs text-muted-foreground">{t("noBids")}</p>
                    )}
                  </div>
                </div>
                {waitlist.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      {t("waitlist")}
                    </p>
                    <div className="space-y-1">
                      {waitlist.map((row) => (
                        <BoardRow key={row.position} row={row} tour={tour} t={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <TokenConfirmModal
        open={confirmOpen}
        title={t("placeBid")}
        description={`${tour.title} — ${formatMoney(Number(amount) || 0, tour.currency)}`}
        cost={1}
        balance={balance}
        loading={submitting}
        onConfirm={submitBid}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function BackLink({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <Link
      href="/dashboard/mushroom-tours"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("backToList")}
    </Link>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>
        <span className="text-muted-foreground">{label}: </span>
        {children}
      </span>
    </div>
  );
}

function BoardRow({
  row,
  tour,
  t,
  green,
}: {
  row: TourLeaderboardRow;
  tour: MushroomTour;
  t: ReturnType<typeof useTranslations>;
  green?: boolean;
}) {
  const locale = useLocale();
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
        row.is_me
          ? "bg-primary/20 ring-1 ring-primary/40"
          : green
            ? "bg-emerald-500/10"
            : "bg-white/5"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{row.position}.</span>
        <span className={row.is_me ? "font-semibold text-primary-light" : ""}>
          {row.is_me ? t("youAre", { no: row.participant_no }) : t("participant", { no: row.participant_no })}
        </span>
      </span>
      <span className="flex flex-col items-end leading-tight">
        <span className="font-semibold">{formatMoney(row.best_amount, tour.currency)}</span>
        {row.best_amount_at && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatBidTime(row.best_amount_at, locale)}
          </span>
        )}
      </span>
    </div>
  );
}

function MyResult({
  me,
  tour,
  t,
  onAction,
  now,
}: {
  me: TourMyParticipation;
  tour: MushroomTour;
  t: ReturnType<typeof useTranslations>;
  onAction: (a: "confirm" | "decline") => void;
  now: number;
}) {
  const deadlineMs = me.confirm_deadline ? new Date(me.confirm_deadline).getTime() : 0;
  const withinWindow = deadlineMs > now;

  if (me.status === "winner") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="mb-1 flex items-center gap-2 font-semibold text-emerald-300">
          <Trophy className="h-5 w-5" />
          {t("youWon")}
        </p>
        {me.confirm_deadline && (
          <p className="mb-3 text-xs text-muted-foreground">
            {t("confirmBy")}: {new Date(me.confirm_deadline).toLocaleString()}
            {withinWindow ? ` (${formatCountdown(deadlineMs - now)})` : ""}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAction("confirm")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("confirmBtn")}
          </button>
          <button
            type="button"
            onClick={() => onAction("decline")}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <XCircle className="h-4 w-4" />
            {t("declineBtn")}
          </button>
        </div>
      </div>
    );
  }

  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    waitlist: {
      icon: <Hourglass className="h-5 w-5" />,
      text: t("youWaitlisted"),
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    },
    confirmed: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      text: t("youConfirmed"),
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    },
    declined: {
      icon: <XCircle className="h-5 w-5" />,
      text: t("youDeclined"),
      cls: "border-border bg-card/60 text-muted-foreground",
    },
    expired: {
      icon: <XCircle className="h-5 w-5" />,
      text: t("youExpired"),
      cls: "border-border bg-card/60 text-muted-foreground",
    },
  };
  const m = map[me.status];
  if (!m) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        {t("youAre", { no: me.participant_no })} ·{" "}
        {formatMoney(me.best_amount, tour.currency)} · {t(participantStatusKey(me.status) as never)}
      </div>
    );
  }
  return (
    <div className={`rounded-2xl border p-4 ${m.cls}`}>
      <p className="flex items-center gap-2 font-semibold">
        {m.icon}
        {m.text}
      </p>
    </div>
  );
}
