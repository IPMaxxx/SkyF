"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTokens } from "@/lib/TokenContext";
import { LogOut, User, Coins, LayoutDashboard, Home, Gift } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Стартовая", icon: Home, exact: true },
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { balance, loading: balanceLoading } = useTokens();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="glass-strong sticky top-0 z-50 flex h-14 items-center justify-between px-4">
      <Link href="/" className="flex-shrink-0">
        <Image
          src="/images/logo.png"
          alt="Skyforest"
          width={120}
          height={38}
          className="h-8 w-auto"
        />
      </Link>

      <nav className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = (item as { exact?: boolean }).exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/20 text-primary-light"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/5"
              )}
            >
              {item.icon && <item.icon className="mr-1 inline-block h-4 w-4" />}
              {item.label}
            </Link>
          );
        })}

        {/* Token balance */}
        <Link
          href="/payment"
          className="ml-1 flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/25"
        >
          <Coins className="h-4 w-4" />
          {balanceLoading ? (
            <span className="inline-block h-3 w-6 animate-pulse rounded bg-amber-500/20" />
          ) : (
            <span>{balance ?? 0}</span>
          )}
        </Link>

        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary-light transition-colors hover:bg-primary/30"
          >
            <User className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="glass-strong absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl py-1 shadow-2xl">
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                  Мой аккаунт
                </Link>
                <Link
                  href="/payment"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                >
                  <Coins className="h-4 w-4" />
                  Купить токены
                </Link>
                <Link
                  href="/dashboard/referral"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                >
                  <Gift className="h-4 w-4" />
                  Пригласить друга
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
