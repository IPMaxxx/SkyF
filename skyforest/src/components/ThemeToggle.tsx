"use client";

import { useSyncExternalStore } from "react";
import { Contrast } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sf-theme";
const EVENT = "sf-theme-change";

type Theme = "normal" | "hc";

function readTheme(): Theme {
  if (typeof window === "undefined") return "normal";
  try {
    return localStorage.getItem(STORAGE_KEY) === "hc" ? "hc" : "normal";
  } catch {
    return "normal";
  }
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "hc") {
    document.documentElement.dataset.theme = "hc";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* noop */
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(EVENT));
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("a11y");
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "normal" as Theme
  );

  const toggle = () => {
    setTheme(theme === "hc" ? "normal" : "hc");
  };

  const label = `${t("themeTitle")}: ${
    theme === "hc" ? t("themeHighContrast") : t("themeNormal")
  }`;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "hc"}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
        theme === "hc"
          ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-300/40"
          : "bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground",
        className
      )}
    >
      <Contrast className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
