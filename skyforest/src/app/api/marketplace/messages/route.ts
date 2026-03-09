import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listingId = request.nextUrl.searchParams.get("listing_id");
  if (!listingId) {
    return NextResponse.json({ error: "listing_id required" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, buyer_id, status")
    .eq("id", listingId)
    .eq("status", "sold")
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.seller_id !== user.id && listing.buyer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error } = await supabase
    .from("marketplace_messages")
    .select("id, sender_id, message, created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }

  const partnerId =
    listing.seller_id === user.id ? listing.buyer_id : listing.seller_id;

  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("full_name, account_type")
    .eq("id", partnerId)
    .single();

  return NextResponse.json({
    messages: messages ?? [],
    partner: {
      id: partnerId,
      full_name: partnerProfile?.full_name ?? null,
      account_type: partnerProfile?.account_type ?? "user",
    },
    role: listing.seller_id === user.id ? "seller" : "buyer",
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const listingId = body?.listing_id;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!listingId || !message) {
    return NextResponse.json(
      { error: "listing_id and message required" },
      { status: 400 }
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Сообщение слишком длинное (макс. 2000 символов)" },
      { status: 400 }
    );
  }

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, buyer_id, status")
    .eq("id", listingId)
    .eq("status", "sold")
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.seller_id !== user.id && listing.buyer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: msg, error } = await supabase
    .from("marketplace_messages")
    .insert({
      listing_id: listingId,
      sender_id: user.id,
      message,
    })
    .select("id, sender_id, message, created_at")
    .single();

  if (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 500 });
  }

  return NextResponse.json({ message: msg });
}
