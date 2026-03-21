"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const locale = useLocale();
  const pathname = usePathname();

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
          {loc === "ru" ? "RU" : "EN"}
        </Link>
      ))}
    </div>
  );
}
