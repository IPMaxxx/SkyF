import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Аутентификация запросов от Telegram-бота (Mashbot) к серверным эндпоинтам
 * /api/bot/*. Контракт совпадает с провайдером бота (bot/billing/skyforest.py):
 *   - Заголовок `Api-Key`     — общий секрет (env MASHBOT_API_KEY).
 *   - Заголовок `X-Timestamp` — unix-время (сек) на момент запроса.
 *   - Заголовок `X-Signature` — HMAC-SHA256(key=Api-Key, msg=`${ts}.${body}`), hex.
 *
 * Для GET-запросов тело пустое (body = "").
 */

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const MAX_SKEW_SECONDS = 300; // 5 минут на рассинхрон часов / задержку сети

export function verifyBotRequest(req: Request, rawBody: string): boolean {
  const apiKey = process.env.MASHBOT_API_KEY;
  if (!apiKey || apiKey.length < 16) {
    // Не настроено — считаем все запросы неаутентифицированными.
    return false;
  }

  const sentKey = req.headers.get("Api-Key") ?? req.headers.get("api-key");
  const ts = req.headers.get("X-Timestamp") ?? req.headers.get("x-timestamp");
  const sig = req.headers.get("X-Signature") ?? req.headers.get("x-signature");

  if (!sentKey || !ts || !sig) return false;
  if (!timingSafeEqual(sentKey, apiKey)) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = Date.now() / 1000;
  if (Math.abs(nowSec - tsNum) > MAX_SKEW_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", apiKey)
    .update(`${ts}.${rawBody}`, "utf-8")
    .digest("hex");

  return timingSafeEqual(sig, expected);
}

/** Сервисный (service_role) клиент Supabase без пользовательской сессии. */
export function createBotServiceClient(): SupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  ) as unknown as SupabaseClient;
}
