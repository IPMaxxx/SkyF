import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeason } from "@/lib/supabase/types";

const LISTING_FEE = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { best_day_id, price } = await request.json();
  const numericPrice = Number(price);

  if (!best_day_id || !Number.isFinite(numericPrice) || numericPrice < 1) {
    return NextResponse.json(
      { error: "Цена должна быть не менее 1 токена" },
      { status: 400 }
    );
  }

  // Check balance for listing fee
  const { data: balanceData } = await supabase.rpc("get_token_balance", {
    p_user_id: user.id,
  });

  if (!balanceData || balanceData < LISTING_FEE) {
    return NextResponse.json(
      { error: `Недостаточно токенов. Для размещения нужно ${LISTING_FEE} токенов` },
      { status: 400 }
    );
  }

  const { data: bd, error: bdErr } = await supabase
    .from("best_days")
    .select("*")
    .eq("id", best_day_id)
    .eq("user_id", user.id)
    .single();

  if (bdErr || !bd) {
    return NextResponse.json(
      { error: "Best Day не найден или не принадлежит вам" },
      { status: 404 }
    );
  }

  if (bd.purchased_from_listing_id) {
    return NextResponse.json(
      { error: "Купленные грибные дни нельзя перепродавать" },
      { status: 403 }
    );
  }

  if (!bd.photos || bd.photos.length === 0) {
    return NextResponse.json(
      { error: "Добавьте хотя бы одно фото, чтобы выставить Best Day на продажу" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("best_day_id", best_day_id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Этот Best Day уже выставлен на продажу" },
      { status: 409 }
    );
  }

  const season = getSeason(bd.best_date);

  const { data: listing, error: insertErr } = await supabase
    .from("marketplace_listings")
    .insert({
      seller_id: user.id,
      best_day_id,
      price: Math.floor(numericPrice),
      season,
    })
    .select("*")
    .single();

  if (insertErr) {
    console.error("Marketplace list error:", insertErr);
    return NextResponse.json({ error: "Ошибка создания листинга" }, { status: 500 });
  }

  // Charge listing fee
  const { error: feeErr } = await supabase.rpc("spend_tokens", {
    p_user_id: user.id,
    p_amount: LISTING_FEE,
    p_description: "Размещение на маркетплейсе",
  });

  if (feeErr) {
    console.error("Listing fee error:", feeErr);
  }

  return NextResponse.json({ listing });
}
