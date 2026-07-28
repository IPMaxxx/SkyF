import { CheckerResetPassword } from "@/components/checker/CheckerAuth";

/** Публичный URL остаётся /reset-password — middleware переписывает его сюда. */
export default function CheckerResetPasswordPage() {
  return <CheckerResetPassword />;
}
