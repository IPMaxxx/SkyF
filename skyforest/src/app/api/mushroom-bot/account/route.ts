import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/mushroom-bot/account — состояние привязки и баланс бота для текущего
// пользователя (кабинет).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("mushroom_bot_accounts")
    .select("telegram_id, balance, total_added, total_consumed, linked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(
    {
      linked: Boolean(data?.telegram_id),
      telegram_id: data?.telegram_id ?? null,
      bot_balance: data?.balance ?? 0,
      total_added: data?.total_added ?? 0,
      total_consumed: data?.total_consumed ?? 0,
      linked_at: data?.linked_at ?? null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
