/**
 * Серверные хелперы для запросов к сторам о подписках:
 *  - Apple App Store Server API (Get All Subscription Statuses);
 *  - Google Play Developer API (purchases.subscriptionsv2.get).
 *
 * Используются роутом /api/native/iap/verify-subscription и кроном
 * /api/cron/subscriptions. Разовые покупки проверяет отдельный
 * роут /api/native/iap/verify (там свои копии токен-хелперов).
 */
import { createSign } from "node:crypto";

const BUNDLE_ID = process.env.IAP_BUNDLE_ID || "ai.skyforest.app";
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || "ai.skyforest.app";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeJwsPayload(jws: string): Record<string, unknown> | null {
  const parts = jws.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** Общая форма состояния подписки из стора. */
export interface StoreSubscriptionState {
  productId: string;
  /** appAccountToken (iOS) / obfuscatedExternalAccountId (Android) */
  accountRef: string | null;
  /** originalTransactionId (iOS); для Android ключ — сам purchaseToken */
  originalTransactionId: string | null;
  /** Начало текущего оплаченного периода, ms (может быть null у Android) */
  periodStartMs: number | null;
  /** Конец текущего оплаченного периода, ms */
  expiresMs: number | null;
  status: "active" | "grace" | "canceled" | "expired";
  /** Текущий период — бесплатный триал (урезанный бонус-пул). */
  isTrial: boolean;
}

// ---------------- Apple ----------------

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
 * Статус авто-возобновляемой подписки через App Store Server API
 * (Get All Subscription Statuses). transactionId — любой transactionId
 * подписки (в т.ч. originalTransactionId).
 */
export async function getAppleSubscription(
  transactionId: string,
  allowSandbox: boolean,
): Promise<StoreSubscriptionState | null> {
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
    const res = await fetch(
      `${host}/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 404) continue; // возможно, sandbox — следующий хост
    if (!res.ok) continue;
    const data = await res.json();

    const groups: Array<{ lastTransactions?: Array<Record<string, unknown>> }> =
      data?.data ?? [];
    for (const group of groups) {
      for (const last of group.lastTransactions ?? []) {
        const jws = last.signedTransactionInfo as string | undefined;
        const info = jws ? decodeJwsPayload(jws) : null;
        if (!info) continue;
        if (info.bundleId && info.bundleId !== BUNDLE_ID) continue;

        // status: 1 active, 2 expired, 3 billing retry, 4 grace, 5 revoked
        const appleStatus = Number(last.status);
        const renewalJws = last.signedRenewalInfo as string | undefined;
        const renewal = renewalJws ? decodeJwsPayload(renewalJws) : null;
        const autoRenew = renewal ? Number(renewal.autoRenewStatus) : 1;

        let status: StoreSubscriptionState["status"];
        if (appleStatus === 1) status = autoRenew === 0 ? "canceled" : "active";
        else if (appleStatus === 4) status = "grace";
        else status = "expired";

        // Триал: offerDiscountType FREE_TRIAL; фолбэк — offerType 1
        // (introductory offer; у нас единственный intro-оффер — бесплатный триал).
        const isTrial =
          info.offerDiscountType === "FREE_TRIAL" ||
          (info.offerDiscountType == null && Number(info.offerType) === 1);

        return {
          productId: String(info.productId ?? ""),
          accountRef:
            typeof info.appAccountToken === "string" ? info.appAccountToken : null,
          originalTransactionId: String(
            info.originalTransactionId ?? last.originalTransactionId ?? "",
          ) || null,
          periodStartMs:
            typeof info.purchaseDate === "number" ? info.purchaseDate : null,
          expiresMs:
            typeof info.expiresDate === "number" ? info.expiresDate : null,
          status,
          isTrial,
        };
      }
    }
  }
  return null;
}

// ---------------- Google ----------------

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

/** Статус подписки через purchases.subscriptionsv2.get. */
export async function getGoogleSubscription(
  purchaseToken: string,
): Promise<StoreSubscriptionState | null> {
  const accessToken = await googleAccessToken();
  if (!accessToken) throw new Error("google_not_configured");

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
    purchaseToken,
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();

  const line = (data.lineItems ?? [])[0] as
    | {
        productId?: string;
        expiryTime?: string;
        offerDetails?: { basePlanId?: string; offerId?: string };
      }
    | undefined;
  if (!line?.productId) return null;

  const state = String(data.subscriptionState ?? "");
  let status: StoreSubscriptionState["status"];
  if (state === "SUBSCRIPTION_STATE_ACTIVE") status = "active";
  else if (state === "SUBSCRIPTION_STATE_CANCELED") status = "canceled";
  else if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") status = "grace";
  else status = "expired";

  const expiresMs = line.expiryTime ? Date.parse(line.expiryTime) : null;
  const startMs = data.startTime ? Date.parse(data.startTime) : null;

  // Триал: покупка через offer (offerId у нас только на бесплатном триале)
  // и текущий период короткий (7 дней триала; после конверсии в платный
  // период expiryTime уходит от startTime на месяц/год).
  const isTrial = Boolean(
    line.offerDetails?.offerId &&
      startMs != null &&
      expiresMs != null &&
      Number.isFinite(expiresMs) &&
      expiresMs - startMs <= 8 * 24 * 3600 * 1000,
  );

  return {
    productId: line.productId,
    accountRef:
      typeof data.externalAccountIdentifiers?.obfuscatedExternalAccountId ===
      "string"
        ? data.externalAccountIdentifiers.obfuscatedExternalAccountId
        : null,
    originalTransactionId: null,
    periodStartMs: startMs,
    expiresMs: Number.isFinite(expiresMs) ? expiresMs : null,
    status,
    isTrial,
  };
}
