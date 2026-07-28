"use client";

/**
 * «Вернуться к точке входа» — максимально простой трекер для леса.
 *
 * Якорь ставится одной геолокацией по кнопке «Я вошёл в лес». Точки пути
 * пишет глобальный TrackRecorder в (app)-layout; страница лишь подписана на
 * его события через useTrackController. Стрелка возврата работает по курсу
 * движения GPS, затем по компасу устройства, а без них — текстом со стороной
 * света и пунктиром на карте. Активный поход живёт в localStorage; по кнопке
 * «Я вышел» сохраняется в историю (Supabase, fallback — localStorage).
 *
 * WayBack сюда не попадает: middleware переписывает /dashboard/track его
 * поддомена на собственный экран в src/app/[locale]/wb/track. Логика у экранов
 * общая — она вся в useTrackController, — а вёрстка своя у каждого.
 */

import { useTrackController } from "@/lib/track/useTrackController";
import { ClassicTrackScreen } from "@/components/app/ClassicTrackScreen";

export default function TrackPage() {
  const controller = useTrackController();
  return <ClassicTrackScreen c={controller} />;
}
