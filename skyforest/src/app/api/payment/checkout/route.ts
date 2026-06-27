import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBePaidCheckout } from "@/lib/payment";
import { createStripeCheckoutSession } from "@/lib/stripe";
import { BRAND } from "@/lib/brand";
import { TOKEN_PACKAGES, BULK_RATE } from "@/lib/tokens";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const packageId = body.package_id;

  let tokens: number;
  let price: number;

  if (packageId === "custom") {
    tokens = Math.floor(Number(body.tokens));
    if (!Number.isFinite(tokens) || tokens < 301 || tokens > 100000) {
      return NextResponse.json(
        { error: "Token amount must be between 301 and 100,000" },
        { status: 400 }
      );
    }
    price = parseFloat((tokens * BULK_RATE).toFixed(2));
  } else {
    const pack = TOKEN_PACKAGES.find((p) => p.id === packageId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }
    tokens = pack.tokens;
    price = pack.price;
  }

  const origin = request.nextUrl.origin;
  const description = `SkyForest: ${tokens} tokens`;
  const trackingUserId = `${user.id}:${tokens}`;

  try {
    if (BRAND.paymentProvider === "stripe") {
      const url = await createStripeCheckoutSession({
        amount: price,
        currency: BRAND.currency,
        description,
        email: user.email || "",
        userId: user.id,
        tokens,
        successUrl: `${origin}/payment/success?tokens=${tokens}`,
        cancelUrl: `${origin}/payment/fail`,
      });
      return NextResponse.json({ url });
    }

    const result = await createBePaidCheckout({
      amount: price,
      currency: BRAND.currency,
      description,
      email: user.email || "",
      userId: trackingUserId,
      successUrl: `${origin}/payment/success?tokens=${tokens}`,
      failUrl: `${origin}/payment/fail`,
      notificationUrl: `${origin}/api/payment/webhook`,
      language: BRAND.paymentLanguage,
    });

    if (result.checkout?.redirect_url) {
      return NextResponse.json({ url: result.checkout.redirect_url });
    }

    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  } catch (err) {
    console.error("Payment checkout error:", err);
    return NextResponse.json(
      { error: "Payment service error" },
      { status: 500 }
    );
  }
}
