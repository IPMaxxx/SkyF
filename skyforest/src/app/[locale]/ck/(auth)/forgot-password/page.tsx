import { CheckerForgotPassword } from "@/components/checker/CheckerAuth";

/** Публичный URL остаётся /forgot-password — middleware переписывает его сюда. */
export default function CheckerForgotPasswordPage() {
  return <CheckerForgotPassword />;
}
