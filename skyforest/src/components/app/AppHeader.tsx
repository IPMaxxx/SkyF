"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTokens } from "@/lib/TokenContext";
import {
  LogOut,
  User,
  Coins,
  LayoutDashboard,
  Gift,

  Menu,
  X,
  Store,
  Trees,
  GitCompareArrows,
  CloudSun,
  Shield,
  MessageCircle,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/weather", label: "Погода", icon: CloudSun },
  { href: "/dashboard/compare", label: "Мониторинг", icon: GitCompareArrows },
  { href: "/dashboard/forest-search", label: "Поиск леса", icon: Trees },
  { href: "/dashboard/marketplace", label: "Маркетплейс", icon: Store },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const { balance, loading: balanceLoading } = useTokens();
  const unreadTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    setMobileNav(false);
    setMenuOpen(false);
  }, [pathname]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadChats(data.count ?? 0);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .single();
      if (data?.account_type === "admin") setIsAdmin(true);
    };
    check();
    fetchUnread();
    unreadTimer.current = setInterval(fetchUnread, 60_000);
    return () => clearInterval(unreadTimer.current);
  }, [fetchUnread]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1a12]/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/images/logo-square.png"
            alt="SkyForest"
            width={40}
            height={40}
            className="h-8 w-8 rounded-lg"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item)
                  ? "bg-primary/20 text-primary-light"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/5"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side: balance + user menu */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/payment"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              pathname === "/payment" || pathname.startsWith("/payment/")
                ? "bg-amber-500/25 text-amber-300"
                : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
            )}
          >
            <Coins className="h-4 w-4" />
            {balanceLoading ? (
              <span className="inline-block h-3 w-6 animate-pulse rounded bg-amber-500/20" />
            ) : (
              <span>{balance ?? 0}</span>
            )}
          </Link>

          <Link
            href="/dashboard/marketplace/chats"
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-foreground/70 transition-colors hover:bg-white/15 hover:text-foreground"
            title="Сообщения"
          >
            <MessageCircle className="h-4 w-4" />
            {unreadChats > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadChats > 9 ? "9+" : unreadChats}
              </span>
            )}
          </Link>

          <div className="relative">
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
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a2e1f]/98 py-1 shadow-2xl backdrop-blur-xl">
                  {isAdmin && (
                    <Link
                      href="/dashboard/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                    >
                      <Shield className="h-4 w-4" />
                      Админ-панель
                    </Link>
                  )}
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  >
                    <User className="h-4 w-4" />
                    Мой аккаунт
                  </Link>
                  <Link
                    href="/dashboard#locations"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  >
                    <MapPin className="h-4 w-4" />
                    Мои локации
                  </Link>
                  <Link
                    href="/dashboard#best-days"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Мои грибные дни
                  </Link>
                  <Link
                    href="/payment"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  >
                    <Coins className="h-4 w-4" />
                    Токены
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
        </div>

        {/* Mobile: balance + chat + burger */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/payment"
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-sm font-semibold text-amber-400"
          >
            <Coins className="h-4 w-4" />
            {balanceLoading ? "..." : balance ?? 0}
          </Link>
          <Link
            href="/dashboard/marketplace/chats"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            {unreadChats > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadChats > 9 ? "9+" : unreadChats}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileNav(!mobileNav)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileNav && (
        <div className="border-t border-white/10 bg-[#0d1a12] px-4 pb-4 pt-2 lg:hidden">
          <div className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive(item)
                    ? "bg-primary/20 text-primary-light"
                    : "text-foreground/80 hover:bg-white/5"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}

            <Link
              href="/payment"
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                pathname === "/payment" || pathname.startsWith("/payment/")
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-amber-400 hover:bg-white/5"
              )}
            >
              <Coins className="h-5 w-5" />
              Токены
            </Link>

            <div className="my-2 border-t border-white/10" />

            {isAdmin && (
              <Link
                href="/dashboard/admin"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  pathname.startsWith("/dashboard/admin")
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-purple-400 hover:bg-purple-500/10"
                )}
              >
                <Shield className="h-5 w-5" />
                Админ-панель
              </Link>
            )}

            <Link
              href="/account"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
            >
              <User className="h-5 w-5" />
              Мой аккаунт
            </Link>
            <Link
              href="/dashboard#locations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
            >
              <MapPin className="h-5 w-5" />
              Мои локации
            </Link>
            <Link
              href="/dashboard#best-days"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
            >
              <CalendarDays className="h-5 w-5" />
              Мои грибные дни
            </Link>
            <Link
              href="/dashboard/referral"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
            >
              <Gift className="h-5 w-5" />
              Пригласить друга
            </Link>

            <div className="my-2 border-t border-white/10" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-5 w-5" />
              Выйти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
