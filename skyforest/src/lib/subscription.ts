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
import { FLAVORS, type AppFlavor } from "@/lib/appFlavor";
import type { FlavorSubscriptionPlan } from "@/flavors/types";

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

// Безлимит подписки — «лучшие дни» (mushroom days) и определение типа леса
// (GET /api/forest-info, forest_info = 1 токен для остальных). Дорогие
// процедуры weather_check и forest_search в подписку не входят и всегда
// оплачиваются токенами (на них идут месячные бонус-токены).
const UNLIMITED_BASE = [
  "best_day_create",
  "best_day_reload",
  "forest_info",
] as const;

/**
 * Бонус-пул на время бесплатного триала (обе подписки): полный месячный
 * пул выдаётся только с первого оплаченного периода, чтобы триал
 * нельзя было фармить на токены.
 */
export const TRIAL_BONUS_TOKENS = 10;

export const TIER_BENEFITS: Record<SubscriptionTier, TierBenefits> = {
  forager: {
    unlimitedActions: UNLIMITED_BASE,
    freeMonitors: 1,
    identifyPerMonth: 8,
    forecastPerMonth: 0,
    monthlyBonusTokens: 30,
    freeMarketplaceList: false,
  },
  pro: {
    unlimitedActions: UNLIMITED_BASE,
    freeMonitors: 3,
    identifyPerMonth: 25,
    forecastPerMonth: 8,
    monthlyBonusTokens: 100,
    freeMarketplaceList: true,
  },
  // Подписка приложения Mushroom Checker: только распознавание грибов,
  // без токенов (никаких бонус-пулов — в флейворах токены не используются).
  // Лимиты берутся не отсюда, а из FLAVORS.checker.subscriptionPlan:
  // в оплаченной подписке их нет, в триале — общий лимит на весь период.
  checker: {
    unlimitedActions: [],
    freeMonitors: 0,
    identifyPerMonth: 0,
    forecastPerMonth: 0,
    monthlyBonusTokens: 0,
    freeMarketplaceList: false,
  },
  // Подписка приложения WayBack: полный доступ к приложению, токенов нет.
  wayback: {
    unlimitedActions: [],
    freeMonitors: 0,
    identifyPerMonth: 0,
    forecastPerMonth: 0,
    monthlyBonusTokens: 0,
    freeMarketplaceList: false,
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
  /** Идёт бесплатный пробный период стора (introductory offer). */
  isTrial: boolean;
  benefits: TierBenefits;
}

/**
 * Приложение, которому принадлежит тир, — единственная привязка права
 * к продукту.
 *
 * Отдельной колонки приложения в user_subscriptions нет и не нужно: чек
 * стора сам привязан к bundle id, verify-subscription сверяет его с
 * SubscriptionProduct.bundleId, а bundle id однозначно задаёт тир товара.
 * Значит tier — уже надёжный признак «где куплено», и достаточно не
 * отдавать приложению права чужих тиров.
 */
const TIER_FLAVOR: Record<SubscriptionTier, AppFlavor> = {
  forager: "skyforest",
  pro: "skyforest",
  checker: "checker",
  wayback: "wayback",
};

const ALL_TIERS = Object.keys(TIER_FLAVOR) as SubscriptionTier[];

/** Тиры, дающие права в этом приложении. Чужие права здесь не действуют. */
function tiersForFlavor(flavor: AppFlavor): SubscriptionTier[] {
  return ALL_TIERS.filter((tier) => TIER_FLAVOR[tier] === flavor);
}

/** Модель подписки приложения этого тира (или undefined — тир SkyForest). */
export function planForTier(
  tier: SubscriptionTier,
): FlavorSubscriptionPlan | undefined {
  return FLAVORS[TIER_FLAVOR[tier]].subscriptionPlan;
}

/**
 * Сколько определений грибов включено в подписку: число или null — без
 * лимита. У приложений со своей моделью (Checker) лимит есть только на
 * бесплатном триале, в оплаченной подписке ограничений нет.
 */
export function identifyLimitFor(sub: ActiveSubscription): number | null {
  const plan = planForTier(sub.tier);
  if (plan) return sub.isTrial ? plan.trialIdentifyLimit : plan.identifyLimit;
  return sub.benefits.identifyPerMonth;
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
  is_trial: boolean | null;
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
    isTrial: row.is_trial ?? false,
    benefits: TIER_BENEFITS[row.tier],
  };
}

/**
 * Активная подписка пользователя В ДАННОМ ПРИЛОЖЕНИИ (или null). При
 * нескольких активных (переходный кейс апгрейда) возвращается pro.
 *
 * `flavor` обязателен: у пользователя одна учётная запись на все три
 * продукта, и без фильтра по тиру подписка, купленная в Mushroom Checker,
 * открывала бы платное в WayBack (и наоборот).
 */
export async function getActiveSubscription(
  userId: string,
  flavor: AppFlavor,
): Promise<ActiveSubscription | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(
      "id, user_id, platform, product_id, tier, period, status, current_period_start, current_period_end, identify_used, forecast_used, is_trial",
    )
    .eq("user_id", userId)
    .in("tier", tiersForFlavor(flavor))
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
 *
 * Лимит null (подписка без ограничений) — сразу true: счётчик не ведём,
 * иначе на экране появлялось бы бессмысленное «осталось N».
 */
export async function consumeSubscriptionQuota(
  sub: ActiveSubscription,
  kind: "identify" | "forecast",
): Promise<boolean> {
  const limit =
    kind === "identify" ? identifyLimitFor(sub) : sub.benefits.forecastPerMonth;
  if (limit === null) return true;
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
 * На бесплатном триале (isTrial) вместо полного пула зачисляется
 * TRIAL_BONUS_TOKENS; полный пул — с первого оплаченного периода
 * (у него свой sliceKey, идемпотентность не мешает).
 * Возвращает 'granted' | 'already_granted' | 'error'.
 */
export async function grantMonthlyBonus(params: {
  userId: string;
  platform: string;
  txId: string;
  tier: SubscriptionTier;
  sliceStart: Date;
  isTrial?: boolean;
}): Promise<"granted" | "already_granted" | "error"> {
  const { userId, platform, txId, tier, sliceStart, isTrial } = params;
  const monthlyPool = TIER_BENEFITS[tier].monthlyBonusTokens;
  const amount = isTrial ? Math.min(TRIAL_BONUS_TOKENS, monthlyPool) : monthlyPool;
  // Тиры без бонус-пула (checker/wayback): токены не зачисляются вовсе.
  if (amount <= 0) return "granted";
  const sliceKey = sliceStart.toISOString().slice(0, 10);
  // Суффикс ":trial" отделяет триальный пул от полного: у Google startTime
  // (якорь слайсов) не меняется при конверсии триала в оплаченный период,
  // и без суффикса полный пул первого месяца съедался бы идемпотентностью.
  const paymentId = `sub:${platform}:${txId}:${sliceKey}${isTrial ? ":trial" : ""}`;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("add_bonus_tokens", {
    p_user_id: userId,
    p_amount: amount,
    p_description: `Бонус подписки ${tier === "pro" ? "Pro" : "Forager"}${isTrial ? " (триал)" : ""} (${sliceKey})`, // сюда попадают только forager/pro: у флейворов amount = 0
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
