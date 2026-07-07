/**
 * Серверная логика премиум-подписок (Forager / Pro).
 *
 * Единственное место с наполнением тиров (TIER_BENEFITS) и хелперами
 * «включено ли действие в подписку». Состояние хранится в таблице
 * user_subscriptions (supabase/patch-v41-subscriptions.sql), пишется
 * только service-role (verify-subscription и cron).
 */
import { createServerClient } from "@supabase/ssr";
import type { SubscriptionTier, SubscriptionPeriod } from "@/lib/native/iapProducts";
import type { TOKEN_COSTS } from "@/lib/tokens";

export type TokenAction = keyof typeof TOKEN_COSTS;

export interface TierBenefits {
  /** Действия без списания токенов (безлимит) */
  unlimitedActions: readonly TokenAction[];
  /** Автомониторов без списаний (первые по created_at) */
  freeMonitors: number;
  /** Включено определений грибов в месяц */
  identifyPerMonth: number;
  /** Включено прогнозов совпадения (compare_forecast) в месяц */
  forecastPerMonth: number;
  /** Ежемесячный пул бонусных токенов (без переноса) */
  monthlyBonusTokens: number;
  /** Бесплатное размещение на маркетплейсе */
  freeMarketplaceList: boolean;
}

const UNLIMITED_BASE = [
  "weather_check",
  "best_day_create",
  "best_day_reload",
  "forest_search",
] as const;

export const TIER_BENEFITS: Record<SubscriptionTier, TierBenefits> = {
  forager: {
    unlimitedActions: UNLIMITED_BASE,
    freeMonitors: 1,
    identifyPerMonth: 30,
    forecastPerMonth: 0,
    monthlyBonusTokens: 30,
    freeMarketplaceList: false,
  },
  pro: {
    unlimitedActions: UNLIMITED_BASE,
    freeMonitors: 3,
    identifyPerMonth: 100,
    forecastPerMonth: 8,
    monthlyBonusTokens: 100,
    freeMarketplaceList: true,
  },
};

export interface ActiveSubscription {
  id: string;
  userId: string;
  platform: "ios" | "android" | "web";
  productId: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  /** 'canceled' — автопродление выключено, но период ещё оплачен */
  status: "active" | "grace" | "canceled";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  identifyUsed: number;
  forecastUsed: number;
  benefits: TierBenefits;
}

export function getSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  platform: "ios" | "android" | "web";
  product_id: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  status: string;
  current_period_start: string;
  current_period_end: string;
  identify_used: number;
  forecast_used: number;
}

function toActive(row: SubscriptionRow): ActiveSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    productId: row.product_id,
    tier: row.tier,
    period: row.period,
    status: row.status as "active" | "grace" | "canceled",
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    identifyUsed: row.identify_used,
    forecastUsed: row.forecast_used,
    benefits: TIER_BENEFITS[row.tier],
  };
}

/**
 * Активная подписка пользователя (или null). При нескольких активных
 * (переходный кейс апгрейда) возвращается pro.
 */
export async function getActiveSubscription(
  userId: string,
): Promise<ActiveSubscription | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(
      "id, user_id, platform, product_id, tier, period, status, current_period_start, current_period_end, identify_used, forecast_used",
    )
    .eq("user_id", userId)
    .in("status", ["active", "grace", "canceled"])
    .gt("current_period_end", new Date().toISOString());

  if (error || !data || data.length === 0) return null;
  const rows = data as SubscriptionRow[];
  const best = rows.find((r) => r.tier === "pro") ?? rows[0];
  return toActive(best);
}

/** Действие включено в подписку без ограничений? */
export function isUnlimitedAction(
  sub: ActiveSubscription,
  action: string,
): boolean {
  return (sub.benefits.unlimitedActions as readonly string[]).includes(action);
}

/**
 * Пытается израсходовать единицу месячного лимита подписки
 * ('identify' | 'forecast'). true — действие покрыто подпиской,
 * false — лимит исчерпан (или недоступен для тира) — оплата токенами.
 */
export async function consumeSubscriptionQuota(
  sub: ActiveSubscription,
  kind: "identify" | "forecast",
): Promise<boolean> {
  const limit =
    kind === "identify"
      ? sub.benefits.identifyPerMonth
      : sub.benefits.forecastPerMonth;
  if (limit <= 0) return false;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("use_subscription_quota", {
    p_user_id: sub.userId,
    p_kind: kind,
    p_limit: limit,
  });
  if (error) {
    console.error("use_subscription_quota error:", error);
    return false;
  }
  return (data as { success?: boolean })?.success === true;
}

/**
 * Начало текущего месячного слайса подписки: помесячные якоря от
 * current_period_start (для monthly совпадает с периодом; для yearly —
 * помесячно от даты покупки/продления).
 */
export function currentMonthlySliceStart(
  periodStart: Date,
  now: Date = new Date(),
): Date {
  const slice = new Date(periodStart);
  while (true) {
    const next = new Date(slice);
    next.setUTCMonth(next.getUTCMonth() + 1);
    if (next > now) break;
    slice.setUTCMonth(slice.getUTCMonth() + 1);
  }
  return slice;
}

/**
 * Идемпотентно зачисляет месячный бонус-пул подписки как бонусные токены.
 * payment_id: sub:<platform>:<txid>:<periodStart YYYY-MM-DD>.
 * Возвращает 'granted' | 'already_granted' | 'error'.
 */
export async function grantMonthlyBonus(params: {
  userId: string;
  platform: string;
  txId: string;
  tier: SubscriptionTier;
  sliceStart: Date;
}): Promise<"granted" | "already_granted" | "error"> {
  const { userId, platform, txId, tier, sliceStart } = params;
  const amount = TIER_BENEFITS[tier].monthlyBonusTokens;
  const sliceKey = sliceStart.toISOString().slice(0, 10);
  const paymentId = `sub:${platform}:${txId}:${sliceKey}`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("add_bonus_tokens", {
    p_user_id: userId,
    p_amount: amount,
    p_description: `Бонус подписки ${tier === "pro" ? "Pro" : "Forager"} (${sliceKey})`,
    p_payment_id: paymentId,
  });

  if (error) {
    // 23505 — уникальный payment_id: пул за этот слайс уже зачислен.
    if (error.code === "23505") return "already_granted";
    console.error("add_bonus_tokens error:", error);
    return "error";
  }
  if ((data as { success?: boolean })?.success !== true) return "error";
  return "granted";
}
