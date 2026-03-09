import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function sanitizeListings(data: unknown) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const previewPhoto =
      Array.isArray(item?.best_day?.photos) && item.best_day.photos.length > 0
        ? [item.best_day.photos[0]]
        : [];

    return {
      id: item?.id,
      seller_id: item?.seller_id,
      best_day_id: item?.best_day_id,
      price: item?.price,
      season: item?.season,
      status: item?.status,
      buyer_id: item?.buyer_id ?? null,
      sold_at: item?.sold_at ?? null,
      created_at: item?.created_at,
      best_day: item?.best_day
        ? {
            id: item.best_day.id,
            name: item.best_day.name,
            photos: previewPhoto,
            mushroom: item.best_day.mushroom
              ? {
                  id: item.best_day.mushroom.id,
                  inaturalist_id: item.best_day.mushroom.inaturalist_id,
                  latin_name: item.best_day.mushroom.latin_name,
                  common_name: item.best_day.mushroom.common_name,
                  image_url: item.best_day.mushroom.image_url,
                }
              : null,
          }
        : null,
      seller: item?.seller
        ? {
            id: item.seller.id,
            full_name: item.seller.full_name ?? null,
            account_type: item.seller.account_type ?? "user",
          }
        : null,
    };
  });
}

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

  if (isNaN(pLat) || isNaN(pLng) || isNaN(pRadius) || pRadius <= 0 || pRadius > 1000) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  return noStoreJson({ error: "Use POST" }, 405);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = (await request.json().catch(() => null)) as
    | { lat?: number; lng?: number; radius_km?: number }
    | null;

  const pLat = typeof body?.lat === "number" ? body.lat : NaN;
  const pLng = typeof body?.lng === "number" ? body.lng : NaN;
  const pRadius = typeof body?.radius_km === "number" ? body.radius_km : NaN;

  if (isNaN(pLat) || isNaN(pLng) || isNaN(pRadius) || pRadius <= 0 || pRadius > 1000) {
    return noStoreJson({ error: "Invalid params" }, 400);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("search_marketplace_listings", {
    p_lat: pLat,
    p_lng: pLng,
    p_radius_km: pRadius,
    p_user_id: user?.id ?? null,
  });

  if (error) {
    console.error("Marketplace search error:", error);
    return noStoreJson({ error: "Ошибка поиска" }, 500);
  }

  const sanitizedListings = sanitizeListings(data);

  return noStoreJson({ listings: sanitizedListings });
}
