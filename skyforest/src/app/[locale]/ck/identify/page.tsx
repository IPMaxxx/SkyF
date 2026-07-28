import { CheckerIdentify } from "@/components/checker/CheckerIdentify";

/** Публичный URL остаётся /dashboard/identify — middleware переписывает его сюда. */
export default function CheckerIdentifyPage() {
  return <CheckerIdentify />;
}
