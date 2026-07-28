"use client";

/**
 * История походов WayBack — отдельный экран.
 *
 * В отличие от SkyForest здесь обязательно есть пустое состояние: поход —
 * единственный сценарий приложения, и исчезающий блок читался бы как поломка.
 * Удаление в два тапа сохранено: промах по корзине в лесу стоит дорого.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { useUnits } from "@/lib/units";
import {
  loadTrackHistory,
  deleteSavedTrack,
  type SavedTrack,
} from "@/lib/trackHistory";
import {
  WbPrimaryButton,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

const TrackMap = dynamic(
  () => import("@/components/app/TrackMap").then((m) => m.TrackMap),
  { ssr: false },
);

export function WayBackHistoryScreen({
  onBack,
  onStart,
  onCountChange,
}: {
  onBack: () => void;
  onStart: () => void;
  onCountChange?: (count: number) => void;
}) {
  const t = useTranslations("wayback.history");
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
      if (cancelled) return;
      setItems(list);
      onCountChange?.(list.length);
    });
    return () => {
      cancelled = true;
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
    // Список грузим один раз на открытие экрана.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (item: SavedTrack) => {
    // Первый тап — предупреждение на 3 с, второй — удаление.
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
      setItems((cur) => {
        const next = cur ? cur.filter((x) => x.id !== item.id) : cur;
        if (next) onCountChange?.(next.length);
        return next;
      });
      if (openId === item.id) setOpenId(null);
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (item: SavedTrack) => {
    const totalMin = Math.max(
      0,
      Math.round((item.finishedAt - item.startedAt) / 60_000),
    );
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h} h ${m} m` : `${m} m`;
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "long" });

  const hasLocal = Boolean(items?.some((i) => i.local));

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
      <WbTopBar
        title={t("title")}
        onBack={onBack}
        trailing={
          items && items.length > 0 ? (
            <span className="wb-mono flex-none text-[12.5px] text-wb-muted-2">
              {t("count", { count: items.length })}
            </span>
          ) : undefined
        }
      />

      {!items ? (
        <div className="flex justify-center py-16">
          <Loader2
            className="h-6 w-6 animate-spin text-wb-primary"
            aria-hidden="true"
          />
        </div>
      ) : items.length === 0 ? (
        <WbTile className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <span
            className="mb-1 flex h-14 w-14 items-center justify-center rounded-[20px] bg-wb-primary-tint"
            aria-hidden="true"
          >
            <span className="h-4 w-4 rounded-[5px] bg-wb-muted-3" />
          </span>
          <h2 className="text-[20px] font-extrabold text-wb-ink">
            {t("emptyTitle")}
          </h2>
          <p className="text-[14px] font-medium leading-[1.5] text-wb-muted">
            {t("emptyBody")}
          </p>
          <WbPrimaryButton className="mt-2" onClick={onStart}>
            {t("emptyAction")}
          </WbPrimaryButton>
        </WbTile>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const open = openId === item.id;
            const confirming = confirmDeleteId === item.id;
            return (
              <WbTile key={item.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="min-w-0 flex-1 rounded-[12px] text-left"
                  >
                    <p className="truncate text-[16px] font-extrabold text-wb-ink">
                      {item.name || formatDate(item.startedAt)}
                    </p>
                    <p className="wb-mono mt-1 text-[12.5px] text-wb-muted-2">
                      {t("meta", {
                        duration: formatDuration(item),
                        distance: units.fmtDistanceM(item.distanceM),
                      })}
                    </p>
                  </button>

                  {item.local && !confirming && (
                    <span className="wb-mono flex-none rounded-full bg-wb-primary-tint px-2.5 py-1 text-[11px] text-wb-primary">
                      {t("localBadge")}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    disabled={deletingId === item.id}
                    aria-label={t("delete")}
                    className={
                      confirming
                        ? "flex-none rounded-full bg-wb-danger-tint px-3 py-1.5 text-[12.5px] font-extrabold text-wb-danger"
                        : "flex h-8 w-8 flex-none items-center justify-center rounded-full text-wb-muted-3"
                    }
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : confirming ? (
                      t("deleteConfirm")
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {open && item.points.length > 0 && (
                  <div className="mt-3">
                    <TrackMap
                      anchor={item.points[0]}
                      points={item.points.slice(1)}
                      current={null}
                    />
                    <p className="wb-mono mt-2 text-[11.5px] text-wb-muted-2">
                      {t("points", { count: item.points.length })}
                    </p>
                  </div>
                )}
              </WbTile>
            );
          })}

          {hasLocal && (
            <WbTile tone="tint" className="px-5 py-4">
              <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
                {t("localNote")}
              </p>
            </WbTile>
          )}
        </div>
      )}
    </div>
  );
}
