import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { createClient } from "@/lib/supabase/server";
import { getModisLandCover } from "@/lib/gee";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const FGIS_LK_WMS = "https://pub.fgislk.gov.ru/map/geo/geoserver/wms";
const INAT_URL = "https://api.inaturalist.org/v1/observations/species_counts";

const TREE_GENERA = new Set([
  "pinus", "picea", "abies", "larix", "juniperus", "thuja", "taxus",
  "betula", "quercus", "alnus", "populus", "acer", "tilia", "salix",
  "fraxinus", "ulmus", "carpinus", "corylus", "sorbus", "fagus",
  "prunus", "malus", "robinia", "castanea",
]);

const CONIFEROUS_GENERA = new Set(["pinus", "picea", "abies", "larix", "juniperus", "thuja", "taxus"]);

const RU_SPECIES_TO_GENUS: Record<string, string> = {
  "сосна": "pinus", "ель": "picea", "береза": "betula", "берёза": "betula",
  "дуб": "quercus", "ольха": "alnus", "осина": "populus", "клен": "acer",
  "клён": "acer", "липа": "tilia", "ива": "salix", "тополь": "populus",
  "ясень": "fraxinus", "вяз": "ulmus", "граб": "carpinus", "лещина": "corylus",
  "рябина": "sorbus", "бук": "fagus", "лиственница": "larix", "пихта": "abies",
  "можжевельник": "juniperus", "кедр": "pinus",
};

const URBAN_TAGS = new Set(["park", "garden", "playground", "recreation_ground"]);

// ─── Utilities ───

// Dedicated agent for FGIS LK only — their TLS cert is not in the
// default CA bundle. The agent is scoped so the bypass never leaks
// to other outbound requests.
const fgisAgent = new https.Agent({
  rejectUnauthorized: false,
  maxSockets: 4,
  timeout: 15000,
});

