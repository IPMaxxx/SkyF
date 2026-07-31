import { CheckerHistorySkeleton } from "@/components/checker/CheckerSkeletons";

/** Каркас «Истории» на время ответа сервера — тап по вкладке рисует его сразу. */
export default function Loading() {
  return <CheckerHistorySkeleton />;
}
