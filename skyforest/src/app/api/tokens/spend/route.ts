import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TOKEN_COSTS } from "@/lib/tokens";

const VALID_ACTIONS = new Map<string, number>(
  Object.entries(TOKEN_COSTS).map(([key, cost]) => [key, cost])
);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, description, multiplier } = await request.json();

  if (!action || !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const baseAmount = VALID_ACTIONS.get(action)!;
  const safeMultiplier = Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 1000
    ? multiplier
    : 1;
  const amount = baseAmount * safeMultiplier;
  const sanitizedDescription = (description || "")
    .toString()
    .slice(0, 200)
    .replace(/[<>"']/g, "");

  const { data, error } = await supabase.rpc("spend_tokens", {
    p_user_id: user.id,
    p_amount: amount,
    p_description: sanitizedDescription || `API: ${action}`,
    p_use_bonus: true,
  });

  if (error) {
    console.error("Token spend error:", error);
    return NextResponse.json({ error: "Ошибка списания" }, { status: 500 });
  }

  const result = data as {
    success: boolean;
    error?: string;
    balance: number;
    real_balance?: number;
    bonus_balance?: number;
  };

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error === "insufficient" ? "Недостаточно токенов" : "Ошибка списания",
        balance: result.balance,
      },
      { status: 402 }
    );
  }

  return NextResponse.json({
    balance: result.balance,
    real_balance: result.real_balance ?? result.balance,
    bonus_balance: result.bonus_balance ?? 0,
  });
}
