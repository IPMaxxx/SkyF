"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import {
  MapPin,
  CloudSun,
  Star,
  ChevronRight,
  Plus,
  GitCompareArrows,
  Trees,
  Store,
  Coins,
  History,
} from "lucide-react";
import { OnboardingSteps } from "@/components/app/OnboardingSteps";
import { useAppData } from "@/lib/AppDataContext";
import { useTokens } from "@/lib/TokenContext";
import { TransactionHistory } from "@/components/app/TransactionHistory";
import { useTranslations, useLocale } from "next-intl";

function MapLoadingFallback() {
  const t = useTranslations("dashboard.home");
  return (
    <div className="flex h-[300px] sm:h-[360px] items-center justify-center rounded-xl bg-muted">
      <p className="text-sm text-muted-foreground">{t("mapLoading")}</p>
    </div>
  );
}

const DashboardMap = dynamic(
  () => import("@/components/app/DashboardMap").then((m) => m.DashboardMap),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  }
);

type MainCard = {
  title: string;
  desc: string;
  icon: typeof CloudSun;
  href: string;
  color: string;
  iconBg: string;
  needsLocation?: boolean;
  needsBestDay?: boolean;
  blockedHint?: string;
};

export default function DashboardPage() {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "ru-RU";
  const { locations, bestDays: allBestDays, loading } = useAppData();
  const { balance, loading: balanceLoading } = useTokens();
  const [showAllDays, setShowAllDays] = useState(false);
  const DAYS_PREVIEW = 6;
  const bestDays = showAllDays ? allBestDays : allBestDays.slice(0, DAYS_PREVIEW);
  const hasMoreDays = allBestDays.length > DAYS_PREVIEW;

  const hasLocations = locations.length > 0;
  const hasBestDays = bestDays.length > 0;

  const mainCards: MainCard[] = useMemo(
    () => [
      {
        title: t("cardWeatherTitle"),
        desc: t("cardWeatherDesc"),
        icon: CloudSun,
        href: "/dashboard/weather",
        color: "from-blue-500 to-cyan-600",
        iconBg: "from-blue-500/20 to-cyan-500/20",
        needsLocation: true,
        blockedHint: t("cardWeatherBlocked"),
      },
      {
        title: t("cardCompareTitle"),
        desc: t("cardCompareDesc"),
        icon: GitCompareArrows,
        href: "/dashboard/compare",
        color: "from-violet-500 to-purple-600",
        iconBg: "from-violet-500/20 to-purple-500/20",
        needsBestDay: true,
        blockedHint: t("cardCompareBlocked"),
      },
      {
        title: t("cardForestTitle"),
        desc: t("cardForestDesc"),
        icon: Trees,
        href: "/dashboard/forest-search",
        color: "from-emerald-500 to-teal-600",
        iconBg: "from-emerald-500/20 to-teal-500/20",
      },
      {
        title: t("cardMarketTitle"),
        desc: t("cardMarketDesc"),
        icon: Store,
        href: "/dashboard/marketplace",
        color: "from-pink-500 to-rose-600",
        iconBg: "from-pink-500/20 to-rose-500/20",
      },
    ],
    [t]
  );

  const diffLabels = useMemo(
    () => ({
      easy: t("diffEasy"),
      medium: t("diffMedium"),
      hard: t("diffHard"),
    }),
    [t]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/locations/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3.5 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
          >
            <Plus className="h-4 w-4" />
            {t("addLocation")}
          </Link>
          <Link
            href="/dashboard/best-day/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3.5 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
          >
            <Plus className="h-4 w-4" />
            {t("addBestDay")}
          </Link>
        </div>
      </div>

      {(!hasLocations || !hasBestDays) && !loading && (
        <OnboardingSteps hasLocations={hasLocations} hasBestDays={hasBestDays} />
      )}

      {(() => {
        const weatherCard = mainCards[0];
        const blocked = weatherCard.needsLocation && !hasLocations;

        if (blocked) {
          return (
            <div className="mb-4 relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent p-4 sm:p-6">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
              <div className="mb-3 sm:mb-4 flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white opacity-30 shadow-lg shadow-blue-500/20">
                <weatherCard.icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground/40">{weatherCard.title}</h2>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground/50">{weatherCard.desc}</p>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="mb-2 text-xs leading-relaxed text-amber-400/80">
                  {weatherCard.blockedHint}
                </p>
                <Link
                  href="/dashboard/locations/new"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500"
                >
                  <Plus className="h-3 w-3" />
                  {t("addLocation")}
                </Link>
              </div>
            </div>
          );
        }

        return (
          <Link
            href={weatherCard.href}
            className="group relative mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent p-4 sm:p-6 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20" />
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-cyan-500/5 blur-xl" />
            <div className="relative flex items-center gap-3 sm:block">
              <div className="flex h-11 w-11 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25">
                <weatherCard.icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="sm:hidden min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{weatherCard.title}</h2>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                    {t("mainBadge")}
                  </span>
                </div>
              </div>
              <ChevronRight className="sm:hidden relative h-5 w-5 flex-shrink-0 text-blue-400/50" />
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="mb-1 hidden sm:flex items-center gap-2">
                <h2 className="text-xl font-bold">{weatherCard.title}</h2>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                  {t("mainBadge")}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{weatherCard.desc}</p>
            </div>
            <ChevronRight className="hidden sm:block relative h-6 w-6 flex-shrink-0 text-blue-400/50 transition-all group-hover:text-blue-400 group-hover:translate-x-1" />
          </Link>
        );
      })()}

      <div className="grid gap-4 sm:grid-cols-3">
        {mainCards.slice(1).map((card) => {
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
                  <p className="mb-2 text-xs leading-relaxed text-amber-400/80">
                    {card.blockedHint}
                  </p>
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
                      ? t("addLocation")
                      : t("addBestDay")}
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

      {(hasLocations || hasBestDays) && !loading && (
        <div className="mt-8 sm:mt-10">
          <DashboardMap locations={locations} bestDays={allBestDays} />
        </div>
      )}

      {hasBestDays && (
        <div id="best-days" className="mt-8 sm:mt-10 scroll-mt-20">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold">{t("bestDaysTitle")}</h2>
              <Link
                href="/dashboard/best-day/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25 flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("bestDaysAdd")}</span>
                <span className="sm:hidden">{t("bestDaysAddShort")}</span>
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {t("bestDaysDesc")}
            </p>
          </div>
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
                    {new Date(bd.best_date).toLocaleDateString(dateLocale)}
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
          {hasMoreDays && (
            <button
              type="button"
              onClick={() => setShowAllDays((v) => !v)}
              className="mt-3 w-full rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/10"
            >
              {showAllDays
                ? t("collapse")
                : t("showAllDays", { count: allBestDays.length })}
            </button>
          )}
        </div>
      )}

      {hasLocations && (
        <div id="locations" className="mt-8 sm:mt-10 scroll-mt-20">
          <div className="mb-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold">{t("locationsTitle")}</h2>
              <Link
                href="/dashboard/locations/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("locationsAdd")}
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("locationsDesc")}</p>
          </div>
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
                {loc.difficulty && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      loc.difficulty === "easy"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : loc.difficulty === "medium"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {diffLabels[loc.difficulty as keyof typeof diffLabels]}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 sm:mt-10">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <Coins className="h-5 w-5 text-amber-400" />
            {t("tokensTitle")}
          </h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-amber-400">
                {balanceLoading ? "..." : balance ?? 0}
              </span>
            </div>
            <Link
              href="/payment"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{t("topUp")}</span>
              <span className="xs:hidden">{t("topUpShort")}</span>
            </Link>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <History className="h-4 w-4" />
            {t("lastOps")}
          </h3>
          <TransactionHistory compact limit={10} />
        </div>
      </div>

      {loading && (
        <div className="mt-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
