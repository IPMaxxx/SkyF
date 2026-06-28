import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tours — list published & finished tours.
// Lazily finalizes any auctions whose deadline has passed.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Close out any auctions that have ended (idempotent, safe to call often)
  await supabase.rpc("finalize_due_auctions");

  const { data, error } = await supabase
    .from("mushroom_tours")
    .select(
      "id, title, description, departure_lat, departure_lng, departure_desc, mushroom_species, mushroom_image_url, tour_date, departure_time, spots, auction_start_at, auction_end_at, start_price, bid_step, currency, status, followers_count, notifications_sent_at, finished_at, created_at"
    )
    .in("status", ["announced", "published", "finished"])
    .order("auction_start_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Tours list error:", error);
    return NextResponse.json({ error: "Ошибка загрузки туров" }, { status: 500 });
  }

  // Which of these tours the current user already follows (no personal data leaked)
  const { data: follows } = await supabase
    .from("tour_followers")
    .select("tour_id")
    .eq("user_id", user.id);

  return NextResponse.json(
    { tours: data ?? [], following: (follows ?? []).map((f) => f.tour_id) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
