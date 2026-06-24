import { NextRequest, NextResponse } from "next/server";
import { verifyBePaidWebhook } from "@/lib/payment";
import {
  creditTokenPurchase,
  isValidTokenAmount,
} from "@/lib/payment-credit";
import { BRAND } from "@/lib/brand";

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

  const paidCents =
    typeof transaction.amount === "number" ? transaction.amount : null;
  const currency =
    typeof transaction.currency === "string"
      ? transaction.currency
      : BRAND.currency;

  try {
    const result = await creditTokenPurchase({
      userId,
      tokens,
      paymentId,
      paidMinorUnits: paidCents,
      currency,
      trackingId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing error";
    if (message === "Amount mismatch") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
