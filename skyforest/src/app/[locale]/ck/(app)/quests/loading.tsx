import { CheckerQuestsSkeleton } from "@/components/checker/CheckerSkeletons";

/** Каркас «Квестов» на время ответа сервера — тап по вкладке рисует его сразу. */
export default function Loading() {
  return <CheckerQuestsSkeleton />;
}
