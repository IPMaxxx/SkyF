import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/subscription";

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

  return NextResponse.json({
    subscription: {
      tier: sub.tier,
      period: sub.period,
      status: sub.status,
      platform: sub.platform,
      current_period_end: sub.currentPeriodEnd,
      identify_used: sub.identifyUsed,
      forecast_used: sub.forecastUsed,
      identify_limit: sub.benefits.identifyPerMonth,
      forecast_limit: sub.benefits.forecastPerMonth,
    },
  });
}
