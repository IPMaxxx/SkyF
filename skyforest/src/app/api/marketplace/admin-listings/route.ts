import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(`
      id, seller_id, best_day_id, price, season, status, created_at,
      best_day:best_days (
        id, name, best_date, photos, weather_data,
        location:locations ( id, name, lat, lng, forest_info ),
        mushroom:mushroom_species ( id, latin_name, common_name, image_url )
      ),
      seller:profiles ( id, full_name, email, account_type )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin listings error:", error);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }

  const listings = (data || []).map((item: Record<string, unknown>) => {
    const bd = Array.isArray(item.best_day) ? item.best_day[0] : item.best_day;
    const seller = Array.isArray(item.seller) ? item.seller[0] : item.seller;

    return {
      id: item.id,
      seller_id: item.seller_id,
      best_day_id: item.best_day_id,
      price: item.price,
      season: item.season,
      status: item.status,
      created_at: item.created_at,
      best_day: bd ?? null,
      seller: seller ?? null,
    };
  });

  return NextResponse.json(
    { listings },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
