import { CheckerPaywall } from "@/components/checker/CheckerPaywall";

/** Публичный URL остаётся /payment — middleware переписывает его сюда. */
export default function CheckerPaymentPage() {
  return <CheckerPaywall />;
}
