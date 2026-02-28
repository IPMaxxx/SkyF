import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radiusKm = request.nextUrl.searchParams.get("radius_km");

  if (!lat || !lng || !radiusKm) {
    return NextResponse.json({ listings: [] });
  }

  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);
  const pRadius = parseFloat(radiusKm);

  if (isNaN(pLat) || isNaN(pLng) || isNaN(pRadius) || pRadius <= 0 || pRadius > 500) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("search_marketplace_listings", {
    p_lat: pLat,
    p_lng: pLng,
    p_radius_km: pRadius,
  });

  if (error) {
    console.error("Marketplace search error:", error);
    return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}
