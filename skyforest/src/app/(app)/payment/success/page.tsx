"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Coins } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const tokens = searchParams.get("tokens");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        <h1 className="mb-3 text-2xl font-bold">Оплата прошла успешно!</h1>
        <p className="mb-2 text-muted-foreground">
          {tokens
            ? `${tokens} токенов добавлены на ваш баланс.`
            : "Токены добавлены на ваш баланс."}
        </p>
        <div className="mb-8 inline-flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2">
          <Coins className="h-5 w-5 text-amber-400" />
          <span className="text-lg font-bold text-amber-400">+{tokens || "?"}</span>
        </div>
        <div>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-primary px-8 py-3 text-base font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Перейти на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
