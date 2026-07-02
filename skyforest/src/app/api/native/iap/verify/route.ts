import { NextRequest, NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { creditTokenPurchase } from "@/lib/payment-credit";
import { tokensForProduct } from "@/lib/native/iapProducts";

export const runtime = "nodejs";

const BUNDLE_ID = process.env.IAP_BUNDLE_ID || "ai.skyforest.app";
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || "ai.skyforest.app";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// ---------------- Apple (App Store Server API) ----------------

function appleToken(): string | null {
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  const key = process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !issuerId || !key) return null;

  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 600,
    aud: "appstoreconnect-v1",
    bid: BUNDLE_ID,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(signature)}`;
}

/** Проверяет транзакцию через App Store Server API. Возвращает productId или null. */
async function verifyApple(transactionId: string): Promise<{ productId: string } | null> {
  const token = appleToken();
  if (!token) throw new Error("apple_not_configured");

  const hosts =
    process.env.APPLE_IAP_ENV === "sandbox"
      ? ["https://api.storekit-sandbox.itunes.apple.com"]
      : [
          "https://api.storekit.itunes.apple.com",
          "https://api.storekit-sandbox.itunes.apple.com",
        ];

  for (const host of hosts) {
    const res = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) continue; // возможно, sandbox — пробуем следующий хост
    if (!res.ok) continue;
    const data = await res.json();
    // signedTransactionInfo — JWS; payload лежит во второй части.
    const jws: string | undefined = data.signedTransactionInfo;
    if (!jws) continue;
    const parts = jws.split(".");
    if (parts.length < 2) continue;
    const info = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    if (info.bundleId && info.bundleId !== BUNDLE_ID) return null;
    if (info.productId) return { productId: info.productId };
  }
  return null;
}

// ---------------- Google (Play Developer API) ----------------

async function googleAccessToken(): Promise<string | null> {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  if (!raw) return null;
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(sa.private_key.replace(/\\n/g, "\n"));
  const assertion = `${signingInput}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

/** Проверяет покупку через Play Developer API. Возвращает true, если куплено. */
async function verifyGoogle(productId: string, purchaseToken: string): Promise<boolean> {
  const accessToken = await googleAccessToken();
  if (!accessToken) throw new Error("google_not_configured");

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/purchases/products/${encodeURIComponent(
    productId,
  )}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return false;
  const data = await res.json();
  // purchaseState: 0 = Purchased, 1 = Cancelled, 2 = Pending
  return data.purchaseState === 0;
}

// ---------------- Route ----------------

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    platform?: string;
    productId?: string;
    transactionId?: string | null;
    purchaseToken?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, productId, transactionId, purchaseToken } = body;
  if (!platform || !productId) {
    return NextResponse.json(
      { ok: false, error: "platform and productId are required" },
      { status: 400 },
    );
  }

  const tokens = tokensForProduct(productId);
  if (!tokens) {
    return NextResponse.json({ ok: false, error: "Unknown product" }, { status: 400 });
  }

  try {
    let verifiedProductId: string | null = null;
    let paymentRef: string | null = null;

    if (platform === "ios") {
      if (!transactionId) {
        return NextResponse.json({ ok: false, error: "transactionId required" }, { status: 400 });
      }
      const result = await verifyApple(transactionId);
      if (!result || result.productId !== productId) {
        return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
      }
      verifiedProductId = result.productId;
      paymentRef = `ios:${transactionId}`;
    } else if (platform === "android") {
      if (!purchaseToken) {
        return NextResponse.json({ ok: false, error: "purchaseToken required" }, { status: 400 });
      }
      const ok = await verifyGoogle(productId, purchaseToken);
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
      }
      verifiedProductId = productId;
      paymentRef = `android:${purchaseToken}`;
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported platform" }, { status: 400 });
    }

    if (!verifiedProductId || !paymentRef) {
      return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
    }

    const result = await creditTokenPurchase({
      userId: user.id,
      tokens,
      paymentId: paymentRef,
      paidMinorUnits: null, // сумма подтверждена сторой; проверка суммы не нужна
      currency: "USD",
      trackingId: paymentRef,
    });

    return NextResponse.json({ ok: true, status: result.status, tokens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg.endsWith("_not_configured")) {
      return NextResponse.json(
        { ok: false, error: "IAP verification is not configured on the server" },
        { status: 503 },
      );
    }
    console.error("IAP verify error:", msg);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
