const BEPAID_CHECKOUT_URL = "https://checkout.bepaid.by/ctp/api/checkouts";

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  email: string;
  userId: string;
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
  language?: string;
}

interface CheckoutResponse {
  checkout?: {
    redirect_url?: string;
    token?: string;
  };
  message?: string;
  errors?: Record<string, string[]>;
}

export async function createBePaidCheckout(
  params: PaymentRequest
): Promise<CheckoutResponse> {
  const shopId = process.env.BEPAID_SHOP_ID;
  const secretKey = process.env.BEPAID_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("bePaid credentials not configured");
  }

  const body = {
    checkout: {
      test: process.env.NODE_ENV !== "production",
      transaction_type: "payment",
      attempts: 3,
      settings: {
        success_url: params.successUrl,
        decline_url: params.failUrl,
        fail_url: params.failUrl,
        notification_url: params.notificationUrl,
        language: params.language || "ru",
        customer_fields: {
          visible: ["email"],
          read_only: ["email"],
        },
      },
      order: {
        amount: Math.round(params.amount * 100),
        currency: params.currency,
        description: params.description,
        tracking_id: params.userId,
      },
      customer: {
        email: params.email,
      },
    },
  };

  const res = await fetch(BEPAID_CHECKOUT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

export function verifyBePaidWebhook(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const shopId = process.env.BEPAID_SHOP_ID;
  const secretKey = process.env.BEPAID_SECRET_KEY;
  if (!shopId || !secretKey) return false;

  const prefix = "Basic ";
  if (!authHeader.startsWith(prefix)) return false;

  const encoded = authHeader.slice(prefix.length);

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return false;
  }

  const expected = `${shopId}:${secretKey}`;

  if (decoded.length !== expected.length) return false;

  const crypto = require("crypto");
  return crypto.timingSafeEqual(
    Buffer.from(decoded),
    Buffer.from(expected)
  );
}
