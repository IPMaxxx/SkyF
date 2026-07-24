import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { User, Mail, Coins, Lock, ShieldCheck, Trash2, MessageSquare } from "lucide-react";
import { ChangePassword } from "@/components/app/ChangePassword";
import { TwoFactorSetup } from "@/components/app/TwoFactorSetup";
import { TransactionHistory } from "@/components/app/TransactionHistory";
import { EditProfileName } from "@/components/app/EditProfileName";
import { EditContactLink } from "@/components/app/EditContactLink";
import { DeleteAccount } from "@/components/app/DeleteAccount";
import { MushroomBotCard } from "@/components/app/MushroomBotCard";
import { WebOnly } from "@/components/native/NativeOnly";
import { BiometricLockSetting } from "@/components/native/BiometricLockSetting";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("metaTitle") };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const userId = user!.id;
  const userEmail = user!.email;

  const [profileRes, balanceRes, txRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("token_balances")
      .select("balance, bonus_balance, total_purchased, total_spent, total_earned")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("token_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileRes.data;
  const tokenBalance = balanceRes.data;
  const transactions = txRes.data || [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-heading text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <User className="h-5 w-5 text-primary" />
          {t("profile")}
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{profile?.email || userEmail}</span>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <EditProfileName
              userId={userId}
              initialName={profile?.full_name || null}
              accountType={profile?.account_type}
            />
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-1 h-4 w-4 text-muted-foreground" />
            <div>
              <EditContactLink userId={userId} initialValue={profile?.contact_link || null} />
              <p className="mt-1 text-xs text-muted-foreground">{t("contactLinkHint")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <Lock className="h-5 w-5 text-primary" />
          {t("changePassword")}
        </h2>
        <ChangePassword />
      </div>

      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t("twoFactor")}
        </h2>
        <TwoFactorSetup />
      </div>

      <BiometricLockSetting />

      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <Coins className="h-5 w-5 text-token" />
          {t("tokens")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-token/10 p-4 text-center">
            <p className="font-heading text-2xl font-extrabold text-token">
              {(tokenBalance?.balance ?? 0) + (tokenBalance?.bonus_balance ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{t("balanceTotal")}</p>
          </div>
          <div className="rounded-xl bg-token/10 p-4 text-center">
            <p className="font-heading text-2xl font-extrabold text-token/90">{tokenBalance?.balance ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t("balancePurchased")}</p>
          </div>
          <div className="rounded-xl bg-cyan-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{tokenBalance?.bonus_balance ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t("balanceBonus")}</p>
          </div>
          <div className="rounded-xl bg-green-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{tokenBalance?.total_purchased ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t("totalPurchased")}</p>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{tokenBalance?.total_earned ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t("earned")}</p>
          </div>
          <div className="rounded-xl bg-blue-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{tokenBalance?.total_spent ?? 0}</p>
            <p className="text-xs text-muted-foreground">{t("spent")}</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("bonusHint")}</p>
        <Link
          href="/payment"
          className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-sm transition-all hover:opacity-90"
        >
          <Coins className="h-4 w-4" />
          {t("buyTokens")}
        </Link>
      </div>

      {/* Бот-определитель грибов скрыт в native (определение встроено в приложение) */}
      <WebOnly>
        <div className="mb-6">
          <MushroomBotCard />
        </div>
      </WebOnly>

      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 font-heading text-lg font-bold">{t("history")}</h2>
        <TransactionHistory initial={transactions} initialShow={3} />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <Trash2 className="h-5 w-5 text-red-400" />
          {t("deleteAccount")}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("deleteHint")}
        </p>
        <DeleteAccount email={userEmail!} />
      </div>
    </div>
  );
}
