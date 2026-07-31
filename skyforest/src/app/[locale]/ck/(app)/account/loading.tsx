import { CheckerAccountSkeleton } from "@/components/checker/CheckerSkeletons";

/**
 * Каркас «Аккаунта». Здесь он важнее прочих: страница ждёт `auth.getUser()` и
 * запрос профиля, и без этой границы Suspense экран не менялся до их конца.
 */
export default function Loading() {
  return <CheckerAccountSkeleton />;
}
