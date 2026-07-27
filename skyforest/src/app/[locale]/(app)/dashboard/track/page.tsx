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
 * Вёрстки две и они не пересекаются: тёмный экран кабинета SkyForest и
 * светлый редизайн WayBack («Widget Board»). Поведение у них общее — вся
 * логика в useTrackController.
 */

import { useTrackController } from "@/lib/track/useTrackController";
import { useAppFlavor } from "@/lib/useAppFlavor";
import { ClassicTrackScreen } from "@/components/app/ClassicTrackScreen";
import { WayBackTrackScreen } from "@/components/wayback/WayBackTrackScreen";

export default function TrackPage() {
  const controller = useTrackController();
  const flavor = useAppFlavor();

  if (flavor === "wayback") return <WayBackTrackScreen c={controller} />;
  return <ClassicTrackScreen c={controller} />;
}
