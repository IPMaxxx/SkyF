"use client";

import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
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
  ScanSearch,
  GitCompareArrows,
  CloudSun,
  Ticket,
  Shield,
  MessageCircle,
  AlertTriangle,
  MapPin,
  CalendarCheck,
  ChevronDown,
  Footprints,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { UnitSwitcher } from "@/components/UnitSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HEADER_NAV } from "@/lib/siteNav";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const LOW_BALANCE_THRESHOLD = 10;
const CRITICAL_BALANCE_THRESHOLD = 4;

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isNative = useIsNative();
  const t = useTranslations("appHeader");
  const tHeader = useTranslations("header");
  const [menuOpen, setMenuOpen] = useState(false);
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const { balance, loading: balanceLoading } = useTokens();
  const unreadTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const homeMenuRef = useRef<HTMLDivElement>(null);

  const siteNavLinks = useMemo(
    () =>
      HEADER_NAV.map((item) => ({
        href: item.href,
        label: tHeader(item.labelKey),
      })),
    [tHeader]
  );

  const NAV: NavItem[] = useMemo(
    () => [
      {
        href: "/dashboard",
        label: t("home"),
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/dashboard/weather", label: t("weather"), icon: CloudSun },
      {
        href: "/dashboard/compare",
        label: t("compare"),
        icon: GitCompareArrows,
      },
      {
        href: "/dashboard/forest-search",
        label: t("forestSearch"),
        icon: Trees,
      },
      {
        href: "/dashboard/identify",
        label: t("identify"),
        icon: ScanSearch,
      },
      {
        href: "/dashboard/track",
        label: t("track"),
        icon: Footprints,
      },
      {
        href: "/dashboard/marketplace",
        label: t("marketplace"),
        icon: Store,
      },
      {
        href: "/dashboard/mushroom-tours",
        label: t("mushroomTours"),
        icon: Ticket,
      },
    ],
    [t]
  );

  const closeAll = useCallback(() => {
    setMobileNav(false);
    setMenuOpen(false);
    setHomeMenuOpen(false);
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadChats(data.count ?? 0);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!homeMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHomeMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [homeMenuOpen]);

  useEffect(() => {
    setHomeMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  const balanceValue = balance ?? 0;
  const isCritical = !balanceLoading && balanceValue <= CRITICAL_BALANCE_THRESHOLD;
  const isLow =
    !balanceLoading &&
    balanceValue > CRITICAL_BALANCE_THRESHOLD &&
    balanceValue <= LOW_BALANCE_THRESHOLD;

  const balanceStyles = isCritical
    ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
    : isLow
      ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/40"
      : pathname === "/payment" || pathname.startsWith("/payment/")
        ? "bg-amber-500/25 text-amber-300"
        : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25";

  const balanceTitle = isCritical
    ? t("lowBalanceCritical")
    : isLow
      ? t("lowBalanceWarning")
      : t("tokens");

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0c150f]/95 backdrop-blur-md">
      <div className="flex h-[52px] items-center justify-between px-4">
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href={isNative ? "/dashboard" : "/"}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            aria-label="SkyForest"
          >
            <Image
              src="/images/logo-square.png"
              alt=""
              width={40}
              height={40}
              className={cn(
                "rounded-[9px]",
                isNative ? "h-8 w-8 border border-[rgba(120,220,150,0.25)]" : "h-8 w-8 rounded-lg",
              )}
            />
            {isNative && (
              <span className="font-heading text-[15px] font-bold tracking-tight text-foreground">
                SkyForest
              </span>
            )}
          </Link>
          {!isNative && (
            <>
              <LocaleSwitcher className="hidden sm:inline-flex" />
              <UnitSwitcher className="hidden sm:inline-flex" />
              <ThemeToggle className="hidden sm:inline-flex" />
            </>
          )}
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label={t("home")}>
          {NAV.map((item, index) => {
            const active = isActive(item);

            if (index === 0) {
              return (
                <div key={item.href} className="relative" ref={homeMenuRef}>
                  <button
                    type="button"
                    onClick={() => setHomeMenuOpen(!homeMenuOpen)}
                    aria-expanded={homeMenuOpen}
                    aria-haspopup="menu"
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
                      active || homeMenuOpen
                        ? "bg-primary/20 text-primary-light"
                        : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 opacity-70 transition-transform",
                        homeMenuOpen && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {homeMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setHomeMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div
                        role="menu"
                        className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1a2e1f]/98 py-1 shadow-2xl backdrop-blur-xl"
                      >
                        <Link
                          href="/dashboard"
                          role="menuitem"
                          onClick={closeAll}
                          aria-current={pathname === "/dashboard" ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:bg-white/10",
                            pathname === "/dashboard"
                              ? "bg-primary/15 font-medium text-primary-light"
                              : "text-foreground/80 hover:bg-white/10 hover:text-foreground"
                          )}
                        >
                          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                          {item.label}
                        </Link>
                        <div className="my-1 border-t border-white/10" />
                        {siteNavLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            role="menuitem"
                            onClick={closeAll}
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:bg-white/10"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
                  active
                    ? "bg-primary/20 text-primary-light"
                    : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {/* Баланс токенов скрыт в нативной оболочке (только индикатор; списание работает) */}
          {!isNative && (
            <Link
              href="/payment"
              title={balanceTitle}
              aria-label={`${t("tokens")}: ${balanceLoading ? "..." : balanceValue}`}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
                balanceStyles
              )}
            >
              <Coins className="h-4 w-4" aria-hidden="true" />
              {balanceLoading ? (
                <span className="inline-block h-3 w-6 animate-pulse rounded bg-amber-500/20" />
              ) : (
                <span>{balanceValue}</span>
              )}
              {isCritical && (
                <span
                  className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
            </Link>
          )}

          <Link
            href="/dashboard/marketplace/chats"
            aria-label={t("messages")}
            title={t("messages")}
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-foreground/70 transition-colors hover:bg-white/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {unreadChats > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                aria-label={`${unreadChats} ${t("messages").toLowerCase()}`}
              >
                {unreadChats > 9 ? "9+" : unreadChats}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t("account")}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary-light transition-colors hover:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            >
              <User className="h-4 w-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1a2e1f]/98 py-1 shadow-2xl backdrop-blur-xl"
                >
                  {isAdmin && (
                    <Link
                      href="/dashboard/admin"
                      role="menuitem"
                      onClick={closeAll}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 focus-visible:outline-none focus-visible:bg-purple-500/10"
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      {t("admin")}
                    </Link>
                  )}
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={closeAll}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:bg-white/10"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    {t("account")}
                  </Link>
                  <Link
                    href="/dashboard#locations"
                    role="menuitem"
                    onClick={closeAll}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:bg-white/10"
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {t("myLocations")}
                  </Link>
                  <Link
                    href="/dashboard#best-days"
                    role="menuitem"
                    onClick={closeAll}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:bg-white/10"
                  >
                    <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                    {t("myBestDays")}
                  </Link>
                  <Link
                    href="/payment"
                    role="menuitem"
                    onClick={closeAll}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:bg-white/10"
                  >
                    <Coins className="h-4 w-4" aria-hidden="true" />
                    {t("tokens")}
                  </Link>
                  {/* Реферальная программа скрыта в нативе: токены за
                      промокоды — механизм вне IAP (Apple 3.1.1). */}
                  {!isNative && (
                    <Link
                      href="/dashboard/referral"
                      role="menuitem"
                      onClick={closeAll}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:bg-white/10"
                    >
                      <Gift className="h-4 w-4" aria-hidden="true" />
                      {t("referral")}
                    </Link>
                  )}
                  <div className="my-1 border-t border-white/10" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t("logout")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {!isNative && (
            <>
              <LocaleSwitcher />
              <UnitSwitcher />
            </>
          )}
          <Link
            href="/payment"
            aria-label={`${t("tokens")}: ${balanceLoading ? "..." : balanceValue}`}
            title={balanceTitle}
            className={cn(
              "relative flex min-h-[28px] items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
              isNative
                ? "token-pill"
                : isCritical
                  ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
                  : isLow
                    ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/40"
                    : "bg-amber-500/15 text-amber-400",
            )}
          >
            <Coins className="h-3.5 w-3.5" aria-hidden="true" />
            {balanceLoading ? "..." : balanceValue}
            {isCritical && !isNative && (
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            )}
          </Link>
          {!isNative && (
            <Link
              href="/dashboard/marketplace/chats"
              aria-label={t("messages")}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {unreadChats > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                  aria-label={`${unreadChats} ${t("messages").toLowerCase()}`}
                >
                  {unreadChats > 9 ? "9+" : unreadChats}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label={t("menu")}
            aria-expanded={mobileNav}
            aria-controls="app-mobile-nav"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-white/[0.05] text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            {mobileNav ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileNav && (
        <>
          <div
            className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-hidden="true"
          />
          <div
            id="app-mobile-nav"
            className={cn(
              "relative z-40 border-t border-white/[0.06] bg-[#0c150f] px-3 pt-2 lg:hidden",
              isNative
                ? "max-h-[calc(100dvh-3.25rem)] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]"
                : "pb-4",
            )}
          >
            <nav className="space-y-1" aria-label={t("home")}>
              {NAV.map((item, index) => {
                // В native скрываем «Грибные туры» (на вебе пункт остаётся).
                if (isNative && item.href === "/dashboard/mushroom-tours") {
                  return null;
                }
                const active = isActive(item);

                if (index === 0) {
                  return (
                    <div key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeAll}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-primary/15 text-primary-light"
                            : "text-[#c7d4c9] hover:bg-white/[0.05]",
                        )}
                      >
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                        {item.label}
                      </Link>
                      {/* Сайтовые ссылки на вебе показываем сразу под «Главной»
                          (текущее веб-поведение). В native они уносятся вниз
                          в отдельную группу «Site Section». */}
                      {!isNative && (
                        <>
                          <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-foreground/45">
                            {t("siteSections")}
                          </p>
                          {siteNavLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={closeAll}
                              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-white/5 hover:text-foreground"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeAll}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/20 text-primary-light"
                        : "text-foreground/80 hover:bg-white/5"
                    )}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}

              {/* Токены: в нативе — точка входа к покупке через IAP,
                  на вебе — как раньше */}
              <Link
                href="/payment"
                onClick={closeAll}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  pathname === "/payment" || pathname.startsWith("/payment/")
                    ? "bg-amber-500/20 text-amber-300"
                    : "text-amber-400 hover:bg-white/5"
                )}
              >
                <Coins className="h-5 w-5" aria-hidden="true" />
                {t("tokens")}
              </Link>

              <div className="my-2 border-t border-white/10" />

              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  onClick={closeAll}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    pathname.startsWith("/dashboard/admin")
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-purple-400 hover:bg-purple-500/10"
                  )}
                >
                  <Shield className="h-5 w-5" aria-hidden="true" />
                  {t("admin")}
                </Link>
              )}

              <Link
                href="/account"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
              >
                <User className="h-5 w-5" aria-hidden="true" />
                {t("account")}
              </Link>
              <Link
                href="/dashboard#locations"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
              >
                <MapPin className="h-5 w-5" aria-hidden="true" />
                {t("myLocations")}
              </Link>
              <Link
                href="/dashboard#best-days"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
              >
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                {t("myBestDays")}
              </Link>
              {/* Реферальная программа скрыта в нативе (Apple 3.1.1). */}
              {!isNative && (
                <Link
                  href="/dashboard/referral"
                  onClick={closeAll}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5"
                >
                  <Gift className="h-5 w-5" aria-hidden="true" />
                  {t("referral")}
                </Link>
              )}

              <div className="my-2 border-t border-white/10" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                {t("logout")}
              </button>

              {/* Раздел сайта — только в native, отдельной группой снизу.
                  Веб-меню сюда не попадает (сайтовые ссылки на вебе показаны
                  вверху под «Главной»). */}
              {isNative && (
                <>
                  <div className="my-2 border-t border-white/10" />
                  <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-foreground/45">
                    {t("siteSections")}
                  </p>
                  {siteNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeAll}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/75 transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
