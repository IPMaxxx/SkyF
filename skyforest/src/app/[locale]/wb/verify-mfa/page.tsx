import { WayBackVerifyMfa } from "@/components/wayback/WayBackAuth";

/** Публичный URL остаётся /verify-mfa — middleware переписывает его сюда. */
export default function WayBackVerifyMfaPage() {
  return <WayBackVerifyMfa />;
}
