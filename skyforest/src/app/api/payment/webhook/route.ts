import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyBePaidWebhook } from "@/lib/payment";
import { TOKEN_PACKAGES, BULK_RATE } from "@/lib/tokens";

const MAX_CUSTOM_TOKENS = 100000;

function isValidTokenAmount(tokens: number): boolean {
  if (TOKEN_PACKAGES.some((p) => p.tokens === tokens)) return true;
  return Number.isInteger(tokens) && tokens >= 301 && tokens <= MAX_CUSTOM_TOKENS;
}

function getExpectedPriceCents(tokens: number): number {
  const pkg = TOKEN_PACKAGES.find((p) => p.tokens === tokens);
  if (pkg) return Math.round(pkg.price * 100);
  return Math.round(tokens * BULK_RATE * 100);
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  const authHeader = request.headers.get("authorization");

  if (!verifyBePaidWebhook(authHeader)) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transaction = payload.transaction;
  if (!transaction) {
    return NextResponse.json({ error: "No transaction" }, { status: 400 });
  }

  const status = transaction.status;
  const trackingId = transaction.tracking_id as string;
  const paymentId = transaction.uid;

  if (status !== "successful" || !trackingId) {
    return NextResponse.json({ status: "ignored" });
  }

  const [userId, tokensStr] = trackingId.split(":");
  const tokens = parseInt(tokensStr);

  if (!userId || isNaN(tokens) || tokens <= 0) {
    return NextResponse.json({ error: "Invalid tracking_id" }, { status: 400 });
  }

  if (!isValidTokenAmount(tokens)) {
    console.error("Webhook: invalid token amount:", tokens);
    return NextResponse.json({ error: "Invalid token amount" }, { status: 400 });
  }

  const paidCents = transaction.amount;
  const expectedCents = getExpectedPriceCents(tokens);
  if (typeof paidCents === "number" && paidCents < expectedCents) {
    console.error(`Webhook: paid ${paidCents} < expected ${expectedCents} for ${tokens} tokens`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: existingTx } = await supabase
    .from("token_transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json({ status: "already_processed" });
  }

  const { data, error } = await supabase.rpc("add_tokens", {
    p_user_id: userId,
    p_amount: tokens,
    p_type: "purchase",
    p_description: `Покупка ${tokens} токенов`,
    p_payment_id: paymentId,
  });

  if (error) {
    console.error("Token add error:", error);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  // Apply referral bonus: +10% to buyer, 10% to referrer
  const { data: bonusResult, error: bonusError } = await supabase.rpc(
    "apply_referral_purchase_bonus",
    {
      p_buyer_id: userId,
      p_purchased_tokens: tokens,
      p_payment_id: paymentId,
    }
  );

  if (bonusError) {
    console.error("Referral bonus error (non-fatal):", bonusError);
  }

  return NextResponse.json({ status: "ok", result: data, referral_bonus: bonusResult });
}
