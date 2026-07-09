"use client";

/**
 * История завершённых походов на странице трека (виден без активного похода).
 *
 * Список из Supabase + локального fallback; тап по походу разворачивает
 * карту (TrackMap в режиме просмотра: без «я здесь» и линии возврата).
 * Удаление — в два тапа (второй тап по красной кнопке подтверждает).
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { History, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { useUnits } from "@/lib/units";
import {
  loadTrackHistory,
  deleteSavedTrack,
  type SavedTrack,
} from "@/lib/trackHistory";

const TrackMap = dynamic(
  () => import("@/components/app/TrackMap").then((m) => m.TrackMap),
  { ssr: false },
);

export function TrackHistory() {
  const t = useTranslations("track");
  const locale = useLocale();
  const units = useUnits();

  const [items, setItems] = useState<SavedTrack[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTrackHistory().then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const handleDelete = async (item: SavedTrack) => {
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(item.id);
    try {
      await deleteSavedTrack(item);
      setItems((cur) => (cur ? cur.filter((x) => x.id !== item.id) : cur));
      if (openId === item.id) setOpenId(null);
      toast.success(t("historyDeleted"));
    } catch {
      toast.error(t("historyDeleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDistance = units.fmtDistanceM;

  const formatDuration = (item: SavedTrack) => {
    const totalMin = Math.max(0, Math.round((item.finishedAt - item.startedAt) / 60_000));
    return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!items || items.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        {t("historyTitle")}
      </h2>

      <ul className="space-y-2">
        {items.map((item) => {
          const open = openId === item.id;
          return (
            <li key={item.id} className="rounded-xl bg-white/5">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg"
                >
                  <p className="truncate text-sm font-medium">
                    {item.name || formatDate(item.startedAt)}
                    {item.local && (
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground/70">
                        {t("historyLocalBadge")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(item.startedAt)} · {formatDistance(item.distanceM)} ·{" "}
                    {formatDuration(item)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item)}
                  disabled={deletingId === item.id}
                  aria-label={t("historyDelete")}
                  title={t("historyDelete")}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    confirmDeleteId === item.id
                      ? "bg-red-500/85 text-white"
                      : "text-muted-foreground hover:bg-white/10 hover:text-red-400"
                  }`}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {open && item.points.length > 0 && (
                <div className="px-3 pb-3">
                  <TrackMap
                    anchor={item.points[0]}
                    points={item.points.slice(1)}
                    current={null}
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground/70">{t("gapHint")}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
