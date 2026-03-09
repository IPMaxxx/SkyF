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

  const { listing_id } = await request.json();

  if (!listing_id) {
    return NextResponse.json({ error: "listing_id required" }, { status: 400 });
  }

  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: listing } = await adminSupabase
    .from("marketplace_listings")
    .select("id, seller_id")
    .eq("id", listing_id)
    .eq("seller_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Листинг не найден или недоступен" }, { status: 404 });
  }

  const { error } = await adminSupabase
    .from("marketplace_listings")
    .update({ status: "cancelled" })
    .eq("id", listing_id);

  if (error) {
    console.error("Delist error:", error);
    return NextResponse.json({ error: "Ошибка снятия с продажи" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
