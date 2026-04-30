"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  topLine: string;
  bottomLine: string;
};

export const GooglePlayBadge = forwardRef<HTMLButtonElement, Props>(
  function GooglePlayBadge({ topLine, bottomLine, className, ...rest }, ref) {
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
          viewBox="0 0 28 30"
          aria-hidden="true"
          className="h-7 w-7"
        >
          <path
            d="M2.2 0.5C1.6 0.9 1.3 1.6 1.3 2.4v25.2c0 0.8 0.3 1.5 0.9 1.9l13.5-14.5L2.2 0.5z"
            fill="#34A853"
          />
          <path
            d="M21.7 9.7L17.3 7.2 2.2 0.5l13.5 14.5 6-5.3z"
            fill="#FBBC04"
          />
          <path
            d="M2.2 29.5L17.3 22.8l4.4-2.5-6-5.3L2.2 29.5z"
            fill="#EA4335"
          />
          <path
            d="M21.7 9.7l-6 5.3 6 5.3 4.4-2.5c1.6-0.9 1.6-3.2 0-4.1l-4.4-4z"
            fill="#4285F4"
          />
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
