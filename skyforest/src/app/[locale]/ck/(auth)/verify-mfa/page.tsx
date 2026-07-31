import { CheckerVerifyMfa } from "@/components/checker/CheckerAuth";

/** Публичный URL остаётся /verify-mfa — middleware переписывает его сюда. */
export default function CheckerVerifyMfaPage() {
  return <CheckerVerifyMfa />;
}
