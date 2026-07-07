import { NextRequest, NextResponse } from "next/server";
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
import type { SubscriptionTier, SubscriptionPeriod } from "@/lib/native/iapProducts";

export const maxDuration = 60;

/**
 * Ежедневный крон подписок:
 *  - у подписок с истёкшим current_period_end перепроверяет статус у стора
 *    и обновляет период/статус (просроченные — expired, без зачислений);
 *  - зачисляет очередной месячный бонус-пул (у годовых — помесячно от
 *    даты покупки), идемпотентно по payment_id;
 *  - при зачислении пула сбрасывает месячные счётчики лимитов.
 */

interface SubRow {
  id: string;
  user_id: string;
  platform: "ios" | "android" | "web";
  product_id: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  status: string;
  original_transaction_id: string | null;
  purchase_token: string | null;
  current_period_start: string;
  current_period_end: string;
  last_bonus_grant_at: string | null;
}

async function recheckWithStore(sub: SubRow): Promise<StoreSubscriptionState | null> {
  if (sub.platform === "ios" && sub.original_transaction_id) {
    // Sandbox-фолбэк разрешён: продовые originalTransactionId в песочнице
    // не существуют, а sandbox-подписки тестировщиков продолжают работать.
    return getAppleSubscription(sub.original_transaction_id, true);
  }
  if (sub.platform === "android" && sub.purchase_token) {
    return getGoogleSubscription(sub.purchase_token);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: subs, error } = await supabase
    .from("user_subscriptions")
    .select(
      "id, user_id, platform, product_id, tier, period, status, original_transaction_id, purchase_token, current_period_start, current_period_end, last_bonus_grant_at",
    )
    .in("status", ["active", "grace", "canceled"]);

  if (error || !subs) {
    return NextResponse.json({ error: error?.message || "No data", processed: 0 });
  }

  const now = new Date();
  let renewed = 0;
  let expired = 0;
  let granted = 0;
  let errors = 0;

  for (const sub of subs as SubRow[]) {
    try {
      let periodStart = new Date(sub.current_period_start);
      let periodEnd = new Date(sub.current_period_end);
      let status = sub.status;

      // 1. Период истёк — перепроверяем у стора.
      if (periodEnd <= now) {
        const state = await recheckWithStore(sub).catch((e) => {
          console.error(`Sub cron: store recheck failed for ${sub.id}:`, e);
          return null;
        });

        if (state && state.expiresMs && state.expiresMs > now.getTime() && state.status !== "expired") {
          // Продление: новый период.
          if (state.periodStartMs) periodStart = new Date(state.periodStartMs);
          periodEnd = new Date(state.expiresMs);
          status = state.status;
          await supabase
            .from("user_subscriptions")
            .update({
              status,
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sub.id);
          renewed++;
        } else {
          await supabase
            .from("user_subscriptions")
            .update({ status: "expired", updated_at: now.toISOString() })
            .eq("id", sub.id);
          expired++;
          continue; // без зачислений
        }
      }

      // 2. Месячный бонус-пул за текущий слайс (у годовых — помесячно).
      const sliceStart = currentMonthlySliceStart(periodStart, now);
      const lastGrant = sub.last_bonus_grant_at
        ? new Date(sub.last_bonus_grant_at)
        : null;
      if (!lastGrant || lastGrant < sliceStart) {
        const txId =
          sub.platform === "ios"
            ? sub.original_transaction_id
            : sub.purchase_token;
        if (!txId) continue;
        const result = await grantMonthlyBonus({
          userId: sub.user_id,
          platform: sub.platform,
          txId,
          tier: sub.tier,
          sliceStart,
        });
        if (result === "error") {
          errors++;
          continue;
        }
        // Слайс покрыт (нами или конкурентным запросом) — фиксируем
        // и сбрасываем месячные счётчики лимитов.
        await supabase
          .from("user_subscriptions")
          .update({
            last_bonus_grant_at: now.toISOString(),
            identify_used: 0,
            forecast_used: 0,
            updated_at: now.toISOString(),
          })
          .eq("id", sub.id);
        if (result === "granted") granted++;
      }
    } catch (err) {
      console.error("Sub cron error:", err);
      errors++;
    }
  }

  return NextResponse.json({
    total: subs.length,
    renewed,
    expired,
    granted,
    errors,
  });
}
