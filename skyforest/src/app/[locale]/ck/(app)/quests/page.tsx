import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckerQuests } from "@/components/checker/CheckerQuests";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checker.quests" });
  return { title: t("title") };
}

/** Публичный URL остаётся /dashboard/quests — middleware переписывает его сюда. */
export default async function CheckerQuestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CheckerQuests />;
}
