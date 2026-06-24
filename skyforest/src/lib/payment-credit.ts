import { createServerClient } from "@supabase/ssr";
import { TOKEN_PACKAGES, BULK_RATE } from "@/lib/tokens";
import { BRAND } from "@/lib/brand";

const MAX_CUSTOM_TOKENS = 100000;

export function isValidTokenAmount(tokens: number): boolean {
  if (TOKEN_PACKAGES.some((p) => p.tokens === tokens)) return true;
  return Number.isInteger(tokens) && tokens >= 301 && tokens <= MAX_CUSTOM_TOKENS;
}

export function getExpectedPriceMinorUnits(tokens: number): number {
  const pkg = TOKEN_PACKAGES.find((p) => p.tokens === tokens);
  const amount = pkg ? pkg.price : tokens * BULK_RATE;
  // Stripe uses cents; bePaid uses minor units (kopecks) for BYN
  return Math.round(amount * 100);
}

function getSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export interface CreditPurchaseParams {
  userId: string;
  tokens: number;
  paymentId: string;
  paidMinorUnits: number | null;
  currency: string;
  trackingId: string;
}

export async function creditTokenPurchase(
  params: CreditPurchaseParams
): Promise<{ status: string; result?: unknown; referral_bonus?: unknown }> {
  const { userId, tokens, paymentId, paidMinorUnits, currency, trackingId } =
    params;

  const supabase = getSupabaseAdmin();

  const { data: existingTx } = await supabase
    .from("token_transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingTx) {
    return { status: "already_processed" };
  }

  const expectedMinor = getExpectedPriceMinorUnits(tokens);
  if (
    typeof paidMinorUnits === "number" &&
    paidMinorUnits < expectedMinor
  ) {
    console.error(
      `Payment credit: paid ${paidMinorUnits} < expected ${expectedMinor} for ${tokens} tokens`
    );
    throw new Error("Amount mismatch");
  }

  const { data, error } = await supabase.rpc("add_tokens", {
    p_user_id: userId,
    p_amount: tokens,
    p_type: "purchase",
    p_description: `Purchase of ${tokens} tokens`,
    p_payment_id: paymentId,
    p_payment_amount_cents: paidMinorUnits,
    p_payment_currency: currency || BRAND.currency,
    p_payment_tracking_id: trackingId,
  });

  if (error) {
    console.error("Token add error:", error);
    throw new Error("Processing error");
  }

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

  return { status: "ok", result: data, referral_bonus: bonusResult };
}
