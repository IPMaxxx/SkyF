"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsLoggedIn } from "@/lib/useIsLoggedIn";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const loggedIn = useIsLoggedIn();
  const t = useTranslations("header");

  const NAV_LINKS = useMemo<
    { label: string; href: string; sectionId?: string }[]
  >(
    () => [
      { label: t("home"), href: "/" },
      { label: t("about"), href: "/#about", sectionId: "about" },
      { label: t("mushroomBot"), href: "/#bot", sectionId: "bot" },
      { label: t("tariffs"), href: "/#tariffs", sectionId: "tariffs" },
      { label: t("blog"), href: "/blog" },
      { label: t("faq"), href: "/#faq", sectionId: "faq" },
    ],
    [t]
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.sectionId).filter(Boolean) as string[];
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [NAV_LINKS]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (link: { href: string; sectionId?: string }) => {
    if (link.sectionId) return activeSection === link.sectionId;
    return false;
  };

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
        <Link href="/" className="flex-shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light">
          <Image
            src="/images/logo-square.png"
            alt="SkyForest"
            width={48}
            height={48}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("menu")}>
          {NAV_LINKS.map((link) => {
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LocaleSwitcher />
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {t("cabinet")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light sm:block"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
              >
                {t("start")}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "rounded-lg p-2 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
              "text-white"
            )}
            aria-label={t("menu")}
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-nav"
          >
            {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="marketing-mobile-nav"
            className="relative z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl px-4 pb-4 md:hidden"
          >
            <nav className="flex flex-col gap-1 pt-2" aria-label={t("menu")}>
              {NAV_LINKS.map((link) => {
                const active = isActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/80 hover:bg-white/10"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-primary-light transition-colors hover:bg-white/10"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  {t("cabinet")}
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                >
                  {t("login")}
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
