"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useTokens } from "@/lib/TokenContext";
import { useUnits } from "@/lib/units";
import type { ForestInfo, TreeSpecies } from "@/lib/supabase/types";
import {
  Trees, Leaf, Loader2, RefreshCw, ChevronDown, ChevronUp,
  ExternalLink, Satellite, Database, Map, Globe,
} from "lucide-react";

interface Props {
  lat: number | null;
  lng: number | null;
  forestInfo: ForestInfo | null;
  onLoaded?: (info: ForestInfo) => void;
  /** Native: сразу запускать загрузку при монтировании, без промежуточной кнопки. */
  autoLoad?: boolean;
  /** Язык интерфейса ("ru" | "en"). По умолчанию ru — веб-поведение без изменений. */
  locale?: string;
}

type Lang = "ru" | "en";

const FOREST_TYPE_LABELS: Record<Lang, Record<string, string>> = {
  ru: {
    coniferous: "Хвойный лес",
    broadleaved: "Лиственный лес",
    mixed: "Смешанный лес",
    unknown: "Лесная зона",
  },
  en: {
    coniferous: "Coniferous forest",
    broadleaved: "Broadleaf forest",
    mixed: "Mixed forest",
    unknown: "Forest area",
  },
};

const LEAF_CYCLE_LABELS: Record<Lang, Record<string, string>> = {
  ru: {
    deciduous: "Листопадный",
    evergreen: "Вечнозелёный",
    mixed: "Смешанный",
    unknown: "—",
  },
  en: {
    deciduous: "Deciduous",
    evergreen: "Evergreen",
    mixed: "Mixed",
    unknown: "—",
  },
};

const FOREST_TYPE_COLORS: Record<string, string> = {
  coniferous: "from-emerald-600 to-green-700",
  broadleaved: "from-lime-500 to-green-600",
  mixed: "from-teal-500 to-emerald-600",
  unknown: "from-gray-500 to-gray-600",
};

// Локализация подписей UI. Названия видов/пород и т.п. приходят от источников
// (OSM, ФГИС ЛК, iNaturalist) преимущественно на русском — переводится только UI.
const UI = {
  ru: {
    refresh: "Обновить данные (1 токен, с подпиской — бесплатно)",
    modisTitle: "MODIS / спутник",
    igbpClass: "Класс IGBP",
    igbpEng: "Англ.",
    forestZone: "Лесная зона",
    yes: "Да",
    no: "Нет",
    fgisTitle: "ФГИС ЛК / Рослесхоз",
    subcompartment: "Выдел",
    dominantSpecies: "Преобладающая порода",
    ageGroup: "Группа возраста",
    osmTitle: "OpenStreetMap",
    collapse: "Свернуть",
    moreTags: (n: number) => `Ещё ${n} тегов...`,
    speciesFromTags: "Виды из тегов: ",
    inatTitle: "iNaturalist",
    openMap: "Открыть карту",
    inatCount: (n: number, dist: string) =>
      `${n} видов деревьев в радиусе ${dist} (research grade)`,
    inatNone: (dist: string) => `Данные о видах в радиусе ${dist} не найдены`,
    treeSpecies: "Виды деревьев",
    moreSpecies: (n: number) => `Ещё ${n} видов`,
    noForestData: "Данные о лесе не найдены для этой локации",
    learnForestType: "Узнать тип леса",
    learnForestDesc: "OSM, ФГИС ЛК, iNaturalist, MODIS — 1 токен, с подпиской — бесплатно",
    analyzing: "Анализ местности...",
    analyzingDesc: "OSM + ФГИС ЛК + iNaturalist + MODIS",
    loadError: "Ошибка загрузки",
    loadFailed: "Не удалось загрузить данные о лесе",
    tryAgain: "Попробовать снова",
    obs: (n: number) => `${n} набл.`,
    dateLocale: "ru-RU",
  },
  en: {
    refresh: "Refresh data (1 token, free with subscription)",
    modisTitle: "MODIS / satellite",
    igbpClass: "IGBP class",
    igbpEng: "Eng.",
    forestZone: "Forest zone",
    yes: "Yes",
    no: "No",
    fgisTitle: "FGIS LK / Rosleshoz",
    subcompartment: "Subcompartment",
    dominantSpecies: "Dominant species",
    ageGroup: "Age group",
    osmTitle: "OpenStreetMap",
    collapse: "Collapse",
    moreTags: (n: number) => `${n} more tags...`,
    speciesFromTags: "Species from tags: ",
    inatTitle: "iNaturalist",
    openMap: "Open map",
    inatCount: (n: number, dist: string) =>
      `${n} tree species within ${dist} (research grade)`,
    inatNone: (dist: string) => `No species data found within ${dist}`,
    treeSpecies: "Tree species",
    moreSpecies: (n: number) => `${n} more species`,
    noForestData: "No forest data found for this location",
    learnForestType: "Identify forest type",
    learnForestDesc: "OSM, FGIS LK, iNaturalist, MODIS — 1 token, free with subscription",
    analyzing: "Analyzing the area...",
    analyzingDesc: "OSM + FGIS LK + iNaturalist + MODIS",
    loadError: "Loading error",
    loadFailed: "Failed to load forest data",
    tryAgain: "Try again",
    obs: (n: number) => `${n} obs.`,
    dateLocale: "en-GB",
  },
} as const;

