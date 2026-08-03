"use client";

/**
 * Главный экран WayBack в системе «Widget Board».
 *
 * Три состояния на одном маршруте: похода нет, поход идёт, подтверждение
 * выхода. Офлайн-карта и история — отдельные экраны (в дизайне это не блоки
 * на главной), переключаются нижним меню и через history.state — так работает
 * системная кнопка «назад» и в браузере, и в нативной оболочке.
 *
 * Кнопка старта намеренно самая крупная на экране: её жмут на опушке, на
 * ходу и в перчатках.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useUnits } from "@/lib/units";
import { listRegions } from "@/lib/offline/tileStore";
import { loadTrackHistory } from "@/lib/trackHistory";
import { useWaybackAccount } from "@/lib/wayback/useWaybackAccount";
import type { TrackController } from "@/lib/track/useTrackController";
import type { Coords } from "@/lib/native/geolocation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  WbDangerSoftButton,
  WbLabel,
  WbModal,
  WbPrimaryButton,
  WbQuietButton,
  WbRowTile,
  WbStatTile,
  WbTile,
} from "@/components/wayback/primitives";
import { WayBackMenu } from "@/components/wayback/WayBackMenu";
import { WayBackTabBar } from "@/components/wayback/WayBackTabBar";
import { WayBackOfflineScreen } from "@/components/wayback/WayBackOfflineScreen";
import { WayBackHistoryScreen } from "@/components/wayback/WayBackHistoryScreen";
import { WayBackRecordingStatus } from "@/components/wayback/WayBackRecordingStatus";

const TrackMap = dynamic(
  () => import("@/components/app/TrackMap").then((m) => m.TrackMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

const WayBackPicker = dynamic(
  () =>
    import("@/components/wayback/WayBackPicker").then((m) => m.WayBackPicker),
  { ssr: false },
);

/**
 * Карта «где я сейчас» на главной. Скелет повторяет её размеры один в один
 * (плитка 10 + карта 220 + подпись 34), иначе экран дёрнется при загрузке.
 */
const WayBackHomeMap = dynamic(
  () =>
    import("@/components/wayback/WayBackHomeMap").then((m) => m.WayBackHomeMap),
  { ssr: false, loading: () => <HomeMapSkeleton /> },
);

function MapSkeleton() {
  return (
    <div className="wb-map-stripes h-[220px] w-full animate-pulse rounded-[20px]" />
  );
}

function HomeMapSkeleton() {
  return (
    <div className="wb-tile p-2.5">
      <MapSkeleton />
      <div className="min-h-[34px] pt-2.5" />
    </div>
  );
}

/**
 * Стрелка возврата: наконечник строго вверх (0° = «прямо»). Иконка Navigation
 * у Lucide смотрит в верхний правый угол и даёт визуальный сдвиг, поэтому
 * рисуем свою. Поворот — CSS-transform родителя.
 */
function ReturnArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-[72px] w-[72px]" aria-hidden="true">
      <path
        d="M12 2 L20 20 L12 15.5 L4 20 Z"
        fill="var(--color-wb-primary)"
        stroke="var(--color-wb-primary)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type View = "home" | "offline" | "history";

