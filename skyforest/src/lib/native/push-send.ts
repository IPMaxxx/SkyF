/**
 * Серверная отправка push-уведомлений на устройства пользователя.
 *  - iOS  → APNs (token-based auth, .p8 ключ);
 *  - Android → FCM HTTP v1 (service account Firebase).
 *
 * Токены берутся из таблицы push_tokens (patch-v38). Если креды не заданы
 * в env — функция тихо ничего не делает (no-op), чтобы не ломать основной поток.
 *
 * Требуемые env:
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (PEM), APNS_TOPIC(=bundleId), APNS_ENV(prod|sandbox)
 *
 * FCM (два взаимоисключающих способа доступа):
 *   1) Workload Identity Federation (без ключа SA, рекомендуется на Vercel):
 *        GCP_WORKLOAD_IDENTITY_PROVIDER — ресурс провайдера
 *          (projects/NUM/locations/global/workloadIdentityPools/POOL/providers/PROVIDER
 *           либо уже полный audience, начинающийся с //iam.googleapis.com/)
 *        GCP_SERVICE_ACCOUNT_EMAIL — SA, которую имперсонируем
 *        FCM_PROJECT_ID (опц., по умолчанию skyforest-ai)
 *   2) Ключ сервис-аккаунта (fallback):
 *        FCM_SERVICE_ACCOUNT (JSON строкой)
 */
import { createSign } from "node:crypto";
import { createServerClient } from "@supabase/ssr";

export interface PushMessage {
  title: string;
  body: string;
  /** Внутренняя ссылка приложения, куда вести по тапу (например /dashboard/marketplace/chats) */
  link?: string;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function admin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

// ---------------- APNs ----------------

let apnsTokenCache: { token: string; exp: number } | null = null;

function apnsToken(): string | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const key = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !key) return null;

  const now = Math.floor(Date.now() / 1000);
  if (apnsTokenCache && apnsTokenCache.exp > now + 60) return apnsTokenCache.token;

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  const token = `${signingInput}.${b64url(signature)}`;
  apnsTokenCache = { token, exp: now + 3000 }; // APNs токен живёт до 60 мин
  return token;
}

async function sendApns(deviceToken: string, msg: PushMessage): Promise<boolean> {
  const auth = apnsToken();
  const topic = process.env.APNS_TOPIC || "ai.skyforest.app";
  if (!auth) return false;
  const host =
    process.env.APNS_ENV === "sandbox"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";
  try {
    const res = await fetch(`${host}/3/device/${deviceToken}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${auth}`,
        "apns-topic": topic,
        "apns-push-type": "alert",
      },
      body: JSON.stringify({
        aps: { alert: { title: msg.title, body: msg.body }, sound: "default" },
        link: msg.link ?? null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------- FCM v1 ----------------

/** Есть ли настроенный WIF-путь (без ключа SA). */
function wifConfigured(): boolean {
  return Boolean(process.env.GCP_WORKLOAD_IDENTITY_PROVIDER && process.env.GCP_SERVICE_ACCOUNT_EMAIL);
}

/** Есть ли хотя бы один настроенный способ доступа к FCM. */
function fcmConfigured(): boolean {
  return wifConfigured() || Boolean(process.env.FCM_SERVICE_ACCOUNT);
}

// Кэш итогового FCM access-token (общий для обоих путей): ~50 минут.
let fcmTokenCache: { token: string; projectId: string; exp: number } | null = null;

/** Токен Vercel OIDC для обмена в Google STS. */
async function getOidcToken(): Promise<string | null> {
  try {
    const mod = await import("@vercel/functions/oidc");
    const token = await mod.getVercelOidcToken();
    if (token) return token;
  } catch {
    // Пакет/раннер недоступен — падаем на env-переменную ниже.
  }
  return process.env.VERCEL_OIDC_TOKEN ?? null;
}

/**
 * Получить FCM access-token через Workload Identity Federation.
 * Обменивает Vercel OIDC → Google STS federated token → имперсонация SA.
 */
async function fcmAccessTokenViaWIF(): Promise<{ token: string; projectId: string } | null> {
  const providerRaw = process.env.GCP_WORKLOAD_IDENTITY_PROVIDER;
  const saEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (!providerRaw || !saEmail) return null;

  const projectId = process.env.FCM_PROJECT_ID || "skyforest-ai";
  const audience = providerRaw.startsWith("//iam.googleapis.com/")
    ? providerRaw
    : `//iam.googleapis.com/${providerRaw}`;

  const oidcToken = await getOidcToken();
  if (!oidcToken) return null;

  // 1) STS token exchange: Vercel OIDC → федеративный access-token Google.
  const stsRes = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: oidcToken,
      audience,
    }),
  });
  if (!stsRes.ok) return null;
  const stsData = (await stsRes.json()) as { access_token?: string };
  const federatedToken = stsData.access_token;
  if (!federatedToken) return null;

  // 2) Имперсонация SA: federated token → access-token сервис-аккаунта.
  const impRes = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(
      saEmail,
    )}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${federatedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/firebase.messaging"] }),
    },
  );
  if (!impRes.ok) return null;
  const impData = (await impRes.json()) as { accessToken?: string };
  return impData.accessToken ? { token: impData.accessToken, projectId } : null;
}

/** FCM access-token через ключ сервис-аккаунта (fallback). */
async function fcmAccessTokenViaKey(): Promise<{ token: string; projectId: string } | null> {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  const sa = JSON.parse(raw) as { client_email: string; private_key: string; project_id: string };

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const assertion = `${signingInput}.${b64url(signer.sign(sa.private_key.replace(/\\n/g, "\n")))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ? { token: data.access_token, projectId: sa.project_id } : null;
}

/**
 * Получить FCM access-token: WIF-путь если настроен, иначе ключ SA.
 * Результат кэшируется на ~50 минут.
 */
async function fcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmTokenCache && fcmTokenCache.exp > now + 60) {
    return { token: fcmTokenCache.token, projectId: fcmTokenCache.projectId };
  }

  const result = wifConfigured() ? await fcmAccessTokenViaWIF() : await fcmAccessTokenViaKey();
  if (!result) return null;

  fcmTokenCache = { token: result.token, projectId: result.projectId, exp: now + 3000 }; // ~50 мин
  return result;
}

async function sendFcm(deviceToken: string, msg: PushMessage): Promise<boolean> {
  try {
    const auth = await fcmAccessToken();
    if (!auth) return false;
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title: msg.title, body: msg.body },
            data: msg.link ? { link: msg.link } : undefined,
          },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Отправить push всем устройствам пользователя. Никогда не бросает исключений
 * (ошибки логируются), чтобы не влиять на основной запрос.
 */
export async function sendPushToUser(userId: string, msg: PushMessage): Promise<void> {
  // Быстрый выход, если ни один канал не настроен.
  const apnsReady = Boolean(process.env.APNS_KEY_ID);
  const fcmReady = fcmConfigured();
  if (!apnsReady && !fcmReady) return;

  try {
    const { data } = await admin()
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", userId);
    if (!data?.length) return;

    await Promise.all(
      data.map((row: { token: string; platform: string }) =>
        row.platform === "ios"
          ? apnsReady && sendApns(row.token, msg)
          : fcmReady && sendFcm(row.token, msg),
      ),
    );
  } catch (e) {
    console.error("sendPushToUser error:", e instanceof Error ? e.message : e);
  }
}
