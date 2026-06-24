import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe credentials not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

interface StripeCheckoutParams {
  amount: number;
  currency: string;
  description: string;
  email: string;
  userId: string;
  tokens: number;
  successUrl: string;
  cancelUrl: string;
}

export async function createStripeCheckoutSession(
  params: StripeCheckoutParams
): Promise<string> {
  const stripe = getStripe();
  const trackingId = `${params.userId}:${params.tokens}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.email,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: Math.round(params.amount * 100),
          product_data: {
            name: params.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: params.userId,
      tokens: String(params.tokens),
      tracking_id: trackingId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

export function verifyStripeWebhook(
  body: string,
  signature: string | null
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Stripe webhook secret not configured");
  }
  if (!signature) {
    throw new Error("Missing stripe-signature header");
  }
  return getStripe().webhooks.constructEvent(body, signature, secret);
}
