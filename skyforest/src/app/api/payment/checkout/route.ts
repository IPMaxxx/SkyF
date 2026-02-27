import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBePaidCheckout } from "@/lib/payment";
import { TOKEN_PACKAGES } from "@/lib/tokens";

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
  const pack = TOKEN_PACKAGES.find((p) => p.id === packageId);

  if (!pack) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const origin = request.nextUrl.origin;

  try {
    const result = await createBePaidCheckout({
      amount: pack.price,
      currency: "BYN",
      description: `Skyforest: ${pack.tokens} токенов`,
      email: user.email || "",
      userId: `${user.id}:${pack.tokens}`,
      successUrl: `${origin}/payment/success?tokens=${pack.tokens}`,
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
