"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Category = "all" | "product" | "usage" | "billing" | "privacy";

// Map FAQ items (q0..q11) to categories. Order preserved.
const FAQ_ITEMS: { key: string; cat: Exclude<Category, "all"> }[] = [
  { key: "0", cat: "product" }, // Что такое?
  { key: "1", cat: "usage" }, // Как начать?
  { key: "2", cat: "usage" }, // Какие данные нужны?
  { key: "3", cat: "product" }, // Работает ли в моей стране?
  { key: "4", cat: "usage" }, // Какие грибы?
  { key: "5", cat: "usage" }, // Настройка параметров
  { key: "6", cat: "product" }, // Приложение?
  { key: "7", cat: "billing" }, // Токены
  { key: "12", cat: "billing" }, // Как осуществляется покупка
  { key: "8", cat: "product" }, // Точность
  { key: "9", cat: "usage" }, // Карта осадков
  { key: "10", cat: "billing" }, // Маркетплейс
  { key: "11", cat: "privacy" }, // Видят ли другие
];

export function FAQ() {
  const t = useTranslations("faq");
  const [open, setOpen] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const categories: { id: Category; label: string }[] = [
    { id: "all", label: t("catAll") },
    { id: "product", label: t("catProduct") },
    { id: "usage", label: t("catUsage") },
    { id: "billing", label: t("catBilling") },
    { id: "privacy", label: t("catPrivacy") },
  ];

  const items = useMemo(
    () =>
      FAQ_ITEMS.map((item) => ({
        id: item.key,
        cat: item.cat,
        q: t(`q${item.key}` as Parameters<typeof t>[0]),
        a: t(`a${item.key}` as Parameters<typeof t>[0]),
      })),
    [t]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.cat !== category) return false;
      if (!q) return true;
      return (
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q)
      );
    });
  }, [items, category, query]);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-white/60">{t("subtitle")}</p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light",
                  category === c.id
                    ? "bg-primary text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-white/5 py-8 text-center text-sm text-white/50">
            {t("noResults")}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const isOpen = open === item.id;
              return (
                <div
                  key={item.id}
                  className="glass overflow-hidden rounded-2xl transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${item.id}`}
                    id={`faq-trigger-${item.id}`}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-inset"
                  >
                    <span className="text-sm font-semibold text-white sm:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`faq-panel-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${item.id}`}
                    hidden={!isOpen}
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
        )}
      </div>
    </section>
  );
}
