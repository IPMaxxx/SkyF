import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthlySliceStart,
  getActiveSubscription,
  identifyLimitFor,
} from "@/lib/subscription";

/** Текущая подписка пользователя для UI (/payment). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getActiveSubscription(user.id);
  if (!sub) return NextResponse.json({ subscription: null });

  // Счётчик распознаваний обнуляется на границе месячного слайса, а не в
  // конце оплаченного периода (для годовой подписки это разные даты).
  const sliceStart = currentMonthlySliceStart(new Date(sub.currentPeriodStart));
  const quotaResetsAt = new Date(sliceStart);
  quotaResetsAt.setUTCMonth(quotaResetsAt.getUTCMonth() + 1);

  return NextResponse.json({
    subscription: {
      tier: sub.tier,
      period: sub.period,
      status: sub.status,
      platform: sub.platform,
      current_period_end: sub.currentPeriodEnd,
      identify_used: sub.identifyUsed,
      forecast_used: sub.forecastUsed,
      // null — подписка без лимита распознаваний (Mushroom Checker Premium).
      identify_limit: identifyLimitFor(sub),
      forecast_limit: sub.benefits.forecastPerMonth,
      is_trial: sub.isTrial,
      quota_resets_at: quotaResetsAt.toISOString(),
    },
  });
}
