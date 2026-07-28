import { WayBackForgotPassword } from "@/components/wayback/WayBackAuth";

/** Публичный URL остаётся /forgot-password — middleware переписывает его сюда. */
export default function WayBackForgotPasswordPage() {
  return <WayBackForgotPassword />;
}
