import { NextRequest, NextResponse } from "next/server";

interface TaxonPhoto {
  photo: {
    medium_url?: string;
    large_url?: string;
    square_url?: string;
    attribution?: string;
  };
}

interface Ancestor {
  rank: string;
  name: string;
  preferred_common_name?: string;
}

interface TaxonResult {
  id: number;
  name: string;
  preferred_common_name?: string;
  wikipedia_summary?: string;
  wikipedia_url?: string;
  observations_count?: number;
  taxon_photos?: TaxonPhoto[];
  ancestors?: Ancestor[];
  default_photo?: { medium_url?: string };
}

const RANK_LABELS: Record<string, string> = {
  kingdom: "Царство",
  phylum: "Отдел",
  subphylum: "Подотдел",
  class: "Класс",
  subclass: "Подкласс",
  order: "Порядок",
  suborder: "Подпорядок",
  family: "Семейство",
  genus: "Род",
  species: "Вид",
};

const VISIBLE_RANKS = ["kingdom", "phylum", "class", "order", "family", "genus"];

export async function GET(request: NextRequest) {
  const inatId = request.nextUrl.searchParams.get("inaturalist_id");

  if (!inatId) {
    return NextResponse.json({ error: "inaturalist_id required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/${inatId}?locale=ru`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    const taxon: TaxonResult | undefined = data.results?.[0];

    if (!taxon) {
      return NextResponse.json({ error: "Taxon not found" }, { status: 404 });
    }

    const photos = (taxon.taxon_photos || [])
      .slice(0, 8)
      .map((tp) => ({
        url: tp.photo.large_url || tp.photo.medium_url || tp.photo.square_url || "",
        attribution: tp.photo.attribution || "",
      }))
      .filter((p) => p.url);

    const taxonomy = (taxon.ancestors || [])
      .filter((a) => VISIBLE_RANKS.includes(a.rank))
      .map((a) => ({
        rank: a.rank,
        rank_label: RANK_LABELS[a.rank] || a.rank,
        name: a.name,
        common_name: a.preferred_common_name || null,
      }));

    const cleanSummary = (taxon.wikipedia_summary || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json({
      id: taxon.id,
      latin_name: taxon.name,
      common_name: taxon.preferred_common_name || null,
      wikipedia_summary: cleanSummary || null,
      wikipedia_url: taxon.wikipedia_url || null,
      observations_count: taxon.observations_count || 0,
      photos,
      taxonomy,
    });
  } catch (err) {
    console.error("iNaturalist details error:", err);
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 });
  }
}
