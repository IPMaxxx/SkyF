import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") || "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // iNaturalist taxa API — search for fungi (iconic_taxa=Fungi)
    const params = new URLSearchParams({
      q: query,
      taxon_id: "47170", // Fungi kingdom
      rank: "species",
      per_page: "10",
      locale: "ru",
    });

    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa?${params}`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();

    const results = (data.results || []).map(
      (taxon: {
        id: number;
        name: string;
        preferred_common_name?: string;
        default_photo?: { medium_url?: string; square_url?: string };
      }) => ({
        inaturalist_id: taxon.id,
        latin_name: taxon.name,
        common_name: taxon.preferred_common_name || null,
        image_url: taxon.default_photo?.medium_url || taxon.default_photo?.square_url || null,
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("iNaturalist search error:", err);
    return NextResponse.json({ results: [] });
  }
}
