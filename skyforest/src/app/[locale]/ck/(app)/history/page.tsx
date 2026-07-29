import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckerHistory } from "@/components/checker/CheckerHistory";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checker.history" });
  return { title: t("title") };
}

/** Публичный URL остаётся /dashboard/history — middleware переписывает его сюда. */
export default async function CheckerHistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CheckerHistory />;
}
