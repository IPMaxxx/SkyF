import { Suspense } from "react";
import { WayBackRegister } from "@/components/wayback/WayBackAuth";

/** Публичный URL остаётся /register — middleware переписывает его сюда. */
export default function WayBackRegisterPage() {
  return (
    <Suspense>
      <WayBackRegister />
    </Suspense>
  );
}
