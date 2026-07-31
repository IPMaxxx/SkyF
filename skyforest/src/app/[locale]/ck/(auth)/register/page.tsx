import { Suspense } from "react";
import { CheckerRegister } from "@/components/checker/CheckerAuth";

/** Публичный URL остаётся /register — middleware переписывает его сюда. */
export default function CheckerRegisterPage() {
  return (
    <Suspense>
      <CheckerRegister />
    </Suspense>
  );
}
