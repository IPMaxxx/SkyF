import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const MAX_GRANT = 100_000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    user_id?: string;
    amount?: number;
    kind?: string;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetUserId = (body.user_id || "").trim();
  const amount = Number(body.amount);
  const kind = body.kind === "bonus" ? "bonus" : "balance";
  const comment = (body.comment || "").trim().slice(0, 200);

  if (!targetUserId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_GRANT) {
    return NextResponse.json(
      { error: `amount must be an integer between 1 and ${MAX_GRANT}` },
      { status: 400 }
    );
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Проверяем, что пользователь существует (иначе RPC молча создаст
  // осиротевшую строку token_balances).
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json(
      { error: "Пользователь не найден" },
      { status: 404 }
    );
  }

  const description = comment
    ? `Начисление администратором: ${comment}`
    : "Начисление администратором";
  // Уникальный payment_id — идемпотентность add_bonus_tokens + след админа в логе
  const paymentId = `admin-grant:${user.id}:${Date.now()}`;

  const rpcResult =
    kind === "bonus"
      ? await admin.rpc("add_bonus_tokens", {
          p_user_id: targetUserId,
          p_amount: amount,
          p_description: description,
          p_payment_id: paymentId,
        })
      : await admin.rpc("add_tokens", {
          p_user_id: targetUserId,
          p_amount: amount,
          p_type: "bonus",
          p_description: description,
          p_payment_id: paymentId,
        });

  if (rpcResult.error) {
    return NextResponse.json(
      { error: "RPC failed", details: rpcResult.error.message },
      { status: 500 }
    );
  }

  const rpcData = rpcResult.data as {
    success?: boolean;
    error?: string;
  } | null;
  if (rpcData && rpcData.success === false) {
    return NextResponse.json(
      { error: rpcData.error || "RPC rejected" },
      { status: 500 }
    );
  }

  const { data: tb } = await admin
    .from("token_balances")
    .select("balance, bonus_balance, total_purchased, total_spent, total_earned, updated_at")
    .eq("user_id", targetUserId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    granted: amount,
    kind,
    token_balance: tb ?? null,
  });
}