function fetchFgis(rawUrl: string, timeoutMs = 15000): Promise<string> {
  const parsed = new URL(rawUrl);
  return new Promise((resolve, reject) => {
    const req = https.get(parsed, { agent: fgisAgent, timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyGenus(genus: string): "coniferous" | "broadleaved" {
  return CONIFEROUS_GENERA.has(genus.toLowerCase()) ? "coniferous" : "broadleaved";
}

// ─── Grid generation: 3×3 + center = 10 points in a 1km circle ───

function generateGrid(centerLat: number, centerLng: number): Array<{ lat: number; lng: number }> {
  const stepM = 570;
  const dLat = stepM / 111320;
  const dLng = stepM / (111320 * Math.cos(centerLat * Math.PI / 180));

  const points: Array<{ lat: number; lng: number }> = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      points.push({
        lat: centerLat + row * dLat,
        lng: centerLng + col * dLng,
      });
    }
  }
  points.push({ lat: centerLat, lng: centerLng });
  return points;
}

// ─── Data fetchers for individual points ───

async function queryFgisLkPoint(lat: number, lng: number): Promise<string | null> {
  try {
    const d = 0.001;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const params = new URLSearchParams({
      SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetFeatureInfo",
      LAYERS: "FOREST_LAYERS:TAXATION_PIECE_PVS",
      QUERY_LAYERS: "FOREST_LAYERS:TAXATION_PIECE_PVS",
      INFO_FORMAT: "application/json", SRS: "EPSG:4326",
      BBOX: bbox, WIDTH: "256", HEIGHT: "256", X: "128", Y: "128",
      FEATURE_COUNT: "1",
    });
    const raw = await fetchFgis(`${FGIS_LK_WMS}?${params}`, 10000);
    const trimmed = raw.trimStart();
    if (trimmed.startsWith("<") || !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return null;
    }
    const data = JSON.parse(raw);
    return data.features?.[0]?.properties?.tree_species || null;
  } catch {
    return null;
  }
}

async function fetchInatGenera(lat: number, lng: number, radiusKm = 2): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(), lng: lng.toString(),
      radius: radiusKm.toString(),
      taxon_id: "47126",
      quality_grade: "research",
      per_page: "50",
      locale: "ru",
    });
    const res = await fetch(`${INAT_URL}?${params}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const genera: string[] = [];
    for (const item of data.results || []) {
      const taxon = item.taxon;
      if (!taxon || taxon.rank !== "species") continue;
      const genus = taxon.name.split(" ")[0].toLowerCase();
      if (TREE_GENERA.has(genus) && !genera.includes(genus)) genera.push(genus);
    }
    return genera;
  } catch {
    return [];
  }
}

// ─── Forest Pattern: aggregated data from 10 points ───

export interface ForestPattern {
  lat: number;
  lng: number;
  genera: string[];
  dominant_species: string | null;
  forest_type: "coniferous" | "broadleaved" | "mixed" | "unknown";
  /** Stable IGBP land-cover class code (MODIS MCD12Q1 LC_Type1, 1..17). The
   *  client localizes it via the `igbp` message namespace. */
  modis_class: number | null;
  modis_is_forest: boolean | null;
  fgis_species_list: string[];
  points_sampled: number;
}

async function collectPattern(centerLat: number, centerLng: number): Promise<ForestPattern> {
  const grid = generateGrid(centerLat, centerLng);
  const BATCH = 5;

  const allGenera = new Set<string>();
  const fgisSpeciesCounts = new Map<string, number>();
  const fgisSpeciesList: string[] = [];

  for (let i = 0; i < grid.length; i += BATCH) {
    const batch = grid.slice(i, i + BATCH);
    const [fgisResults, inatResults] = await Promise.all([
      Promise.all(batch.map((p) => queryFgisLkPoint(p.lat, p.lng))),
      Promise.all(batch.map((p) => fetchInatGenera(p.lat, p.lng))),
    ]);

    for (let j = 0; j < batch.length; j++) {
      const species = fgisResults[j];
      if (species) {
        const count = fgisSpeciesCounts.get(species) || 0;
        fgisSpeciesCounts.set(species, count + 1);
        const genus = RU_SPECIES_TO_GENUS[species.toLowerCase()];
        if (genus) allGenera.add(genus);
        if (!fgisSpeciesList.includes(species)) fgisSpeciesList.push(species);
      }

      for (const g of inatResults[j]) {
        allGenera.add(g);
      }
    }
  }

  // Dominant species by majority vote
  let dominant: string | null = null;
  let maxCount = 0;
  for (const [sp, count] of fgisSpeciesCounts) {
    if (count > maxCount) { dominant = sp; maxCount = count; }
  }

  // Infer forest type from genera
  let conifCount = 0;
  let broadCount = 0;
  for (const g of allGenera) {
    if (CONIFEROUS_GENERA.has(g)) conifCount++;
    else broadCount++;
  }
  const total = conifCount + broadCount;
  let forestType: ForestPattern["forest_type"] = "unknown";
  if (total > 0) {
    const ratio = conifCount / total;
    if (ratio > 0.7) forestType = "coniferous";
    else if (ratio < 0.3) forestType = "broadleaved";
    else forestType = "mixed";
  }

  // MODIS for center point only
  const modis = await getModisLandCover(centerLat, centerLng).catch(() => null);

  return {
    lat: centerLat,
    lng: centerLng,
    genera: Array.from(allGenera),
    dominant_species: dominant,
    forest_type: forestType,
    modis_class: modis?.igbp_class ?? null,
    modis_is_forest: modis?.is_forest ?? null,
    fgis_species_list: fgisSpeciesList,
    points_sampled: grid.length,
  };
}

// ─── OSM forest polygons + clustering ───

interface OsmForestPolygon {
  id: number;
  center?: { lat: number; lon: number };
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
}

async function findOsmForests(lat: number, lng: number, radiusM: number): Promise<OsmForestPolygon[]> {
  const query = `
[out:json][timeout:30];
(
  way(around:${radiusM},${lat},${lng})["landuse"="forest"]["leisure"!~"park|garden"];
  way(around:${radiusM},${lat},${lng})["natural"="wood"]["leisure"!~"park|garden"];
  relation(around:${radiusM},${lat},${lng})["landuse"="forest"]["leisure"!~"park|garden"];
  relation(around:${radiusM},${lat},${lng})["natural"="wood"]["leisure"!~"park|garden"];
);
out center tags bb;
`;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.elements || []) as OsmForestPolygon[];
}

function clusterForests(
  polygons: OsmForestPolygon[],
  searchLat: number,
  searchLng: number,
  radiusM: number,
  maxClusters = 10
): Array<{ lat: number; lng: number; name: string | null }> {
  // Filter and deduplicate
  const points: Array<{ lat: number; lng: number; area: number; name: string | null }> = [];

  for (const f of polygons) {
    if (!f.center) continue;
    const lat = f.center.lat;
    const lng = f.center.lon;
    const tags = f.tags || {};

    if (distanceM(searchLat, searchLng, lat, lng) > radiusM) continue;
    if (URBAN_TAGS.has(tags.leisure || "")) continue;

    let area = 0;
    if (f.bounds) {
      area = (f.bounds.maxlat - f.bounds.minlat) * (f.bounds.maxlon - f.bounds.minlon);
    }
    if (area > 0 && area < 0.0000003) continue;

    points.push({
      lat, lng, area,
      name: tags["name:ru"] || tags.name || null,
    });
  }

  // Sort by area descending
  points.sort((a, b) => b.area - a.area);

  // Greedy clustering: pick a point, remove all within 2km
  const clusters: Array<{ lat: number; lng: number; name: string | null }> = [];
  const used = new Set<number>();

  for (let i = 0; i < points.length && clusters.length < maxClusters; i++) {
    if (used.has(i)) continue;
    clusters.push({ lat: points[i].lat, lng: points[i].lng, name: points[i].name });
    used.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (!used.has(j) && distanceM(points[i].lat, points[i].lng, points[j].lat, points[j].lng) < 2000) {
        used.add(j);
      }
    }
  }

  return clusters;
}

/**
 * Generate evenly spaced scan points within a radius.
 * Uses concentric rings: center + ring at 50% radius + ring at 100% radius.
 * Returns up to `count` points.
 */
function generateScanPoints(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  count: number
): Array<{ lat: number; lng: number; name: string | null }> {
  const points: Array<{ lat: number; lng: number; name: string | null }> = [];

  // Always include center. Name is left null so the client falls back to a
  // localized "block #n" label instead of a hardcoded string.
  points.push({ lat: centerLat, lng: centerLng, name: null });
  if (points.length >= count) return points.slice(0, count);

  const rings = [
    { radiusFraction: 0.5, pointCount: Math.min(4, count - 1) },
    { radiusFraction: 1.0, pointCount: Math.min(6, count - 1 - Math.min(4, count - 1)) },
  ];

  for (const ring of rings) {
    const ringRadiusM = radiusKm * 1000 * ring.radiusFraction;
    const dLat = ringRadiusM / 111320;
    const dLng = ringRadiusM / (111320 * Math.cos(centerLat * Math.PI / 180));

    for (let k = 0; k < ring.pointCount && points.length < count; k++) {
      const angle = (2 * Math.PI * k) / ring.pointCount;
      points.push({
        lat: centerLat + dLat * Math.sin(angle),
        lng: centerLng + dLng * Math.cos(angle),
        name: null,
      });
    }
  }

  return points.slice(0, count);
}

// ─── Pattern comparison ───

/** Values interpolated into a localized reason string on the client.
 *  `string[]` carries genus keys; numbers carry IGBP class codes. */
export type ReasonParams = Record<string, string | number | string[] | number[]>;

export interface ScoreBreakdownItem {
  score: number;
  max: number;
  /** Stable code resolved to a localized string on the client
   *  (see src/lib/forestSearchReason.ts). */
  reasonCode: string;
  reasonParams?: ReasonParams;
}

export interface ScoreBreakdown {
  genera_overlap: ScoreBreakdownItem;
  dominant_species: ScoreBreakdownItem;
  forest_type: ScoreBreakdownItem;
  modis: ScoreBreakdownItem;
}

export interface ForestMatch {
  lat: number;
  lng: number;
  similarity: number;
  breakdown: ScoreBreakdown;
  pattern: ForestPattern;
  name: string | null;
}

function comparePatterns(ref: ForestPattern, cand: ForestPattern): { total: number; breakdown: ScoreBreakdown } {
  // 1. Genera overlap — Jaccard similarity (max 50)
  let generaScore = 0;
  let generaCode = "";
  let generaParams: ReasonParams | undefined;
  if (ref.genera.length > 0 && cand.genera.length > 0) {
    const candSet = new Set(cand.genera);
    const intersection = ref.genera.filter((g) => candSet.has(g));
    const unionSize = new Set([...ref.genera, ...cand.genera]).size;
    const jaccard = unionSize > 0 ? intersection.length / unionSize : 0;
    generaScore = Math.round(jaccard * 50);
    if (intersection.length > 0) {
      generaCode = "generaJaccard";
      generaParams = {
        pct: Math.round(jaccard * 100),
        matched: intersection.length,
        total: unionSize,
        genera: intersection,
      };
    } else {
      generaCode = "generaNoCommon";
      generaParams = { genera: ref.genera };
    }
  } else if (cand.genera.length > 0) {
    generaCode = "generaCandidateOnly";
    generaParams = { genera: cand.genera };
  } else if (ref.genera.length > 0) {
    generaCode = "generaNoCandidate";
  } else {
    generaCode = "generaNone";
  }

  // 2. Dominant species match (max 20)
  let domScore = 0;
  let domCode = "";
  let domParams: ReasonParams | undefined;
  if (ref.dominant_species && cand.dominant_species) {
    const refGenus = RU_SPECIES_TO_GENUS[ref.dominant_species.toLowerCase()];
    const candGenus = RU_SPECIES_TO_GENUS[cand.dominant_species.toLowerCase()];
    if (refGenus && candGenus) {
      domParams = { ref: ref.dominant_species, cand: cand.dominant_species };
      if (refGenus === candGenus) {
        domScore = 20;
        domCode = "domMatch";
      } else if (classifyGenus(refGenus) === classifyGenus(candGenus)) {
        domScore = 12;
        domCode = "domSameGroup";
      } else {
        domScore = 2;
        domCode = "domDiffGroup";
      }
    }
  } else if (cand.dominant_species) {
    domCode = "domCandidateOnly";
    domParams = { cand: cand.dominant_species };
  } else {
    domCode = "domNone";
  }

  // 3. Forest type match (max 20)
  let typeScore = 0;
  let typeCode = "";
  let typeParams: ReasonParams | undefined;
  if (ref.forest_type !== "unknown" && cand.forest_type !== "unknown") {
    if (ref.forest_type === cand.forest_type) {
      typeScore = 20;
      typeCode = "typeMatch";
      typeParams = { type: ref.forest_type };
    } else if (ref.forest_type === "mixed" || cand.forest_type === "mixed") {
      typeScore = 12;
      typeCode = "typePartialMixed";
    } else {
      typeScore = 0;
      typeCode = "typeMismatch";
      typeParams = { ref: ref.forest_type, cand: cand.forest_type };
    }
  } else if (cand.forest_type === "unknown" && ref.forest_type === "unknown") {
    typeScore = 10;
    typeCode = "typeBothUnknown";
  } else {
    typeScore = 5;
    typeCode = "typeOneUnknown";
  }

  // 4. MODIS match (max 10)
  let modisScore = 0;
  let modisCode = "";
  let modisParams: ReasonParams | undefined;
  if (ref.modis_class && cand.modis_class) {
    if (ref.modis_class === cand.modis_class) {
      modisScore = 10;
      modisCode = "modisMatch";
      modisParams = { igbp: cand.modis_class };
    } else if (cand.modis_is_forest) {
      modisScore = 5;
      modisCode = "modisBothForest";
      modisParams = { ref: ref.modis_class, cand: cand.modis_class };
    } else {
      modisCode = "modisCandidateNotForest";
      modisParams = { cand: cand.modis_class };
    }
  } else {
    modisCode = "modisUnavailable";
  }

  // Normalize by available data
  const raw = generaScore + domScore + typeScore + modisScore;
  let maxAchievable = 20; // forest_type always counts
  if (ref.genera.length > 0 && cand.genera.length > 0) maxAchievable += 50;
  if (ref.dominant_species && cand.dominant_species) maxAchievable += 20;
  if (ref.modis_class && cand.modis_class) maxAchievable += 10;
  if (maxAchievable === 0) maxAchievable = 20;

  const total = Math.min(100, Math.round(raw * 100 / maxAchievable));

  return {
    total,
    breakdown: {
      genera_overlap: { score: generaScore, max: 50, reasonCode: generaCode, reasonParams: generaParams },
      dominant_species: { score: domScore, max: 20, reasonCode: domCode, reasonParams: domParams },
      forest_type: { score: typeScore, max: 20, reasonCode: typeCode, reasonParams: typeParams },
      modis: { score: modisScore, max: 10, reasonCode: modisCode, reasonParams: modisParams },
    },
  };
}

// ─── POST handler ───

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ref_lat, ref_lng, search_lat, search_lng, radius_km } = body as {
    ref_lat: number; ref_lng: number;
    search_lat: number; search_lng: number;
    radius_km: number;
  };

  if (!ref_lat || !search_lat || !radius_km) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const clampedRadius = Math.min(radius_km, 20);
  const tokenCost = Math.max(2, 2 * Math.ceil(clampedRadius / 2));

  // Поиск леса — дорогая процедура: в подписку не входит и всегда
  // оплачивается токенами (в т.ч. подписчиками — на это идут бонус-токены).
  const { data: spent, error: spendErr } = await supabase.rpc("spend_tokens", {
    p_user_id: user.id,
    p_amount: tokenCost,
    p_description: `Поиск леса (${clampedRadius} км)`,
  });
  if (spendErr || !spent?.success) {
    return NextResponse.json(
      { error: `Недостаточно токенов (нужно ${tokenCost})` },
      { status: 402 }
    );
  }

  // Step 1: Collect reference pattern (10 points in 1km circle)
  const refPattern = await collectPattern(ref_lat, ref_lng);

  // Step 2: Find forest massifs in search radius via OSM
  const radiusM = clampedRadius * 1000;
  const osmForests = await findOsmForests(search_lat, search_lng, radiusM);
  const osmMassifs = clusterForests(osmForests, search_lat, search_lng, radiusM);

  // Step 2b: If OSM gave fewer than 10 massifs, fill with grid scan points
  const TARGET_ZONES = 10;
  let scanZones: Array<{ lat: number; lng: number; name: string | null }>;

  if (osmMassifs.length >= TARGET_ZONES) {
    scanZones = osmMassifs.slice(0, TARGET_ZONES);
  } else {
    // Start with OSM massifs, then add grid points that don't overlap
    const gridPoints = generateScanPoints(search_lat, search_lng, clampedRadius, TARGET_ZONES);
    scanZones = [...osmMassifs];

    for (const gp of gridPoints) {
      if (scanZones.length >= TARGET_ZONES) break;
      const tooClose = scanZones.some(
        (z) => distanceM(z.lat, z.lng, gp.lat, gp.lng) < 1500
      );
      if (!tooClose) {
        scanZones.push(gp);
      }
    }
  }

  // Step 3: Collect pattern for each zone (10 points × data sources)
  const matches: ForestMatch[] = [];
  const MASSIF_BATCH = 2;

  for (let i = 0; i < scanZones.length; i += MASSIF_BATCH) {
    const batch = scanZones.slice(i, i + MASSIF_BATCH);
    const patterns = await Promise.all(
      batch.map((m) => collectPattern(m.lat, m.lng))
    );

    for (let j = 0; j < batch.length; j++) {
      const candPattern = patterns[j];
      const { total, breakdown } = comparePatterns(refPattern, candPattern);

      matches.push({
        lat: batch[j].lat,
        lng: batch[j].lng,
        similarity: total,
        breakdown,
        pattern: candPattern,
        name: batch[j].name,
      });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  const statsObj = {
    polygons: osmForests.length,
    osmMassifs: osmMassifs.length,
    scanZones: scanZones.length,
  };

  // Persist to history (don't block response)
  supabase
    .from("forest_search_history")
    .insert({
      user_id: user.id,
      ref_lat, ref_lng,
      search_lat, search_lng,
      radius_km: clampedRadius,
      token_cost: tokenCost,
      ref_pattern: refPattern as unknown as Record<string, unknown>,
      matches: matches as unknown as Record<string, unknown>[],
      stats: statsObj,
    })
    .then(({ error }) => {
      if (error) console.error("Failed to save forest search history:", error);
    });

  return NextResponse.json({
    matches,
    ref_pattern: refPattern,
    total_osm_polygons: osmForests.length,
    total_osm_massifs: osmMassifs.length,
    total_scan_zones: scanZones.length,
  });
}
