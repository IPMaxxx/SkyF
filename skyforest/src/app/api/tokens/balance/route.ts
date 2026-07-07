import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("token_balances")
    .select("balance, bonus_balance, total_purchased, total_spent, total_earned, total_withdrawn")
    .eq("user_id", user.id)
    .single();

  const balance = data?.balance ?? 0;
  const earned = data?.total_earned ?? 0;
  const withdrawn = data?.total_withdrawn ?? 0;

  return NextResponse.json({
    balance,
    bonus_balance: data?.bonus_balance ?? 0,
    total_purchased: data?.total_purchased ?? 0,
    total_spent: data?.total_spent ?? 0,
    // Доступно к выводу: только доход с маркетплейса минус уже выведенное
    // (купленные и бонусные токены выводу не подлежат — политика сторов).
    withdrawable: Math.max(0, Math.min(balance, earned - withdrawn)),
    total_earned: earned,
    total_withdrawn: withdrawn,
  });
}
