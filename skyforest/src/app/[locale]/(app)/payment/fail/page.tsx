import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { XCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payment" });
  return { title: t("failTitle") };
}

export default async function PaymentFailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("payment");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15">
          <XCircle className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="mb-3 text-2xl font-bold">{t("failTitle")}</h1>
        <p className="mb-8 text-muted-foreground">{t("failDesc")}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/payment"
            className="inline-block rounded-xl bg-primary px-8 py-3 text-base font-medium text-white transition-colors hover:bg-primary-dark"
          >
            {t("retry")}
          </Link>
          <a
            href="https://t.me/skyforest_support_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl glass px-8 py-3 text-base font-medium transition-colors hover:bg-white/5"
          >
            {t("support")}
          </a>
        </div>
      </div>
    </div>
  );
}
