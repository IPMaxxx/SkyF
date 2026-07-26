import { NextRequest, NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { creditTokenPurchase } from "@/lib/payment-credit";
import { iapProductFor } from "@/lib/native/iapProducts";

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

/**
 * Разрешён ли sandbox-фолбэк Apple для данного пользователя.
 * Вне продакшена — всегда; в продакшене — только для email из
 * IAP_SANDBOX_ALLOWLIST (тестировщики), иначе 404 от production-хоста = отказ.
 * Демо-аккаунт App Review разрешён всегда: ревьюеры Apple тестируют IAP
 * исключительно в песочнице (guideline 2.1(b)).
 */
const REVIEW_SANDBOX_EMAILS = ["appreview@skyforest.ai"];

function sandboxAllowed(userEmail: string | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const allowlist = [
    ...REVIEW_SANDBOX_EMAILS,
    ...(process.env.IAP_SANDBOX_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  ];
  return Boolean(userEmail && allowlist.includes(userEmail.toLowerCase()));
}

/**
 * Проверяет транзакцию через App Store Server API.
 * Возвращает productId и appAccountToken (привязка к пользователю) или null.
 */
async function verifyApple(
  transactionId: string,
  allowSandbox: boolean,
): Promise<{ productId: string; appAccountToken: string | null } | null> {
  const token = appleToken();
  if (!token) throw new Error("apple_not_configured");

  const hosts =
    process.env.APPLE_IAP_ENV === "sandbox"
      ? ["https://api.storekit-sandbox.itunes.apple.com"]
      : allowSandbox
        ? [
            "https://api.storekit.itunes.apple.com",
            "https://api.storekit-sandbox.itunes.apple.com",
          ]
        : ["https://api.storekit.itunes.apple.com"];

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
    if (info.productId) {
      return {
        productId: info.productId,
        appAccountToken: typeof info.appAccountToken === "string" ? info.appAccountToken : null,
      };
    }
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

/**
 * Проверяет покупку через Play Developer API.
 * Возвращает статус (purchased/pending/rejected) и
 * obfuscatedExternalAccountId (привязка к пользователю).
 */
async function verifyGoogle(
  productId: string,
  purchaseToken: string,
): Promise<{
  state: "purchased" | "pending" | "rejected";
  obfuscatedExternalAccountId: string | null;
}> {
  const accessToken = await googleAccessToken();
  if (!accessToken) throw new Error("google_not_configured");

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/purchases/products/${encodeURIComponent(
    productId,
  )}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { state: "rejected", obfuscatedExternalAccountId: null };
  const data = await res.json();
  // purchaseState: 0 = Purchased, 1 = Cancelled, 2 = Pending.
  // Pending важно НЕ помечать окончательным отказом: клиент не должен
  // финишировать (consume) незавершённую оплату.
  const state =
    data.purchaseState === 0 ? "purchased" : data.purchaseState === 2 ? "pending" : "rejected";
  return {
    state,
    obfuscatedExternalAccountId:
      typeof data.obfuscatedExternalAccountId === "string" ? data.obfuscatedExternalAccountId : null,
  };
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

  const product = iapProductFor(productId);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Unknown product" }, { status: 400 });
  }
  const tokens = product.tokens;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    let verifiedProductId: string | null = null;
    let paymentRef: string | null = null;
    let source: "app_store" | "google_play";
    // Кому начислять токены. По умолчанию — авторизованный пользователь.
    // Если чек привязан к ДРУГОМУ пользователю (appAccountToken / obfuscated
    // AccountId, которые мы сами кладём при order()), начисляем законному
    // владельцу из чека и отвечаем ok — иначе consumable-транзакция никогда
    // не финишируется и стор блокирует повторные покупки этого товара
    // (Google Play: ITEM_ALREADY_OWNED, окно оплаты не открывается вовсе).
    let creditUserId = user.id;

    // Сверка привязки чека к пользователю: клиент при order() передаёт
    // user.id (appAccountToken на iOS / obfuscatedAccountId на Android).
    // Если привязка отсутствует — переходный режим (старые/прерванные покупки
    // без привязки): начисляем текущему пользователю, но логируем warning.
    if (platform === "ios") {
      if (!transactionId) {
        return NextResponse.json({ ok: false, error: "transactionId required" }, { status: 400 });
      }
      const result = await verifyApple(transactionId, sandboxAllowed(user.email));
      if (!result || result.productId !== productId) {
        return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
      }
      if (result.appAccountToken) {
        if (result.appAccountToken.toLowerCase() !== user.id.toLowerCase()) {
          if (!UUID_RE.test(result.appAccountToken)) {
            console.error(
              `IAP verify: invalid appAccountToken in Apple transaction ${transactionId} (user ${user.id})`,
            );
            return NextResponse.json({ ok: false, error: "Account mismatch" }, { status: 403 });
          }
          console.warn(
            `IAP verify: appAccountToken mismatch (tx ${transactionId}, auth user ${user.id}) — crediting receipt owner ${result.appAccountToken}`,
          );
          creditUserId = result.appAccountToken.toLowerCase();
        }
      } else {
        console.warn(
          `IAP verify: no appAccountToken in Apple transaction ${transactionId} (user ${user.id}) — crediting in transitional mode`,
        );
      }
      verifiedProductId = result.productId;
      paymentRef = `ios:${transactionId}`;
      source = "app_store";
    } else if (platform === "android") {
      if (!purchaseToken) {
        return NextResponse.json({ ok: false, error: "purchaseToken required" }, { status: 400 });
      }
      const result = await verifyGoogle(productId, purchaseToken);
      if (result.state === "pending") {
        // Оплата ещё не завершена (например, отложенный платёж). НЕ 402:
        // клиент не должен финишировать транзакцию — стор доставит approved
        // повторно после завершения оплаты.
        return NextResponse.json({ ok: false, error: "Purchase pending" }, { status: 409 });
      }
      if (result.state !== "purchased") {
        return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
      }
      const receiptAccount = result.obfuscatedExternalAccountId;
      if (receiptAccount) {
        if (receiptAccount.toLowerCase() !== user.id.toLowerCase()) {
          if (!UUID_RE.test(receiptAccount)) {
            console.error(`IAP verify: invalid obfuscatedExternalAccountId (user ${user.id})`);
            return NextResponse.json({ ok: false, error: "Account mismatch" }, { status: 403 });
          }
          console.warn(
            `IAP verify: obfuscatedExternalAccountId mismatch (auth user ${user.id}) — crediting receipt owner ${receiptAccount}`,
          );
          creditUserId = receiptAccount.toLowerCase();
        }
      } else {
        console.warn(
          `IAP verify: no obfuscatedExternalAccountId in Google purchase (user ${user.id}) — crediting in transitional mode`,
        );
      }
      verifiedProductId = productId;
      paymentRef = `android:${purchaseToken}`;
      source = "google_play";
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported platform" }, { status: 400 });
    }

    if (!verifiedProductId || !paymentRef) {
      return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
    }

    const result = await creditTokenPurchase({
      userId: creditUserId,
      tokens,
      // Сумма и источник — чтобы IAP-покупки были видны в админке в разделе
      // оплат наравне со Stripe/bePaid: сумма — каталожная цена товара в USD
      // (стор подтвердил покупку; фактическая валюта списания может отличаться
      // по региону), источник — в payment_tracking_id.
      paymentId: paymentRef,
      paidMinorUnits: Math.round(product.priceUsd * 100),
      currency: "USD",
      trackingId: source,
      skipAmountCheck: true,
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