export function ForestInfoPanel({ lat, lng, forestInfo: initial, onLoaded, autoLoad, locale }: Props) {
  const intlLocale = useLocale();
  const lang: Lang = (locale ?? intlLocale) === "en" ? "en" : "ru";
  const T = UI[lang];
  const units = useUnits();
  // iNaturalist ищет виды в радиусе 5 км (метрика фиксирована в API)
  const inatDist = `${units.fmtDist(5, 0)} ${units.distUnit}`;
  const [info, setInfo] = useState<ForestInfo | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speciesExpanded, setSpeciesExpanded] = useState(false);
  const [osmTagsExpanded, setOsmTagsExpanded] = useState(false);
  const autoLoadedRef = useRef(false);
  const { refresh: refreshTokens } = useTokens();

  const fetchInfo = async (force = false) => {
    if (lat === null || lng === null) return;
    setLoading(true);
    setError("");

    try {
      const url = `/api/forest-info?lat=${lat}&lng=${lng}&locale=${lang}${force ? "&force=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || T.loadError);
        return;
      }

      // Сервер списал 1 токен (forest_info) — обновляем баланс в шапке.
      if (data.charged) refreshTokens();

      setInfo(data.forest_info);
      onLoaded?.(data.forest_info);
    } catch {
      setError(T.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  // Native: мгновенная загрузка по открытию панели, без промежуточной кнопки.
  useEffect(() => {
    if (!autoLoad || autoLoadedRef.current) return;
    if (initial || lat === null || lng === null) return;
    autoLoadedRef.current = true;
    fetchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, lat, lng]);

  if (lat === null || lng === null) return null;

  if (!info && !loading) {
    return (
      <button
        type="button"
        onClick={() => fetchInfo()}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 text-left transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
          <Trees className="h-4.5 w-4.5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium">{T.learnForestType}</p>
          <p className="text-xs text-muted-foreground">
            {T.learnForestDesc}
          </p>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white/5 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        <div>
          <p className="text-sm font-medium">{T.analyzing}</p>
          <p className="text-xs text-muted-foreground">
            {T.analyzingDesc}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => fetchInfo()}
          className="mt-2 text-xs text-red-400 underline hover:text-red-300"
        >
          {T.tryAgain}
        </button>
      </div>
    );
  }

  if (!info) return null;

  const fgisSpecies = info.dominant_species.filter((s) => s.source === "fgis_lk");
  const osmSpecies = info.dominant_species.filter((s) => s.source === "osm");
  const inatSpecies = info.dominant_species.filter((s) => s.source === "inaturalist");
  const allSpecies = info.dominant_species;
  const visibleSpecies = speciesExpanded ? allSpecies : allSpecies.slice(0, 8);
  const osmTagEntries = Object.entries(info.osm_tags);

  return (
    <div className="space-y-3">
      {/* Main header */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div
          className={`flex items-center gap-3 bg-gradient-to-r ${FOREST_TYPE_COLORS[info.forest_type]} p-4`}
        >
          <Trees className="h-6 w-6 text-white/90 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-lg">
              {FOREST_TYPE_LABELS[lang][info.forest_type]}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
              {info.leaf_cycle !== "unknown" && (
                <span className="flex items-center gap-1">
                  <Leaf className="h-3 w-3" />
                  {LEAF_CYCLE_LABELS[lang][info.leaf_cycle]}
                </span>
              )}
              {info.forest_name && (
                <span>&laquo;{info.forest_name}&raquo;</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchInfo(true)}
            disabled={loading}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white flex-shrink-0"
            title={T.refresh}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* MODIS Satellite Section */}
      {info.modis && (
        <SourceSection
          icon={<Satellite className="h-3.5 w-3.5" />}
          title={T.modisTitle}
          color="purple"
        >
          <div className="space-y-1.5 text-sm">
            <InfoRow label={T.igbpClass} value={`${info.modis.igbp_name_ru} (${info.modis.igbp_class})`} />
            <InfoRow label={T.igbpEng} value={info.modis.igbp_name} />
            <InfoRow label={T.forestZone} value={info.modis.is_forest ? T.yes : T.no} />
          </div>
        </SourceSection>
      )}

      {/* ФГИС ЛК Section */}
      {info.fgis_lk && info.fgis_lk.length > 0 && (
        <SourceSection
          icon={<Database className="h-3.5 w-3.5" />}
          title={T.fgisTitle}
          color="amber"
        >
          <div className="space-y-2">
            {info.fgis_lk.map((entry, i) => (
              <div
                key={`${entry.externalid}-${i}`}
                className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-2.5 space-y-1 text-sm"
              >
                <InfoRow label={T.subcompartment} value={entry.externalid} />
                <InfoRow label={T.dominantSpecies} value={entry.tree_species} highlight />
                {entry.age_group && (
                  <InfoRow label={T.ageGroup} value={entry.age_group} />
                )}
              </div>
            ))}
          </div>
        </SourceSection>
      )}

      {/* OSM Section */}
      {(osmTagEntries.length > 0 || osmSpecies.length > 0) && (
        <SourceSection
          icon={<Map className="h-3.5 w-3.5" />}
          title={T.osmTitle}
          color="blue"
        >
          <div className="space-y-2">
            {osmTagEntries.length > 0 && (
              <div>
                {osmTagEntries.slice(0, osmTagsExpanded ? undefined : 4).map(([key, value]) => (
                  <InfoRow key={key} label={key} value={value} />
                ))}
                {osmTagEntries.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setOsmTagsExpanded((v) => !v)}
                    className="mt-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    {osmTagsExpanded ? T.collapse : T.moreTags(osmTagEntries.length - 4)}
                  </button>
                )}
              </div>
            )}
            {osmSpecies.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {T.speciesFromTags}{osmSpecies.map((s) => s.common_name || s.latin_name).join(", ")}
              </div>
            )}
          </div>
        </SourceSection>
      )}

      {/* iNaturalist Section — always visible */}
      <SourceSection
        icon={<Globe className="h-3.5 w-3.5" />}
        title={T.inatTitle}
        color="green"
        action={
          <a
            href={`https://www.inaturalist.org/observations?subview=map&lat=${lat}&lng=${lng}&radius=5&taxon_id=47126&quality_grade=research`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300"
          >
            {T.openMap}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        }
      >
        {inatSpecies.length > 0 ? (
          <p className="text-xs text-muted-foreground mb-2">
            {T.inatCount(inatSpecies.length, inatDist)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {T.inatNone(inatDist)}
          </p>
        )}
      </SourceSection>

      {/* All Species Combined */}
      {allSpecies.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-white/5 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {T.treeSpecies} ({allSpecies.length})
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {visibleSpecies.map((sp, i) => (
              <SpeciesRow key={`${sp.source}-${sp.latin_name}-${i}`} species={sp} obsLabel={T.obs} />
            ))}

            {allSpecies.length > 8 && (
              <button
                type="button"
                onClick={() => setSpeciesExpanded((v) => !v)}
                className="flex w-full items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {speciesExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    {T.collapse}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    {T.moreSpecies(allSpecies.length - 8)}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {allSpecies.length === 0 && !info.modis && !info.fgis_lk && (
        <div className="rounded-xl border border-border p-4 text-center text-xs text-muted-foreground">
          {T.noForestData}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {info.modis && <Badge color="purple">MODIS</Badge>}
        {info.fgis_lk && info.fgis_lk.length > 0 && <Badge color="amber">ФГИС ЛК</Badge>}
        {osmTagEntries.length > 0 && <Badge color="blue">OSM</Badge>}
        <Badge color="green">iNat{inatSpecies.length > 0 ? `: ${inatSpecies.length}` : ""}</Badge>
        {fgisSpecies.length > 0 && <Badge color="amber">{fgisSpecies.length} выд.</Badge>}
        {info.fetched_at && (
          <span className="ml-auto">
            {new Date(info.fetched_at).toLocaleDateString(T.dateLocale)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ----- Sub-components ----- */

function SourceSection({
  icon, title, color, action, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: "purple" | "amber" | "blue" | "green";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const borderColor = {
    purple: "border-purple-500/20",
    amber: "border-amber-500/20",
    blue: "border-blue-500/20",
    green: "border-green-500/20",
  }[color];

  const bgColor = {
    purple: "bg-purple-500/5",
    amber: "bg-amber-500/5",
    blue: "bg-blue-500/5",
    green: "bg-green-500/5",
  }[color];

  const textColor = {
    purple: "text-purple-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    green: "text-green-400",
  }[color];

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-3.5 py-2 border-b ${borderColor}`}>
        <span className={textColor}>{icon}</span>
        <span className={`text-xs font-semibold ${textColor} uppercase tracking-wider flex-1`}>
          {title}
        </span>
        {action}
      </div>
      <div className="px-3.5 py-3">{children}</div>
    </div>
  );
}

function InfoRow({
  label, value, highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 text-sm leading-relaxed">
      <span className="text-muted-foreground text-xs whitespace-nowrap min-w-[90px]">{label}</span>
      <span className={highlight ? "font-semibold text-foreground" : "text-foreground/80"}>
        {value}
      </span>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const cls: Record<string, string> = {
    purple: "bg-purple-500/10 text-purple-400",
    amber: "bg-amber-500/10 text-amber-400",
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 ${cls[color] || cls.blue}`}>
      {children}
    </span>
  );
}

function SpeciesRow({ species, obsLabel }: { species: TreeSpecies; obsLabel: (n: number) => string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {species.image_url ? (
        <img
          src={species.image_url}
          alt={species.latin_name}
          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
          <Leaf className="h-4 w-4 text-emerald-400/60" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {species.common_name || species.latin_name}
        </p>
        <p className="truncate text-xs text-muted-foreground italic">
          {species.latin_name}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {species.observation_count > 0 && (
          <span className="text-xs text-muted-foreground">
            {obsLabel(species.observation_count)}
          </span>
        )}
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            species.source === "fgis_lk"
              ? "bg-amber-500/15 text-amber-400"
              : species.source === "osm"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-green-500/15 text-green-400"
          }`}
        >
          {species.source === "fgis_lk" ? "ФГИС" : species.source === "osm" ? "OSM" : "iNat"}
        </span>
      </div>
    </div>
  );
}
