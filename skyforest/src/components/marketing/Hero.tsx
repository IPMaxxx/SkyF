"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useIsLoggedIn } from "@/lib/useIsLoggedIn";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HeroToolButtons } from "@/components/marketing/HeroToolButtons";

export function Hero() {
  const loggedIn = useIsLoggedIn();
  const t = useTranslations("hero");

  return (
    <>
      <section className="relative px-4 pt-24 pb-8 text-center text-white sm:pt-28 sm:pb-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <Image
            src="/images/logo-square.png"
            alt="SkyForest"
            width={144}
            height={144}
            sizes="(max-width: 640px) 112px, 144px"
            className="mx-auto mb-8 h-28 w-28 rounded-2xl sm:h-36 sm:w-36"
            priority
          />

          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {t("titleLine1")}
            <br />
            <span className="text-primary-light">{t("titleLine2")}</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            {t("subtitle")}
            <span className="font-medium text-white">{t("subtitleEmphasis")}</span>
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={loggedIn ? "/dashboard" : "/register"}
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a12]"
            >
              {loggedIn ? t("ctaLoggedIn") : t("ctaPrimary")}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/#about"
              className="glass flex items-center gap-2 rounded-xl px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {t("ctaLearnMore")}
            </Link>
          </div>
        </div>
      </section>

      <HeroToolButtons />
    </>
  );
}
