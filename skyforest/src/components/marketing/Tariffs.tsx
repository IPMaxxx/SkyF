"use client";

import { Check, Sparkles } from "lucide-react";
import { useIsLoggedIn } from "@/lib/useIsLoggedIn";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Tariffs() {
  const loggedIn = useIsLoggedIn();
  const t = useTranslations("tariffs");

  const PLANS = [
    {
      name: t("startName"),
      desc: t("startDesc"),
      price: t("startPrice"),
      priceNote: t("startNote"),
      highlight: false,
      features: [
        t("fStart0"),
        t("fStart1"),
        t("fStart2"),
        t("fStart3"),
        t("fStart4"),
      ],
      cta: t("startCta"),
      ctaLoggedIn: t("startCtaIn"),
      href: "/register",
      hrefLoggedIn: "/dashboard",
    },
    {
      name: t("stdName"),
      desc: t("stdDesc"),
      price: t("stdPrice"),
      priceNote: t("stdNote"),
      highlight: true,
      features: [t("fStd0"), t("fStd1"), t("fStd2"), t("fStd3"), t("fStd4")],
      cta: t("stdCta"),
      href: "/payment",
    },
    {
      name: t("proName"),
      desc: t("proDesc"),
      price: t("proPrice"),
      priceNote: t("proNote"),
      highlight: false,
      features: [t("fPro0"), t("fPro1"), t("fPro2"), t("fPro3"), t("fPro4")],
      cta: t("proCta"),
      href: "/payment",
    },
  ];

  return (
    <section id="tariffs" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">{t("subtitle")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col overflow-hidden rounded-2xl transition-all ${
                plan.highlight
                  ? "glass-strong ring-1 ring-primary/40 sm:scale-[1.02]"
                  : "glass"
              }`}
            >
              {plan.highlight && (
                <div className="flex items-center justify-center gap-1.5 bg-primary py-1.5 text-xs font-semibold text-white">
                  <Sparkles className="h-3 w-3" />
                  {t("popular")}
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                <h3 className="mb-1 text-lg font-bold text-white">{plan.name}</h3>
                <p className="mb-4 text-sm text-white/50">{plan.desc}</p>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {plan.price}
                  </span>
                  <p className="mt-1 text-xs text-white/40">{plan.priceNote}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Check className="h-3 w-3 text-primary-light" />
                      </div>
                      <span className="text-sm text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={
                    loggedIn && "hrefLoggedIn" in plan && plan.hrefLoggedIn
                      ? plan.hrefLoggedIn
                      : plan.href
                  }
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark hover:shadow-xl"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {loggedIn && "ctaLoggedIn" in plan && plan.ctaLoggedIn
                    ? plan.ctaLoggedIn
                    : plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/40">{t("footnote")}</p>
      </div>
    </section>
  );
}
