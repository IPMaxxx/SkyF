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

  const { listing_id, partner_id } = await request.json();

  if (!listing_id || !partner_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await supabase.from("marketplace_chat_reads").upsert(
    {
      user_id: user.id,
      listing_id,
      partner_id,
      read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,listing_id,partner_id" }
  );

  return NextResponse.json({ ok: true });
}
