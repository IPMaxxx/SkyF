"use client";

/**
 * Какой тариф выбран на экране покупки.
 *
 * Отдельный хук, потому что список тарифов приезжает позже экрана: стор
 * отвечает через мгновение после initIap, и до ответа на экране один тариф, а
 * после — два. Выбор обязан пережить это мгновение, иначе кнопка покупки
 * ссылалась бы на товар, которого в списке уже нет, и заказ ушёл бы в
 * «товар недоступен».
 *
 * Правило простое: пока выбранный тариф остаётся в списке — он и выбран;
 * как только исчезает, берём годовой (или первый, если годового нет).
 *
 * Поэтому в состоянии лежит выбор человека, а не сам тариф, и «что показать»
 * вычисляется на каждом рендере. Синхронизировать состояние со списком не
 * нужно: пустой выбор и выбор, которого больше нет в списке, дают один и тот
 * же ответ — тариф по умолчанию.
 */

import { useState } from "react";
import type { WaybackPlan } from "@/lib/wayback/subscriptionProducts";

/** Тариф по умолчанию: год — он выгоднее, и его показываем предвыбранным. */
function preferred(plans: WaybackPlan[]): WaybackPlan {
  return plans.find((p) => p.period === "yearly") ?? plans[0];
}

export function useWaybackSelectedPlan(plans: WaybackPlan[]): {
  selected: WaybackPlan;
  select: (plan: WaybackPlan) => void;
} {
  const [productId, setProductId] = useState<string | null>(null);

  const selected =
    plans.find((p) => p.productId === productId) ?? preferred(plans);

  return { selected, select: (plan) => setProductId(plan.productId) };
}
