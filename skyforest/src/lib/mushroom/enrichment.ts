/**
 * Обогащение видов справочными данными из открытых баз GBIF + iNaturalist.
 * Порт `bot/enrichment/service.py`, `gbif.py`, `inaturalist.py` из Mashbot.
 *
 * Кэширование: используем встроенный кэш Next для внешних GET-запросов
 * (`next: { revalidate }`) вместо собственной 30-дневной SQLite-таблицы бота.
 */

const GBIF_BASE = "https://api.gbif.org/v1";
const INAT_BASE = "https://api.inaturalist.org/v1";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 30; // 30 дней
const USER_AGENT = "SkyForest/1.0 (mushroom identify)";

export interface SpeciesInfo {
  scientific_name: string;
  common_names: string[];
  photo_url: string | null;
  wikipedia_url: string | null;
  gbif_url: string | null;
  family: string | null;
  genus: string | null;
  summary: string | null;
  /** Нейтральный факт из баз; null — «нет данных». */
  toxic: boolean | null;
  toxic_source: string | null;
}

function emptyInfo(name: string): SpeciesInfo {
  return {
    scientific_name: name,
    common_names: [],
    photo_url: null,
    wikipedia_url: null,
    gbif_url: null,
    family: null,
    genus: null,
    summary: null,
    toxic: null,
    toxic_source: null,
  };
}

function cleanSummary(raw: string | null | undefined, maxLen = 320): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const dot = cut.lastIndexOf(". ");
  if (dot >= 80) return cut.slice(0, dot + 1);
  return cut.trimEnd() + "…";
}

async function gbifGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${GBIF_BASE}${path}?${qs}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface GbifMatch {
  usageKey?: number;
  family?: string;
  genus?: string;
}

async function gbifMatch(scientificName: string): Promise<GbifMatch | null> {
  const data = await gbifGet<GbifMatch>("/species/match", { name: scientificName });
  if (!data || data.usageKey == null) return null;
  return data;
}

/** Локаль UI → трёхбуквенный код языка для GBIF vernacularNames. */
function gbifLang(locale: string): string {
  return locale === "en" ? "eng" : "rus";
}

async function gbifVernacular(usageKey: number, lang = "rus"): Promise<string[]> {
  const data = await gbifGet<{ results?: Array<{ language?: string; vernacularName?: string }> }>(
    `/species/${usageKey}/vernacularNames`,
    { limit: "100" },
  );
  if (!data?.results) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const item of data.results) {
    if (item.language !== lang) continue;
    const name = (item.vernacularName ?? "").trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

async function gbifToxic(usageKey: number): Promise<boolean | null> {
  const data = await gbifGet<{ results?: Array<{ toxic?: boolean | null }> }>(
    `/species/${usageKey}/speciesProfiles`,
    { limit: "50" },
  );
  if (!data?.results) return null;
  const flags = data.results
    .map((r) => r.toxic)
    .filter((t): t is boolean => t != null);
  if (flags.length === 0) return null;
  return flags.some(Boolean);
}

interface InatLookup {
  common_name: string | null;
  photo_url: string | null;
  wikipedia_url: string | null;
  wikipedia_summary: string | null;
  inat_id: number | null;
}

async function inatLookup(scientificName: string, locale = "ru"): Promise<InatLookup | null> {
  try {
    const qs = new URLSearchParams({ q: scientificName, locale, per_page: "1" }).toString();
    const res = await fetch(`${INAT_BASE}/taxa?${qs}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const taxon = data.results?.[0];
    if (!taxon) return null;
    const defaultPhoto = taxon.default_photo ?? {};
    return {
      common_name: taxon.preferred_common_name ?? null,
      photo_url: defaultPhoto.medium_url ?? defaultPhoto.url ?? null,
      wikipedia_url: taxon.wikipedia_url ?? null,
      wikipedia_summary: taxon.wikipedia_summary ?? null,
      inat_id: taxon.id ?? null,
    };
  } catch {
    return null;
  }
}

/** Обогащение одного вида (GBIF + iNaturalist параллельно). */
export async function enrichSpecies(
  scientificName: string,
  locale = "ru",
): Promise<SpeciesInfo> {
  const info = emptyInfo(scientificName);

  const [gbif, inat] = await Promise.all([
    gbifMatch(scientificName),
    inatLookup(scientificName, locale),
  ]);

  if (gbif && gbif.usageKey != null) {
    info.gbif_url = `https://www.gbif.org/species/${gbif.usageKey}`;
    info.family = gbif.family ?? null;
    info.genus = gbif.genus ?? null;
    const [vernacular, toxic] = await Promise.all([
      gbifVernacular(gbif.usageKey, gbifLang(locale)),
      gbifToxic(gbif.usageKey),
    ]);
    info.common_names.push(...vernacular);
    if (toxic != null) {
      info.toxic = toxic;
      info.toxic_source = "GBIF";
    }
  }

  if (inat) {
    if (inat.common_name) info.common_names.push(inat.common_name);
    info.photo_url = inat.photo_url;
    info.wikipedia_url = inat.wikipedia_url;
    info.summary = cleanSummary(inat.wikipedia_summary);
  }

  // Дедупликация народных названий с сохранением порядка.
  const seen = new Set<string>();
  info.common_names = info.common_names
    .map((n) => n.trim())
    .filter((n) => {
      const key = n.toLowerCase();
      if (!n || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return info;
}

/** Обогащение списка видов параллельно; ошибки по отдельным видам не валят всё. */
export async function enrichMany(
  scientificNames: string[],
  locale = "ru",
): Promise<Record<string, SpeciesInfo>> {
  const unique = [...new Set(scientificNames.filter(Boolean))];
  const results = await Promise.allSettled(unique.map((n) => enrichSpecies(n, locale)));
  const out: Record<string, SpeciesInfo> = {};
  unique.forEach((name, i) => {
    const r = results[i];
    out[name] = r.status === "fulfilled" ? r.value : emptyInfo(name);
  });
  return out;
}
