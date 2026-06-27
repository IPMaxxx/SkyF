import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyStripeWebhook } from "@/lib/stripe";
import {
  creditTokenPurchase,
  isValidTokenAmount,
} from "@/lib/payment-credit";
import { BRAND } from "@/lib/brand";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = verifyStripeWebhook(body, signature);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ status: "ignored" });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ status: "ignored" });
  }

  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const tokens = parseInt(metadata.tokens || "", 10);
  const trackingId =
    metadata.tracking_id || (userId ? `${userId}:${tokens}` : "");

  if (!userId || !trackingId || isNaN(tokens) || tokens <= 0) {
    console.error("Stripe webhook: invalid metadata", metadata);
    return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
  }

  if (!isValidTokenAmount(tokens)) {
    console.error("Stripe webhook: invalid token amount:", tokens);
    return NextResponse.json({ error: "Invalid token amount" }, { status: 400 });
  }

  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.id;

  const paidMinorUnits =
    typeof session.amount_total === "number" ? session.amount_total : null;
  const currency = session.currency?.toUpperCase() || BRAND.currency;

  try {
    const result = await creditTokenPurchase({
      userId,
      tokens,
      paymentId,
      paidMinorUnits,
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
