"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface HowItWorksPopoverProps {
  /** Заголовок модалки; по умолчанию — «Как это работает». */
  title?: string;
  /** Доп. классы для кнопки-триггера. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Компактная справка «Как это работает»: значок вопроса рядом с заголовком
 * страницы/секции, по нажатию — модалка с описанием логики функционала.
 * На мобиле — шторка снизу со скроллом и учётом safe-area.
 */
export function HowItWorksPopover({ title, className = "", children }: HowItWorksPopoverProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const heading = title ?? t("howItWorks");

  // Закрытие по Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("howItWorksAria")}
        aria-haspopup="dialog"
        title={heading}
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground ${className}`}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-[10000] flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-white/10 bg-[#1a2a1f]/95 shadow-2xl backdrop-blur-xl sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2 pl-5 pr-2">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <HelpCircle className="h-4 w-4 flex-shrink-0 text-primary-light" />
                {heading}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm leading-relaxed text-muted-foreground">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
