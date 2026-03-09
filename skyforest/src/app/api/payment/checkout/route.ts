import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBePaidCheckout } from "@/lib/payment";
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
      return NextResponse.json({ error: "Количество токенов: 301–100 000" }, { status: 400 });
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

  try {
    const result = await createBePaidCheckout({
      amount: price,
      currency: "BYN",
      description: `Skyforest: ${tokens} токенов`,
      email: user.email || "",
      userId: `${user.id}:${tokens}`,
      successUrl: `${origin}/payment/success?tokens=${tokens}`,
      failUrl: `${origin}/payment/fail`,
      notificationUrl: `${origin}/api/payment/webhook`,
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
