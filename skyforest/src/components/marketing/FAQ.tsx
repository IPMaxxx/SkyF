"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

const Q_KEYS = [
  "q0",
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
] as const;
const A_KEYS = [
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
  "a7",
  "a8",
  "a9",
  "a10",
  "a11",
] as const;

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const t = useTranslations("faq");

  const questions = Q_KEYS.map((qk, i) => ({
    q: t(qk),
    a: t(A_KEYS[i]),
  }));

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-white/60">{t("subtitle")}</p>
        </div>

        <div className="space-y-3">
          {questions.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="glass overflow-hidden rounded-2xl transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-semibold text-white sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-white/5 px-5 pb-5 pt-0 text-sm leading-relaxed text-white/60">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
