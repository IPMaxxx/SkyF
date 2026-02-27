import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyBePaidWebhook } from "@/lib/payment";
import { TOKEN_PACKAGES } from "@/lib/tokens";

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

  const validPackage = TOKEN_PACKAGES.find((p) => p.tokens === tokens);
  if (!validPackage) {
    console.error("Webhook: token amount does not match any package:", tokens);
    return NextResponse.json({ error: "Invalid token amount" }, { status: 400 });
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

  return NextResponse.json({ status: "ok", result: data });
}
