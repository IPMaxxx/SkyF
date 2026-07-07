import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subscriptionProductFor } from "@/lib/native/iapProducts";
import {
  getAppleSubscription,
  getGoogleSubscription,
  type StoreSubscriptionState,
} from "@/lib/iap-store";
import {
  getSupabaseAdmin,
  grantMonthlyBonus,
  currentMonthlySliceStart,
} from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * Проверка покупки авто-возобновляемой подписки на сервере.
 *
 * Поток: клиент (cordova-plugin-purchase) после approved присылает
 * platform + productId + transactionId (iOS) / purchaseToken (Android).
 * Сервер сверяет статус у стора, productId и принадлежность покупателю,
 * upsert'ит user_subscriptions и идемпотентно зачисляет месячный
 * бонус-пул (payment_id = sub:<platform>:<txid>:<periodStart>).
 */

/** Sandbox-фолбэк Apple: вне продакшена всегда; в проде — по allowlist. */
function sandboxAllowed(userEmail: string | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const allowlist = (process.env.IAP_SANDBOX_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(userEmail && allowlist.includes(userEmail.toLowerCase()));
}

/** Начало текущего периода: из стора или назад от expiry на длину периода. */
function derivePeriodStart(
  state: StoreSubscriptionState,
  period: "monthly" | "yearly",
): Date {
  if (state.periodStartMs) return new Date(state.periodStartMs);
  const end = new Date(state.expiresMs ?? Date.now());
  const start = new Date(end);
  if (period === "monthly") start.setUTCMonth(start.getUTCMonth() - 1);
  else start.setUTCFullYear(start.getUTCFullYear() - 1);
  return start;
}

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

  const product = subscriptionProductFor(productId);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Unknown product" }, { status: 400 });
  }

  try {
    let state: StoreSubscriptionState | null = null;
    let keyColumn: "original_transaction_id" | "purchase_token";
    let keyValue: string;

    if (platform === "ios") {
      if (!transactionId) {
        return NextResponse.json(
          { ok: false, error: "transactionId required" },
          { status: 400 },
        );
      }
      state = await getAppleSubscription(transactionId, sandboxAllowed(user.email));
      if (!state || state.productId !== productId) {
        return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
      }
      keyColumn = "original_transaction_id";
      keyValue = state.originalTransactionId ?? transactionId;
    } else if (platform === "android") {
      if (!purchaseToken) {
        return NextResponse.json(
          { ok: false, error: "purchaseToken required" },
          { status: 400 },
        );
      }
      state = await getGoogleSubscription(purchaseToken);
      if (!state || state.productId !== productId) {
        return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 402 });
      }
      keyColumn = "purchase_token";
      keyValue = purchaseToken;
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported platform" }, { status: 400 });
    }

    // Принадлежность чека: как в /api/native/iap/verify — при наличии
    // привязки сверяем с user.id, при отсутствии — переходный режим.
    if (state.accountRef) {
      if (state.accountRef.toLowerCase() !== user.id.toLowerCase()) {
        console.error(
          `Sub verify: account mismatch (${platform}, user ${user.id})`,
        );
        return NextResponse.json({ ok: false, error: "Account mismatch" }, { status: 403 });
      }
    } else {
      console.warn(
        `Sub verify: no account binding in ${platform} subscription (user ${user.id}) — transitional mode`,
      );
    }

    if (state.status === "expired" || !state.expiresMs || state.expiresMs <= Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Subscription is not active" },
        { status: 402 },
      );
    }

    const periodStart = derivePeriodStart(state, product.period);
    const periodEnd = new Date(state.expiresMs);

    const admin = getSupabaseAdmin();

    // Upsert по ключу стора. Подписка, уже привязанная к другому аккаунту,
    // не перепривязывается (защита от шаринга чека).
    const { data: existing } = await admin
      .from("user_subscriptions")
      .select("id, user_id")
      .eq(keyColumn, keyValue)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      console.error(
        `Sub verify: subscription ${keyValue} already linked to another user`,
      );
      return NextResponse.json({ ok: false, error: "Account mismatch" }, { status: 403 });
    }

    const rowData = {
      user_id: user.id,
      platform,
      product_id: productId,
      tier: product.tier,
      period: product.period,
      status: state.status,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await admin
        .from("user_subscriptions")
        .update(rowData)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("user_subscriptions")
        .insert({ ...rowData, [keyColumn]: keyValue });
      // 23505 — конкурентный запрос уже создал строку: обновляем её.
      if (error) {
        if (error.code === "23505") {
          await admin.from("user_subscriptions").update(rowData).eq(keyColumn, keyValue);
        } else {
          throw error;
        }
      }
    }

    // Месячный бонус-пул за текущий слайс (идемпотентно по payment_id).
    const sliceStart = currentMonthlySliceStart(periodStart);
    const granted = await grantMonthlyBonus({
      userId: user.id,
      platform,
      txId: keyValue,
      tier: product.tier,
      sliceStart,
    });

    if (granted === "granted") {
      await admin
        .from("user_subscriptions")
        .update({
          last_bonus_grant_at: new Date().toISOString(),
          identify_used: 0,
          forecast_used: 0,
        })
        .eq(keyColumn, keyValue);
    }

    return NextResponse.json({
      ok: true,
      tier: product.tier,
      period: product.period,
      status: state.status,
      current_period_end: periodEnd.toISOString(),
      bonus: granted,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg.endsWith("_not_configured")) {
      return NextResponse.json(
        { ok: false, error: "IAP verification is not configured on the server" },
        { status: 503 },
      );
    }
    console.error("Sub verify error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
