"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsLoggedIn } from "@/lib/useIsLoggedIn";

const NAV_LINKS = [
  { label: "Начало", href: "/" },
  { label: "О сервисе", href: "/#about" },
  { label: "Тарифы", href: "/#tariffs" },
  { label: "FAQ", href: "/#faq" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loggedIn = useIsLoggedIn();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-black/70 backdrop-blur-xl shadow-lg"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/images/logo.png"
            alt="SkyForest"
            width={160}
            height={50}
            className="h-10 w-auto sm:h-12"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              <LayoutDashboard className="h-4 w-4" />
              Мой кабинет
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Начать
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn("rounded-lg p-2 md:hidden", "text-white")}
            aria-label="Меню"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            {loggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-primary-light transition-colors hover:bg-white/10"
              >
                <LayoutDashboard className="h-4 w-4" />
                Мой кабинет
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Войти
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
