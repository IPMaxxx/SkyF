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
    .select("balance, bonus_balance, total_purchased, total_spent")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    balance: data?.balance ?? 0,
    bonus_balance: data?.bonus_balance ?? 0,
    total_purchased: data?.total_purchased ?? 0,
    total_spent: data?.total_spent ?? 0,
  });
}
