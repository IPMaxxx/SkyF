import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("marketplace_listings")
    .update({ status: "cancelled" })
    .eq("id", listing_id)
    .eq("seller_id", user.id)
    .eq("status", "active");

  if (error) {
    console.error("Delist error:", error);
    return NextResponse.json({ error: "Ошибка снятия с продажи" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
