import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Действие запрещено",
  not_found: "Тур не найден",
  not_active: "Аукцион недоступен",
  not_started: "Аукцион ещё не начался",
  ended: "Аукцион уже завершён",
  too_low: "Ставка ниже минимально допустимой",
  insufficient: "Недостаточно токенов. Для ставки нужен 1 купленный токен (бонусные не подходят).",
  no_account: "Аккаунт не найден",
  invalid_amount: "Некорректная сумма",
};

// POST /api/tours/[id]/bid — place a bid (1 real token per action).
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Укажите сумму ставки" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("place_tour_bid", {
    p_tour_id: id,
    p_user_id: user.id,
    p_amount: amount,
  });

  if (error) {
    console.error("place_tour_bid RPC error:", error);
    return NextResponse.json({ error: "Ошибка ставки" }, { status: 500 });
  }

  const result = data as {
    success: boolean;
    error?: string;
    participant_no?: number;
    best_amount?: number;
    balance?: number;
    min_required?: number;
    auction_end_at?: string;
  };

  if (!result.success) {
    const msg = ERROR_MESSAGES[result.error ?? ""] ?? "Не удалось сделать ставку";
    const detail =
      result.error === "too_low" && result.min_required != null
        ? `${msg} (минимум ${result.min_required})`
        : msg;
    const status = result.error === "insufficient" ? 402 : 400;
    return NextResponse.json(
      { error: detail, min_required: result.min_required, balance: result.balance },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    participant_no: result.participant_no,
    best_amount: result.best_amount,
    balance: result.balance,
    auction_end_at: result.auction_end_at,
  });
}
