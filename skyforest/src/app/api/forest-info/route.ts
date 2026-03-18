import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { createClient } from "@/lib/supabase/server";
import type { ForestInfo, TreeSpecies } from "@/lib/supabase/types";
import { getModisLandCover, type ModisLandCover } from "@/lib/gee";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const INAT_URL = "https://api.inaturalist.org/v1/observations/species_counts";
const FGIS_LK_WMS = "https://pub.fgislk.gov.ru/map/geo/geoserver/wms";

/** pub.fgislk.gov.ru has an invalid SSL cert — fetch via node:https with rejectUnauthorized: false */
function fetchInsecure(rawUrl: string, timeoutMs = 15000): Promise<string> {
  const parsed = new URL(rawUrl);
  return new Promise((resolve, reject) => {
    const req = https.get(parsed, { rejectUnauthorized: false, timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

const LEAF_TYPE_MAP: Record<string, ForestInfo["forest_type"]> = {
  broadleaved: "broadleaved",
  needleleaved: "coniferous",
  mixed: "mixed",
};

const LEAF_CYCLE_MAP: Record<string, ForestInfo["leaf_cycle"]> = {
  deciduous: "deciduous",
  evergreen: "evergreen",
  semi_deciduous: "mixed",
  mixed: "mixed",
};

// Genus → leaf type classification for inference
const GENUS_LEAF_TYPE: Record<string, "coniferous" | "broadleaved"> = {
  // Хвойные (coniferous)
  pinus: "coniferous",
  picea: "coniferous",
  abies: "coniferous",
  larix: "coniferous",
  juniperus: "coniferous",
  thuja: "coniferous",
  taxus: "coniferous",
  // Лиственные (broadleaved)
  betula: "broadleaved",
  quercus: "broadleaved",
  alnus: "broadleaved",
  populus: "broadleaved",
  acer: "broadleaved",
  tilia: "broadleaved",
  salix: "broadleaved",
  fraxinus: "broadleaved",
  ulmus: "broadleaved",
  carpinus: "broadleaved",
  corylus: "broadleaved",
  sorbus: "broadleaved",
  fagus: "broadleaved",
  prunus: "broadleaved",
  malus: "broadleaved",
  robinia: "broadleaved",
  castanea: "broadleaved",
};

// Common/English tree names → Russian + genus for matching
const TREE_NAMES: Record<string, { ru: string; genus: string }> = {
  pine: { ru: "Сосна", genus: "pinus" },
  spruce: { ru: "Ель", genus: "picea" },
  birch: { ru: "Берёза", genus: "betula" },
  oak: { ru: "Дуб", genus: "quercus" },
  alder: { ru: "Ольха", genus: "alnus" },
  aspen: { ru: "Осина", genus: "populus" },
  maple: { ru: "Клён", genus: "acer" },
  linden: { ru: "Липа", genus: "tilia" },
  willow: { ru: "Ива", genus: "salix" },
  poplar: { ru: "Тополь", genus: "populus" },
  ash: { ru: "Ясень", genus: "fraxinus" },
  elm: { ru: "Вяз", genus: "ulmus" },
  hornbeam: { ru: "Граб", genus: "carpinus" },
  hazel: { ru: "Лещина", genus: "corylus" },
  rowan: { ru: "Рябина", genus: "sorbus" },
  beech: { ru: "Бук", genus: "fagus" },
  larch: { ru: "Лиственница", genus: "larix" },
  fir: { ru: "Пихта", genus: "abies" },
  juniper: { ru: "Можжевельник", genus: "juniperus" },
};

// Latin genus → Russian name
const GENUS_RU: Record<string, string> = {
  pinus: "Сосна",
  picea: "Ель",
  betula: "Берёза",
  quercus: "Дуб",
  alnus: "Ольха",
  populus: "Тополь / Осина",
  acer: "Клён",
  tilia: "Липа",
  salix: "Ива",
  fraxinus: "Ясень",
  ulmus: "Вяз",
  carpinus: "Граб",
  corylus: "Лещина",
  sorbus: "Рябина",
  fagus: "Бук",
  larix: "Лиственница",
  abies: "Пихта",
  juniperus: "Можжевельник",
  prunus: "Вишня / Черёмуха",
  malus: "Яблоня",
  robinia: "Робиния",
  thuja: "Туя",
  taxus: "Тис",
};

// All tree genera we recognize (for filtering iNaturalist results)
const TREE_GENERA = new Set(Object.keys(GENUS_LEAF_TYPE));

// Russian tree species names from ФГИС ЛК → genus for classification
const RU_SPECIES_TO_GENUS: Record<string, string> = {
  "сосна": "pinus",
  "ель": "picea",
  "береза": "betula",
  "берёза": "betula",
  "дуб": "quercus",
  "ольха": "alnus",
  "осина": "populus",
  "клен": "acer",
  "клён": "acer",
  "липа": "tilia",
  "ива": "salix",
  "тополь": "populus",
  "ясень": "fraxinus",
  "вяз": "ulmus",
  "граб": "carpinus",
  "лещина": "corylus",
  "рябина": "sorbus",
  "бук": "fagus",
  "лиственница": "larix",
  "пихта": "abies",
  "можжевельник": "juniperus",
  "кедр": "pinus",
  "черёмуха": "prunus",
  "черемуха": "prunus",
  "яблоня": "malus",
  "робиния": "robinia",
  "акация": "robinia",
  "туя": "thuja",
  "тис": "taxus",
};

function roundCoord(v: number, precision = 4): number {
  return Math.round(v * 10 ** precision) / 10 ** precision;
}

function classifyGenus(name: string): "coniferous" | "broadleaved" | null {
  const lower = name.toLowerCase();
  if (GENUS_LEAF_TYPE[lower]) return GENUS_LEAF_TYPE[lower];
  const byName = TREE_NAMES[lower];
  if (byName) return GENUS_LEAF_TYPE[byName.genus] || null;
  return null;
}

function russianName(name: string): string | null {
  const lower = name.toLowerCase();
  if (GENUS_RU[lower]) return GENUS_RU[lower];
  if (TREE_NAMES[lower]) return TREE_NAMES[lower].ru;
  return null;
}

// Infer forest type from collected species when OSM tags don't have leaf_type
function inferForestType(
  species: TreeSpecies[]
): ForestInfo["forest_type"] {
  if (species.length === 0) return "unknown";

  let coniferous = 0;
  let broadleaved = 0;

  for (const sp of species) {
    const genus = sp.latin_name.split(" ")[0].toLowerCase();
    const type = classifyGenus(genus) || classifyGenus(sp.latin_name.toLowerCase());
    if (type === "coniferous") coniferous++;
    else if (type === "broadleaved") broadleaved++;
  }

  const total = coniferous + broadleaved;
  if (total === 0) return "unknown";
  if (coniferous === 0) return "broadleaved";
  if (broadleaved === 0) return "coniferous";
  const coniferousRatio = coniferous / total;
  if (coniferousRatio > 0.7) return "coniferous";
  if (coniferousRatio < 0.3) return "broadleaved";
  return "mixed";
}

interface OsmResult {
  forestType: ForestInfo["forest_type"];
  leafCycle: ForestInfo["leaf_cycle"];
  forestName: string | null;
  osmSpecies: TreeSpecies[];
  osmTags: Record<string, string>;
  isInForest: boolean;
}

async function fetchOsmForest(
  lat: number,
  lng: number,
  radiusM = 2000
): Promise<OsmResult> {
  // Two-step query:
  // 1. is_in — find forest/wood polygons that CONTAIN the point
  // 2. around — find nearby forests, individual trees, and tree rows
  const query = `
[out:json][timeout:25];
is_in(${lat},${lng})->.enclosing;
area.enclosing["landuse"="forest"]->.cf;
area.enclosing["natural"="wood"]->.cw;
(
  .cf;
  .cw;
  way(around:${radiusM},${lat},${lng})["landuse"="forest"];
  way(around:${radiusM},${lat},${lng})["natural"="wood"];
  relation(around:${radiusM},${lat},${lng})["landuse"="forest"];
  relation(around:${radiusM},${lat},${lng})["natural"="wood"];
  node(around:500,${lat},${lng})["natural"="tree"];
);
out tags;
`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    console.error("Overpass API error:", res.status);
    return {
      forestType: "unknown",
      leafCycle: "unknown",
      forestName: null,
      osmSpecies: [],
      osmTags: {},
      isInForest: false,
    };
  }

  const data = await res.json();
  const elements: Array<{
    type: string;
    tags?: Record<string, string>;
  }> = data.elements || [];

  let forestType: ForestInfo["forest_type"] = "unknown";
  let leafCycle: ForestInfo["leaf_cycle"] = "unknown";
  let forestName: string | null = null;
  let isInForest = false;
  const allTags: Record<string, string> = {};
  const speciesSet = new Map<string, TreeSpecies>();

  for (const el of elements) {
    const tags = el.tags || {};

    // area type = the point is inside this forest
    if (el.type === "area") {
      isInForest = true;
    }

    // Explicit leaf_type tag
    if (tags.leaf_type && forestType === "unknown") {
      forestType = LEAF_TYPE_MAP[tags.leaf_type] || "unknown";
    }
    if (tags.leaf_cycle && leafCycle === "unknown") {
      leafCycle = LEAF_CYCLE_MAP[tags.leaf_cycle] || "unknown";
    }
    if ((tags.name || tags["name:ru"]) && !forestName) {
      forestName = tags["name:ru"] || tags.name;
    }

    // Extract species from forest polygon tags and individual tree nodes
    const speciesKeys = [
      "wood", "species", "genus", "trees",
      "species:ru", "species:en", "taxon",
    ];
    for (const key of speciesKeys) {
      if (tags[key]) {
        const values = tags[key].split(";").map((v) => v.trim());
        for (const raw of values) {
          if (!raw) continue;
          const lower = raw.toLowerCase();
          if (speciesSet.has(lower)) continue;

          const ruName = russianName(lower);
          speciesSet.set(lower, {
            latin_name: raw.charAt(0).toUpperCase() + raw.slice(1),
            common_name: ruName,
            observation_count: 0,
            image_url: null,
            source: "osm",
          });
        }
      }
    }

    // For individual tree nodes, also check "denotation" and "leaf_type" on the node itself
    if (tags.natural === "tree" && tags.genus) {
      const genus = tags.genus.toLowerCase();
      if (!speciesSet.has(genus)) {
        const fullName = tags.species || tags.genus;
        speciesSet.set(genus, {
          latin_name: fullName.charAt(0).toUpperCase() + fullName.slice(1),
          common_name: russianName(genus),
          observation_count: 0,
          image_url: null,
          source: "osm",
        });
      }
    }

    // Merge interesting tags (first occurrence wins)
    for (const key of [
      "leaf_type", "leaf_cycle", "wood", "species", "genus",
      "trees", "name", "name:ru", "description",
    ]) {
      if (tags[key] && !allTags[key]) {
        allTags[key] = tags[key];
      }
    }
  }

  // If no explicit leaf_type, infer from collected species
  const osmSpecies = Array.from(speciesSet.values());
  if (forestType === "unknown" && osmSpecies.length > 0) {
    forestType = inferForestType(osmSpecies);
  }

  return {
    forestType,
    leafCycle,
    forestName,
    osmSpecies,
    osmTags: allTags,
    isInForest,
  };
}

interface FgisLkResult {
  species: TreeSpecies[];
  raw: { externalid: string; tree_species: string; age_group: string | null }[];
}

// ФГИС ЛК (Russia) — fetch forest subcompartment data via WMS GetFeatureInfo
async function fetchFgisLk(
  lat: number,
  lng: number
): Promise<FgisLkResult> {
  try {
    const delta = 0.002;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

    const params = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetFeatureInfo",
      LAYERS: "FOREST_LAYERS:TAXATION_PIECE_PVS",
      QUERY_LAYERS: "FOREST_LAYERS:TAXATION_PIECE_PVS",
      INFO_FORMAT: "application/json",
      SRS: "EPSG:4326",
      BBOX: bbox,
      WIDTH: "256",
      HEIGHT: "256",
      X: "128",
      Y: "128",
      FEATURE_COUNT: "10",
    });

    const rawText = await fetchInsecure(`${FGIS_LK_WMS}?${params}`);
    const trimmed = rawText.trimStart();
    if (trimmed.startsWith("<") || !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      console.warn("ФГИС ЛК returned non-JSON response (likely HTML error page), skipping");
      return { species: [], raw: [] };
    }
    const data = JSON.parse(rawText);
    const features: Array<{
      properties?: {
        tree_species?: string;
        age_group?: string;
        externalid?: string;
        label_name?: string;
      };
    }> = data.features || [];

    const seen = new Set<string>();
    const species: TreeSpecies[] = [];
    const raw: FgisLkResult["raw"] = [];

    for (const f of features) {
      const props = f.properties;
      if (!props) continue;

      const ruName = props.tree_species;
      const extId = props.externalid || props.label_name || "";

      raw.push({
        externalid: extId,
        tree_species: ruName || "—",
        age_group: props.age_group || null,
      });

      if (!ruName) continue;

      const key = ruName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const genus = RU_SPECIES_TO_GENUS[key];
      const latinGenus = genus
        ? genus.charAt(0).toUpperCase() + genus.slice(1)
        : ruName;

      species.push({
        latin_name: latinGenus,
        common_name: `${ruName}${props.age_group ? ` (${props.age_group})` : ""}`,
        observation_count: 0,
        image_url: null,
        source: "fgis_lk",
      });
    }

    return { species, raw };
  } catch (err) {
    console.error("ФГИС ЛК fetch error:", err);
    return { species: [], raw: [] };
  }
}

function isTreeGenus(latinName: string): boolean {
  const genus = latinName.split(" ")[0].toLowerCase();
  return TREE_GENERA.has(genus);
}

async function fetchInatSpecies(
  lat: number,
  lng: number,
  radiusKm = 5
): Promise<TreeSpecies[]> {
  try {
    // Query all Plantae (47126) broadly, then filter to tree genera on our side
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radiusKm.toString(),
      taxon_id: "47126", // Plantae
      quality_grade: "research",
      per_page: "100",
      locale: "ru",
    });

    const res = await fetch(`${INAT_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: TreeSpecies[] = [];

    for (const item of data.results || []) {
      const taxon = item.taxon;
      if (!taxon || taxon.rank !== "species") continue;
      if (!isTreeGenus(taxon.name)) continue;

      const genus = taxon.name.split(" ")[0].toLowerCase();

      results.push({
        latin_name: taxon.name,
        common_name: taxon.preferred_common_name || russianName(genus) || null,
        observation_count: item.count || 0,
        image_url:
          taxon.default_photo?.medium_url ||
          taxon.default_photo?.square_url ||
          null,
        source: "inaturalist",
      });
    }

    results.sort((a, b) => b.observation_count - a.observation_count);
    return results.slice(0, 20);
  } catch (err) {
    console.error("iNaturalist species fetch error:", err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const latStr = request.nextUrl.searchParams.get("lat");
  const lngStr = request.nextUrl.searchParams.get("lng");
  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const lat = roundCoord(parseFloat(latStr));
  const lng = roundCoord(parseFloat(lngStr));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  const force = request.nextUrl.searchParams.get("force") === "1";

  // Check cache first (rounded to 4 decimal places ~ 11m precision)
  if (!force) {
    const { data: cached } = await supabase
      .from("forest_info_cache")
      .select("data, created_at")
      .eq("lat", lat)
      .eq("lng", lng)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      if (age < THIRTY_DAYS) {
        return NextResponse.json({ forest_info: cached.data, from_cache: true });
      }
    }
  }

  // Fetch from all sources in parallel
  const [osmResult, fgisResult, inatSpecies, modisResult] = await Promise.all([
    fetchOsmForest(lat, lng),
    fetchFgisLk(lat, lng),
    fetchInatSpecies(lat, lng),
    getModisLandCover(lat, lng).catch(() => null),
  ]);

  // Merge species: ФГИС ЛК first (official data), then OSM, then iNaturalist
  const speciesMap = new Map<string, TreeSpecies>();

  for (const sp of fgisResult.species) {
    speciesMap.set(sp.latin_name.toLowerCase(), sp);
  }
  for (const sp of osmResult.osmSpecies) {
    const key = sp.latin_name.toLowerCase();
    if (!speciesMap.has(key)) {
      speciesMap.set(key, sp);
    }
  }
  for (const sp of inatSpecies) {
    const key = sp.latin_name.toLowerCase();
    if (speciesMap.has(key)) {
      const existing = speciesMap.get(key)!;
      if (!existing.common_name && sp.common_name)
        existing.common_name = sp.common_name;
      if (!existing.image_url && sp.image_url)
        existing.image_url = sp.image_url;
      if (sp.observation_count > existing.observation_count)
        existing.observation_count = sp.observation_count;
    } else {
      speciesMap.set(key, sp);
    }
  }

  const allSpecies = Array.from(speciesMap.values()).sort(
    (a, b) => b.observation_count - a.observation_count
  );

  // Determine forest type with priority: OSM tags > MODIS satellite > species inference
  let forestType = osmResult.forestType;
  let leafCycle = osmResult.leafCycle;

  if (forestType === "unknown" && modisResult?.forest_type) {
    forestType = modisResult.forest_type;
  }
  if (leafCycle === "unknown" && modisResult?.leaf_cycle) {
    leafCycle = modisResult.leaf_cycle;
  }
  if (forestType === "unknown" && allSpecies.length > 0) {
    forestType = inferForestType(allSpecies);
  }

  const modisData = modisResult
    ? {
        igbp_class: modisResult.igbp_class,
        igbp_name: modisResult.igbp_name,
        igbp_name_ru: modisResult.igbp_name_ru,
        is_forest: modisResult.is_forest,
      }
    : null;

  const forestInfo: ForestInfo = {
    forest_type: forestType,
    leaf_cycle: leafCycle,
    forest_name: osmResult.forestName,
    dominant_species: allSpecies,
    osm_tags: osmResult.osmTags,
    modis: modisData,
    fgis_lk: fgisResult.raw.length > 0 ? fgisResult.raw : null,
    fetched_at: new Date().toISOString(),
  };

  // Save to cache (upsert)
  await supabase.from("forest_info_cache").upsert(
    { lat, lng, data: forestInfo as unknown as Record<string, unknown> },
    { onConflict: "lat,lng" }
  );

  return NextResponse.json({ forest_info: forestInfo, from_cache: false });
}
