import type { MushroomTour, TourParticipantStatus } from "@/lib/supabase/types";

export type TourPhase = "upcoming" | "live" | "finished";

/** Current auction phase based on timestamps + status. */
export function tourPhase(tour: Pick<MushroomTour, "auction_start_at" | "auction_end_at" | "status">): TourPhase {
  if (tour.status === "finished") return "finished";
  const now = Date.now();
  const start = new Date(tour.auction_start_at).getTime();
  const end = new Date(tour.auction_end_at).getTime();
  if (now < start) return "upcoming";
  if (now >= end) return "finished";
  return "live";
}

/** Human-friendly countdown like "2д 03:14:09" / "03:14:09" for a positive ms span. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return days > 0 ? `${days}д ${hms}` : hms;
}

/** Compact local date+time for a bid timestamp, e.g. "27.06 19:42". */
export function formatBidTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(amount: number, currency: string): string {
  const n = Number(amount);
  const value = Number.isInteger(n) ? n.toString() : n.toFixed(2);
  return `${value} ${currency}`;
}

const PARTICIPANT_STATUS_KEY: Record<TourParticipantStatus, string> = {
  bidding: "statusBidding",
  winner: "statusWinner",
  waitlist: "statusWaitlist",
  confirmed: "statusConfirmed",
  declined: "statusDeclined",
  no_show: "statusNoShow",
  expired: "statusExpired",
};

export function participantStatusKey(status: TourParticipantStatus): string {
  return PARTICIPANT_STATUS_KEY[status] ?? "statusBidding";
}
