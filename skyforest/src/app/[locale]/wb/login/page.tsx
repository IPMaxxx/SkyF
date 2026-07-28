import { Suspense } from "react";
import { WayBackLogin } from "@/components/wayback/WayBackAuth";

/** Публичный URL остаётся /login — middleware переписывает его сюда. */
export default function WayBackLoginPage() {
  return (
    <Suspense>
      <WayBackLogin />
    </Suspense>
  );
}
