import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, id } = body as { type: string; id: string };

  if (!type || !id) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  if (type === "location") {
    const { data: loc } = await admin
      .from("locations")
      .select("*")
      .eq("id", id)
      .single();

    if (!loc) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (loc.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: relatedBestDays } = await admin
      .from("best_days")
      .select("*, location:locations(name, lat, lng), mushroom:mushroom_species(latin_name, common_name, image_url)")
      .eq("location_id", id);

    await admin.from("deleted_locations").insert({
      original_id: loc.id,
      user_id: loc.user_id,
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      forest_info: loc.forest_info,
      original_created_at: loc.created_at,
      deleted_by_user_id: user.id,
    });

    if (relatedBestDays && relatedBestDays.length > 0) {
      const archiveBds = relatedBestDays.map((bd: Record<string, unknown>) => {
        const location = bd.location as Record<string, unknown> | null;
        const mushroom = bd.mushroom as Record<string, unknown> | null;
        return {
          original_id: bd.id,
          user_id: bd.user_id,
          location_id: bd.location_id,
          mushroom_id: bd.mushroom_id,
          name: bd.name,
          best_date: bd.best_date,
          weather_data: bd.weather_data,
          photos: bd.photos,
          purchased_from_listing_id: bd.purchased_from_listing_id,
          location_name: location?.name ?? loc.name,
          location_lat: location?.lat ?? loc.lat,
          location_lng: location?.lng ?? loc.lng,
          mushroom_latin_name: (mushroom?.latin_name as string) ?? null,
          mushroom_common_name: (mushroom?.common_name as string) ?? null,
          mushroom_image_url: (mushroom?.image_url as string) ?? null,
          original_created_at: bd.created_at,
          deleted_by_user_id: user.id,
        };
      });
      await admin.from("deleted_best_days").insert(archiveBds);
    }

    return NextResponse.json({ ok: true });
  }

  if (type === "best_day") {
    const { data: bd } = await admin
      .from("best_days")
      .select("*, location:locations(name, lat, lng), mushroom:mushroom_species(latin_name, common_name, image_url)")
      .eq("id", id)
      .single();

    if (!bd) {
      return NextResponse.json({ error: "Best day not found" }, { status: 404 });
    }

    if (bd.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const location = bd.location as Record<string, unknown> | null;
    const mushroom = bd.mushroom as Record<string, unknown> | null;

    await admin.from("deleted_best_days").insert({
      original_id: bd.id,
      user_id: bd.user_id,
      location_id: bd.location_id,
      mushroom_id: bd.mushroom_id,
      name: bd.name,
      best_date: bd.best_date,
      weather_data: bd.weather_data,
      photos: bd.photos,
      purchased_from_listing_id: bd.purchased_from_listing_id,
      location_name: (location?.name as string) ?? null,
      location_lat: (location?.lat as number) ?? null,
      location_lng: (location?.lng as number) ?? null,
      mushroom_latin_name: (mushroom?.latin_name as string) ?? null,
      mushroom_common_name: (mushroom?.common_name as string) ?? null,
      mushroom_image_url: (mushroom?.image_url as string) ?? null,
      original_created_at: bd.created_at,
      deleted_by_user_id: user.id,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
