import { NextRequest, NextResponse } from "next/server";
import { verifyBotRequest, createBotServiceClient } from "@/lib/botAuth";

export const dynamic = "force-dynamic";

// POST /api/bot/consume { telegram_id, request_id } — списать 1 распознавание.
// Идемпотентно по request_id.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyBotRequest(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { telegram_id?: number; request_id?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const telegramId = Number(body.telegram_id);
  const requestId = (body.request_id ?? "").trim();
  if (!Number.isFinite(telegramId) || telegramId <= 0 || !requestId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createBotServiceClient();
  const { data, error } = await admin.rpc("mushroom_bot_consume", {
    p_telegram_id: telegramId,
    p_request_id: requestId,
  });

  if (error) {
    return NextResponse.json({ error: "consume_failed" }, { status: 500 });
  }

  const result = (data ?? {}) as {
    success?: boolean;
    remaining?: number;
    error?: string;
  };

  const remaining = Number(result.remaining ?? 0);

  return NextResponse.json({
    success: Boolean(result.success),
    remaining,
    subscription: { active: remaining > 0, period_end: null },
    ...(result.error ? { error: result.error } : {}),
  });
}
