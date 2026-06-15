import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/mushroom-bot/transfer { amount } — перевести реальные токены с
// аккаунта на баланс Telegram-бота (1 токен = 1 распознавание).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { amount?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Math.floor(Number(payload.amount));
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json(
      { error: "Минимум для перевода — 1 токен" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("mushroom_bot_transfer", {
    p_user_id: user.id,
    p_amount: amount,
  });

  if (error) {
    return NextResponse.json({ error: "Ошибка перевода" }, { status: 500 });
  }

  if (!data?.success) {
    const msg =
      data?.error === "insufficient"
        ? "Недостаточно токенов на балансе (бонусные токены переводить нельзя)"
        : data?.error === "invalid_amount"
          ? "Некорректная сумма"
          : "Не удалось выполнить перевод";
    return NextResponse.json(
      { error: msg, token_balance: data?.token_balance },
      { status: 402 }
    );
  }

  return NextResponse.json({
    success: true,
    transferred: data.transferred,
    token_balance: data.token_balance,
    bot_balance: data.bot_balance,
  });
}
