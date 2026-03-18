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

  const { data, error } = await supabase.rpc("buy_marketplace_listing", {
    p_listing_id: listing_id,
    p_buyer_id: user.id,
  });

  if (error) {
    console.error("Marketplace buy RPC error:", error);
    return NextResponse.json({ error: "Ошибка покупки" }, { status: 500 });
  }

  const result = data as {
    success: boolean;
    error?: string;
    balance?: number;
    new_bestday_id?: string;
  };

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Листинг не найден или уже продан",
      own_listing: "Нельзя купить свой собственный Best Day",
      insufficient: "Недостаточно токенов. Для покупок на маркетплейсе используются только купленные токены (бонусные не подходят).",
      bestday_missing: "Best Day больше не существует",
      ip_conflict: "Покупка невозможна",
      no_account: "Аккаунт не найден",
    };
    return NextResponse.json(
      {
        error: messages[result.error ?? ""] ?? "Ошибка покупки",
        balance: result.balance,
      },
      { status: 402 }
    );
  }

  return NextResponse.json({
    success: true,
    new_bestday_id: result.new_bestday_id,
    balance: result.balance,
  });
}
