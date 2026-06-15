"use client";

import Image from "next/image";
import { ArrowRight, Bell, Droplets, ScanSearch, Store, Trees } from "lucide-react";
import { useIsLoggedIn } from "@/lib/useIsLoggedIn";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Hero() {
  const loggedIn = useIsLoggedIn();
  const t = useTranslations("hero");

  const FEATURES = [
    { icon: Bell, title: t("f0Title"), desc: t("f0Desc") },
    { icon: Droplets, title: t("f1Title"), desc: t("f1Desc") },
    { icon: ScanSearch, title: t("f4Title"), desc: t("f4Desc") },
    { icon: Store, title: t("f2Title"), desc: t("f2Desc") },
    { icon: Trees, title: t("f3Title"), desc: t("f3Desc") },
  ];

  return (
    <>
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20 text-center text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <Image
            src="/images/logo-square.png"
            alt="SkyForest"
            width={144}
            height={144}
            sizes="(max-width: 640px) 112px, 144px"
            className="mx-auto mb-8 h-28 w-28 sm:h-36 sm:w-36 rounded-2xl"
            priority
          />

          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {t("titleLine1")}
            <br />
            <span className="text-primary-light">{t("titleLine2")}</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            {t("subtitle")}
            <span className="text-white font-medium">{t("subtitleEmphasis")}</span>
          </p>

          <div className="mb-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-6 text-left transition-all hover:bg-white/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <f.icon className="h-6 w-6 text-primary-light" />
                </div>
                <p className="mb-2 text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs leading-relaxed text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
