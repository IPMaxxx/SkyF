import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Mail, Coins, Lock } from "lucide-react";
import { ChangePassword } from "@/components/app/ChangePassword";
import { TransactionHistory } from "@/components/app/TransactionHistory";
import { EditProfileName } from "@/components/app/EditProfileName";

export const metadata: Metadata = {
  title: "Мой аккаунт",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileRes, balanceRes, txRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("token_balances").select("*").eq("user_id", user.id).single(),
    supabase
      .from("token_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileRes.data;
  const tokenBalance = balanceRes.data;
  const transactions = txRes.data || [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Мой аккаунт</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Управляйте профилем, паролем и отслеживайте историю операций с токенами.
      </p>

      {/* Profile */}
      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5 text-primary" />
          Профиль
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{profile?.email || user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <EditProfileName userId={user.id} initialName={profile?.full_name || null} />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Lock className="h-5 w-5 text-primary" />
          Изменить пароль
        </h2>
        <ChangePassword />
      </div>

      {/* Token balance */}
      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Coins className="h-5 w-5 text-amber-400" />
          Токены
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-amber-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{tokenBalance?.balance ?? 0}</p>
            <p className="text-xs text-muted-foreground">Баланс</p>
          </div>
          <div className="rounded-xl bg-green-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{tokenBalance?.total_purchased ?? 0}</p>
            <p className="text-xs text-muted-foreground">Куплено</p>
          </div>
          <div className="rounded-xl bg-blue-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{tokenBalance?.total_spent ?? 0}</p>
            <p className="text-xs text-muted-foreground">Потрачено</p>
          </div>
        </div>
        <Link
          href="/payment"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-amber-500/20"
        >
          <Coins className="h-4 w-4" />
          Купить токены
        </Link>
      </div>

      {/* Transaction history */}
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold">История операций</h2>
        <TransactionHistory initial={transactions} />
      </div>
    </div>
  );
}
