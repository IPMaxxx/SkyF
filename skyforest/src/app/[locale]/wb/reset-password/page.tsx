import { WayBackResetPassword } from "@/components/wayback/WayBackAuth";

/** Публичный URL остаётся /reset-password — middleware переписывает его сюда. */
export default function WayBackResetPasswordPage() {
  return <WayBackResetPassword />;
}
