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
      "id, title, description, departure_lat, departure_lng, departure_desc, mushroom_species, tour_date, departure_time, spots, auction_start_at, auction_end_at, start_price, bid_step, currency, status, finished_at, created_at"
    )
    .in("status", ["published", "finished"])
    .order("auction_start_at", { ascending: true });

  if (error) {
    console.error("Tours list error:", error);
    return NextResponse.json({ error: "Ошибка загрузки туров" }, { status: 500 });
  }

  return NextResponse.json(
    { tours: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
