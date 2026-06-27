import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tours/[id] — tour details + anonymized leaderboard.
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Finalize this auction if its deadline has passed (idempotent)
  await supabase.rpc("finalize_tour_auction", { p_tour_id: id });

  const { data: tour, error: tourErr } = await supabase
    .from("mushroom_tours")
    .select(
      "id, title, description, departure_lat, departure_lng, departure_desc, mushroom_species, mushroom_image_url, tour_date, departure_time, spots, auction_start_at, auction_end_at, start_price, bid_step, currency, anti_snipe_seconds, confirm_window_hours, status, finished_at, created_at"
    )
    .eq("id", id)
    .in("status", ["published", "finished"])
    .maybeSingle();

  if (tourErr || !tour) {
    return NextResponse.json({ error: "Тур не найден" }, { status: 404 });
  }

  const { data: board, error: boardErr } = await supabase.rpc("get_tour_leaderboard", {
    p_tour_id: id,
  });

  if (boardErr) {
    console.error("Tour leaderboard error:", boardErr);
    return NextResponse.json({ error: "Ошибка загрузки аукциона" }, { status: 500 });
  }

  return NextResponse.json(
    { tour, board },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
