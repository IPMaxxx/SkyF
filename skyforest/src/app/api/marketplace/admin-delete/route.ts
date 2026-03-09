import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const LISTING_FEE_REFUND = 10;

export async function POST(request: NextRequest) {
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

  const { listing_id } = await request.json();
  if (!listing_id) {
    return NextResponse.json({ error: "listing_id required" }, { status: 400 });
  }

  const { data: listing, error: fetchErr } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, status")
    .eq("id", listing_id)
    .single();

  if (fetchErr || !listing) {
    return NextResponse.json({ error: "Листинг не найден" }, { status: 404 });
  }

  if (listing.status !== "active") {
    return NextResponse.json({ error: "Листинг уже неактивен" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("marketplace_listings")
    .update({ status: "cancelled" })
    .eq("id", listing_id);

  if (updateErr) {
    console.error("Admin delete listing error:", updateErr);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }

  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { error: refundErr } = await adminSupabase.rpc("add_tokens", {
    p_user_id: listing.seller_id,
    p_amount: LISTING_FEE_REFUND,
    p_type: "refund",
    p_description: "Возврат за размещение — локация удалена администратором",
  });

  if (refundErr) {
    console.error("Refund error:", refundErr);
  }

  return NextResponse.json({ success: true });
}
