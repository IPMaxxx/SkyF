import { WayBackPaywall } from "@/components/wayback/WayBackPaywall";

/** Публичный URL остаётся /payment — middleware переписывает его сюда. */
export default function WayBackPaymentPage() {
  return <WayBackPaywall />;
}
