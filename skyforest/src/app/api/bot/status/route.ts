import { NextRequest, NextResponse } from "next/server";
import { verifyBotRequest, createBotServiceClient } from "@/lib/botAuth";

export const dynamic = "force-dynamic";

// GET /api/bot/status?telegram_id=123 — статус платного доступа для бота.
export async function GET(request: NextRequest) {
  // Для GET тело пустое — бот подписывает body = "".
  if (!verifyBotRequest(request, "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const telegramId = Number(searchParams.get("telegram_id"));
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    return NextResponse.json({ error: "Invalid telegram_id" }, { status: 400 });
  }

  const admin = createBotServiceClient();
  const { data, error } = await admin.rpc("mushroom_bot_status", {
    p_telegram_id: telegramId,
  });

  if (error) {
    return NextResponse.json({ error: "status_failed" }, { status: 500 });
  }

  const result = (data ?? {}) as {
    linked?: boolean;
    remaining?: number;
    token_balance?: number | null;
  };

  const remaining = Number(result.remaining ?? 0);

  return NextResponse.json(
    {
      linked: Boolean(result.linked),
      subscription: { active: remaining > 0, period_end: null },
      remaining,
      token_balance: result.token_balance ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
