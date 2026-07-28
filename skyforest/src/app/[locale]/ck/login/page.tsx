import { Suspense } from "react";
import { CheckerLogin } from "@/components/checker/CheckerAuth";

/** Публичный URL остаётся /login — middleware переписывает его сюда. */
export default function CheckerLoginPage() {
  return (
    <Suspense>
      <CheckerLogin />
    </Suspense>
  );
}
