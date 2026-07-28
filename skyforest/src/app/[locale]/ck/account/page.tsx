import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckerAccount } from "@/components/checker/CheckerAccount";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("metaTitle") };
}

/** Публичный URL остаётся /account — middleware переписывает его сюда. */
export default async function CheckerAccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  // Токеновые балансы и история транзакций SkyForest в Checker не нужны —
  // берём только профиль.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user!.id)
    .single();

  return (
    <CheckerAccount
      email={profile?.email || user!.email!}
      initialName={profile?.full_name || null}
    />
  );
}
