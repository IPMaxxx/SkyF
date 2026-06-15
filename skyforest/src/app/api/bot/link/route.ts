import { NextRequest, NextResponse } from "next/server";
import { verifyBotRequest, createBotServiceClient } from "@/lib/botAuth";

export const dynamic = "force-dynamic";

// POST /api/bot/link { telegram_id, link_code } — привязка аккаунта по коду.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyBotRequest(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { telegram_id?: number; link_code?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const telegramId = Number(body.telegram_id);
  const code = (body.link_code ?? "").trim();
  if (!Number.isFinite(telegramId) || telegramId <= 0 || !code) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createBotServiceClient();
  const { data, error } = await admin.rpc("mushroom_bot_link", {
    p_telegram_id: telegramId,
    p_code: code,
  });

  if (error) {
    return NextResponse.json({ error: "link_failed" }, { status: 500 });
  }

  const result = (data ?? {}) as {
    success?: boolean;
    linked?: boolean;
    user_id?: string;
    error?: string;
  };

  if (!result.success || !result.linked) {
    // 422 — бот трактует как «код неверный или истёк» (LinkError).
    return NextResponse.json(
      { linked: false, error: result.error ?? "invalid_code" },
      { status: 422 }
    );
  }

  return NextResponse.json({ linked: true, user_id: result.user_id });
}
