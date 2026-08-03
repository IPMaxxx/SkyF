"use client";

/**
 * Главный экран WayBack — «вернуться к точке входа».
 *
 * Публичный URL остаётся /dashboard/track — middleware переписывает его сюда.
 *
 * Якорь ставится одной геолокацией по кнопке «I'm heading outdoors». Точки
 * пути пишет глобальный TrackRecorder, экран лишь подписан на его события
 * через useTrackController — та же логика, что у тёмного экрана SkyForest,
 * поэтому поведение продуктов не расходится. Стрелка возврата работает по
 * курсу GPS, затем по компасу, а без них — текстом со стороной света и
 * пунктиром на карте.
 *
 * Единственный экран приложения, поэтому обязательный гейт подписки стоит
 * именно здесь: история и офлайн-карта — это виды внутри WayBackTrackScreen, и
 * одна обёртка закрывает их все. В браузере гейт пропускает без изменений.
 */

import { useTrackController } from "@/lib/track/useTrackController";
import { WayBackStartGate } from "@/components/wayback/WayBackStartGate";
import { WayBackTrackScreen } from "@/components/wayback/WayBackTrackScreen";

export default function WayBackTrackPage() {
  const controller = useTrackController();
  return (
    <WayBackStartGate>
      <WayBackTrackScreen c={controller} />
    </WayBackStartGate>
  );
}