export function WayBackTrackScreen({ c }: { c: TrackController }) {
  const t = useTranslations("wayback");
  const units = useUnits();

  const [view, setView] = useState<View>("home");
  /** Вид карты, с которым открыть выбор области: приходит с карты главной. */
  const [areaView, setAreaView] = useState<{
    center: Coords;
    zoom: number;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Офлайн-экран ушёл в полноэкранный выбор области — нижнее меню прячем. */
  const [areaFullscreen, setAreaFullscreen] = useState(false);
  const [regionCount, setRegionCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const { signedIn, loading: accountLoading } = useWaybackAccount();

  // Счётчики для плиток на главной. Читаются с устройства, поэтому только
  // после монтирования. Пересчитываем при завершении похода — тогда в истории
  // появляется запись.
  const hasActiveTrack = c.track !== null;
  useEffect(() => {
    void listRegions().then((list) => setRegionCount(list.length));
    void loadTrackHistory().then((list) => setHistoryCount(list.length));
  }, [hasActiveTrack]);

  // Системная кнопка «назад» должна закрывать подэкран, а не выкидывать из
  // приложения: подэкраны кладём в history.state. Переход между подэкранами
  // нижним меню запись заменяет, а не добавляет, — иначе «назад» пришлось бы
  // жать столько раз, сколько вкладок человек пролистал.
  useEffect(() => {
    if (view === "home") return;
    if (window.history.state?.wbView)
      window.history.replaceState({ wbView: view }, "");
    else window.history.pushState({ wbView: view }, "");
    // Подэкран мог положить свою запись поверх (выбор области на карте) —
    // тогда «назад» закрывает её, а этот экран остаётся.
    const onPop = () => {
      if (window.history.state?.wbArea) return;
      setView("home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view]);

  const goHome = () => {
    if (window.history.state?.wbView) window.history.back();
    else setView("home");
  };

  /** Нижнее меню: вкладка «поход» возвращает назад по истории, а не поверх. */
  const selectTab = (tab: View) => {
    setMenuOpen(false);
    if (tab === view) return;
    if (tab === "home") goHome();
    else setView(tab);
  };

  /** `area` — открыть офлайн-карту сразу на выборе области с этим видом. */
  const openOffline = (area?: { center: Coords; zoom: number }) => {
    setAreaView(area ?? null);
    setView("offline");
  };

  if (!c.mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-wb-primary"
          aria-hidden="true"
        />
      </div>
    );
  }

  // Ручной выбор точки входа — полноэкранная карта поверх всего.
  if (c.picking) {
    return (
      <WayBackPicker
        center={c.current}
        onConfirm={c.handleStartFromPicked}
        onCancel={() => c.setPicking(false)}
      />
    );
  }

  const screen =
    view === "offline" ? (
      <WayBackOfflineScreen
        center={c.track?.anchor ?? c.current}
        areaView={areaView}
        onBack={goHome}
        onRegionsChange={setRegionCount}
        onFullscreenChange={setAreaFullscreen}
      />
    ) : view === "history" ? (
      <WayBackHistoryScreen
        onBack={goHome}
        onStart={() => {
          setView("home");
          void c.handleStart();
        }}
        onCountChange={setHistoryCount}
      />
    ) : (
      <div className="mx-auto w-full max-w-[520px] px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
        <div className="flex min-h-[52px] items-center gap-3 pt-[calc(8px+env(safe-area-inset-top))] pb-3">
          <h1 className="truncate text-[21px] font-extrabold tracking-[-0.02em] text-wb-ink">
            {c.track ? t("active.title") : "WayBack"}
          </h1>
        </div>

        {c.track ? (
          <ActiveHike
            c={c}
            regionCount={regionCount}
            onOpenOffline={() => openOffline()}
          />
        ) : (
          <Home
            c={c}
            signedIn={signedIn}
            accountLoading={accountLoading}
            regionCount={regionCount}
            historyCount={historyCount}
            onOpenOffline={() => openOffline()}
            onSaveArea={openOffline}
            onOpenHistory={() => setView("history")}
          />
        )}
      </div>
    );

  return (
    <>
      {screen}

      {/* Нижнее меню. На полноэкранной карте выбора области его нет: там свои
          кнопки у нижнего края, и панель их бы перекрыла. */}
      {!areaFullscreen && (
        <WayBackTabBar
          active={view}
          onSelect={selectTab}
          moreOpen={menuOpen}
          onMore={() => setMenuOpen((v) => !v)}
        />
      )}

      <WayBackMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Подтверждение выхода — необратимо останавливает стрелку. */}
      <WbModal
        open={c.confirmFinish}
        onClose={() => c.setConfirmFinish(false)}
        label={t("finish.cancel")}
      >
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-wb-ink">
          {t("finish.title")}
        </h2>
        <p className="mt-2 text-[14.5px] font-medium leading-[1.5] text-wb-body">
          {t("finish.body")}
        </p>
        {c.track && (
          <p className="wb-mono mt-4 text-[12.5px] text-wb-muted-2">
            {t("finish.stats", {
              duration: c.durationLabel ?? "0:00",
              distance:
                c.distanceM != null ? units.fmtDistanceM(c.distanceM) : "—",
              points: t("finish.points", { count: c.track.points.length }),
            })}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void c.handleFinish()}
            disabled={c.finishing}
            className="wb-btn wb-btn-danger"
          >
            {c.finishing && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {t("finish.confirm")}
          </button>
          <WbQuietButton
            className="bg-wb-surface-2"
            onClick={() => c.setConfirmFinish(false)}
          >
            {t("finish.cancel")}
          </WbQuietButton>
        </div>
      </WbModal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Похода нет                                                          */
/* ------------------------------------------------------------------ */

function Home({
  c,
  signedIn,
  accountLoading,
  regionCount,
  historyCount,
  onOpenOffline,
  onSaveArea,
  onOpenHistory,
}: {
  c: TrackController;
  signedIn: boolean;
  accountLoading: boolean;
  regionCount: number;
  historyCount: number;
  onOpenOffline: () => void;
  onSaveArea: (view: { center: Coords; zoom: number }) => void;
  onOpenHistory: () => void;
}) {
  const t = useTranslations("wayback.home");

  return (
    <div className="flex flex-col gap-2.5">
      {/* Главное действие: занимает верх экрана целиком. Крупно — слово
          действия («START»), подписью — что именно оно делает: с расстояния
          вытянутой руки читается сначала слово, а не фраза. */}
      <button
        type="button"
        onClick={() => void c.handleStart()}
        disabled={c.starting}
        className="wb-start"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="wb-start-word">{t("start")}</span>
          <span className="wb-start-sub">
            {c.starting ? t("startingButton") : t("startButton")}
          </span>
        </span>
        <span className="wb-start-badge">
          {c.starting ? (
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          ) : (
            <>
              <span className="wb-start-ring" aria-hidden="true" />
              <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
                <path
                  d="M12 3 L20 20 L12 15.5 L4 20 Z"
                  fill="currentColor"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </span>
      </button>

      {/* «Где я сейчас» — сразу под главным действием: карту открывают
          глазами, до всякого нажатия. */}
      <WayBackHomeMap known={c.current} onSaveArea={onSaveArea} />

      <WbRowTile label={t("pickOnMap")} onClick={() => c.setPicking(true)} />

      {/* «Как это работает» переехало в панель «ещё» нижнего меню: его читают
          один раз, а место рядом с главным действием стоит дорого. */}

      {/* Офлайн-карта и история — входы в отдельные экраны. */}
      <div className="grid grid-cols-2 gap-2.5">
        <SummaryTile
          title={t("offlineMap")}
          value={
            regionCount > 0
              ? t("offlineMapCount", { count: regionCount })
              : t("offlineMapNone")
          }
          action={t("offlineMapDownload")}
          onClick={onOpenOffline}
          muted={regionCount === 0}
        />
        <SummaryTile
          title={t("history")}
          value={
            historyCount > 0
              ? t("historyCount", { count: historyCount })
              : t("historyNone")
          }
          action={t("historyOpen")}
          onClick={onOpenHistory}
          muted={historyCount === 0}
        />
      </div>

      {/* Приглашение войти — только для анонимных и только как подсказка:
          трек работает без аккаунта, давить нельзя. */}
      {!accountLoading && !signedIn && (
        <Link
          href="/login"
          className="wb-tile-tint flex items-center gap-3 px-5 py-4"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-bold text-wb-ink">
              {t("signInTitle")}
            </span>
            <span className="text-[12.5px] font-medium text-wb-body">
              {t("signInBody")}
            </span>
          </span>
          <span className="flex-none text-[13px] font-extrabold text-wb-primary">
            {t("signInAction")}
          </span>
        </Link>
      )}
    </div>
  );
}

function SummaryTile({
  title,
  value,
  action,
  onClick,
  muted,
}: {
  title: string;
  value: string;
  action: string;
  onClick: () => void;
  muted: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wb-tile flex flex-col gap-1 px-4 py-4 text-left"
    >
      <span className="text-[16px] font-extrabold text-wb-ink">{title}</span>
      <span className="wb-mono text-[12px] text-wb-muted-2">{value}</span>
      <span
        className={cn(
          "mt-2 text-[13px] font-extrabold",
          muted ? "text-wb-muted-3" : "text-wb-primary",
        )}
      >
        {action} →
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Активный поход                                                      */
/* ------------------------------------------------------------------ */

function ActiveHike({
  c,
  regionCount,
  onOpenOffline,
}: {
  c: TrackController;
  regionCount: number;
  onOpenOffline: () => void;
}) {
  const t = useTranslations("wayback.active");
  const locale = useLocale();
  const units = useUnits();

  if (!c.track) return null;

  const distanceText =
    c.distanceM != null ? units.fmtDistanceM(c.distanceM) : "—";
  // Значение и единицу разводим визуально: в походе читают число, не подпись.
  const [distValue, distUnit] = (() => {
    const m = distanceText.match(/^([\d\s.,]+)\s*(.*)$/);
    return m ? [m[1].trim(), m[2]] : [distanceText, ""];
  })();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <WbStatTile
          accent
          label={t("toEntry")}
          value={distValue}
          unit={distUnit}
          footnote={
            c.distanceM != null && c.distanceM < 5
              ? t("atTheEntry")
              : (c.dirLabel ?? undefined)
          }
        />
        <WbStatTile
          label={t("onTheWalk")}
          value={c.durationLabel ?? "0:00"}
          footnote={t("since", {
            time: new Date(c.track.startedAt).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        />
      </div>

      {/* Компас возврата */}
      <WbTile className="flex flex-col items-center gap-3 px-5 py-6">
        {c.arrowDeg != null ? (
          <>
            <div className="flex h-[168px] w-[168px] items-center justify-center rounded-full bg-wb-primary-tint-2">
              <div
                className="transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${c.arrowDeg}deg)` }}
              >
                <ReturnArrow />
              </div>
            </div>
            <p className="text-center text-[17px] font-extrabold text-wb-ink">
              {c.distanceM != null && c.dirLabel
                ? t("directionText", {
                    dir: c.dirLabel,
                    dist: distanceText,
                  })
                : "—"}
            </p>
            <p className="wb-mono text-center text-[12.5px] text-wb-muted-2">
              {c.usingCourse ? t("fromCourse") : t("fromCompass")}
            </p>
          </>
        ) : (
          <>
            <div className="flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full border-2 border-dashed border-wb-border-3">
              <span className="wb-mono text-center text-[12px] leading-[1.5] text-wb-muted-2">
                {t("unknownLine1")}
                <br />
                {t("unknownLine2")}
              </span>
            </div>
            <p className="text-center text-[14.5px] font-medium leading-[1.5] text-wb-body">
              {t("unknownBody")}
            </p>
            {c.compassState === "unavailable" ? (
              <p className="text-center text-[13px] font-medium text-wb-muted-2">
                {t("compassUnavailable")}
              </p>
            ) : (
              <WbPrimaryButton
                className="mt-1 h-[56px] text-[16px]"
                onClick={() => void c.enableCompass()}
                disabled={c.compassState === "pending"}
              >
                {c.compassState === "pending" && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {t("enableCompass")}
              </WbPrimaryButton>
            )}
          </>
        )}
      </WbTile>

      {/* Якорь сохранён даже без компаса — снимаем главный страх. */}
      {c.arrowDeg == null && (
        <WbTile tone="quiet" className="px-5 py-4">
          <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
            {t("anchorSafe", { example: t("anchorSafeExample") })}
          </p>
        </WbTile>
      )}

      {/* Белые контролы общего TrackMap (его правка запрещена, см. flavors.mdc)
          перекрашивает правило wayback.css по .leaflet-container — обёртке
          класс для этого больше не нужен. */}
      <WbTile tone="tint" className="overflow-hidden p-2.5">
        <TrackMap
          anchor={c.track.anchor}
          points={c.track.points}
          current={c.current}
          course={c.course}
        />
        <p className="wb-mono px-2 pt-2.5 text-[11.5px] leading-[1.5] text-wb-body">
          {t("gapHint")}
        </p>
      </WbTile>

      {/* Под картой, а не над стрелкой: в походе главное — направление, но
          состояние записи должно быть видно без поиска по меню. */}
      <WayBackRecordingStatus />

      <button
        type="button"
        onClick={onOpenOffline}
        className="wb-tile flex items-center gap-3 px-5 py-[18px] text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-bold text-wb-ink">
            {t("offlineMapTitle")}
          </span>
          <span className="wb-mono text-[12px] text-wb-muted-2">
            {regionCount > 0
              ? t("offlineMapAround", { count: regionCount, radius: 10 })
              : t("offlineMapNone")}
          </span>
        </span>
        <span className="flex-none text-[13px] font-extrabold text-wb-primary">
          {t("offlineMapManage")} →
        </span>
      </button>

      <WbDangerSoftButton
        className="mt-1"
        onClick={() => c.setConfirmFinish(true)}
      >
        {t("finish")}
      </WbDangerSoftButton>

      <WbLabel className="sr-only">{t("map")}</WbLabel>
    </div>
  );
}
