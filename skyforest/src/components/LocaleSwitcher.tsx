"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Globe, Check, ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useIsNative } from "@/lib/native/useIsNative";

const LABELS: Record<string, string> = { ru: "RU", en: "EN" };

/**
 * Переключатель языка.
 *  - web (default) — сегментированный контрол RU/EN (без изменений);
 *  - native — компактный дропдаун (глобус + текущий язык), чтобы экономить
 *    место в шапке. Ветвление через useIsNative(): до гидрации и в браузере
 *    возвращается false, поэтому веб-раскладка не меняется.
 */
export function LocaleSwitcher({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const isNative = useIsNative();

  if (isNative) {
    return (
      <NativeLocaleDropdown
        locale={locale}
        pathname={pathname}
        variant={variant}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border p-0.5 text-xs font-medium",
        variant === "dark"
          ? "border-white/15 bg-white/5"
          : "border-black/10 bg-black/5",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          href={pathname}
          locale={loc}
          scroll={false}
          className={cn(
            "rounded-md px-2 py-1 transition-colors",
            loc === locale
              ? variant === "dark"
                ? "bg-white/15 text-white"
                : "bg-white text-[#0d1a12]"
              : variant === "dark"
                ? "text-white/60 hover:text-white"
                : "text-black/50 hover:text-black"
          )}
        >
          {LABELS[loc]}
        </Link>
      ))}
    </div>
  );
}

function NativeLocaleDropdown({
  locale,
  pathname,
  variant,
  className,
}: {
  locale: string;
  pathname: string;
  variant: "dark" | "light";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Language"
        className={cn(
          "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
          variant === "dark"
            ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
            : "border-black/10 bg-black/5 text-black/70 hover:bg-black/10"
        )}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {LABELS[locale]}
        <ChevronDown
          className={cn("h-3 w-3 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-28 overflow-hidden rounded-xl border border-white/10 bg-[#1a2e1f]/98 py-1 shadow-2xl backdrop-blur-xl"
          >
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                scroll={false}
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-current={loc === locale ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm transition-colors",
                  loc === locale
                    ? "bg-primary/15 font-medium text-primary-light"
                    : "text-foreground/80 hover:bg-white/10 hover:text-foreground"
                )}
              >
                {LABELS[loc]}
                {loc === locale && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
