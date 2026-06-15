import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/mushroom-bot/link-code — сгенерировать одноразовый код привязки
// Telegram-аккаунта (действует 15 минут).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("mushroom_bot_create_link_code", {
    p_user_id: user.id,
  });

  if (error || !data?.success) {
    return NextResponse.json(
      { error: data?.error ?? "Не удалось создать код" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    code: data.code,
    expires_at: data.expires_at,
  });
}
