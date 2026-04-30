"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  topLine: string;
  bottomLine: string;
};

export const AppStoreBadge = forwardRef<HTMLButtonElement, Props>(
  function AppStoreBadge({ topLine, bottomLine, className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        className={
          "group inline-flex items-center gap-3 rounded-xl border border-white/15 bg-black px-4 py-2 text-white transition-all hover:border-white/30 hover:bg-neutral-900 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light " +
          (className ?? "")
        }
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-7 w-7 fill-current"
        >
          <path d="M16.365 1.43c0 1.14-.45 2.23-1.18 3.04-.79.88-2.07 1.55-3.13 1.46-.13-1.1.43-2.27 1.13-3.05.79-.88 2.18-1.54 3.18-1.45zM20.5 17.18c-.55 1.27-.81 1.83-1.52 2.95-.99 1.55-2.39 3.49-4.12 3.5-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1-1.73-.01-3.06-1.76-4.05-3.31C0.6 17.55-.34 12.36 1.74 8.85c1.13-1.91 3.01-3.12 4.83-3.15 1.6-.03 3.11 1.08 4.05 1.08.93 0 2.78-1.34 4.7-1.14.8.03 3.06.32 4.51 2.45-3.94 2.16-3.31 7.79.67 9.09z" />
        </svg>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
            {topLine}
          </span>
          <span className="text-base font-semibold tracking-tight">
            {bottomLine}
          </span>
        </span>
      </button>
    );
  }
);
