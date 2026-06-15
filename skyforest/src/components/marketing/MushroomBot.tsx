import { ScanSearch, Gift, Coins, ArrowRightLeft, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";

export async function MushroomBot() {
  const t = await getTranslations("mushroomBotLanding");
  const botUrl = BRAND.mushroomBotUrl || "https://t.me/skyforest_mushroom_bot";

  const STEPS = [
    { icon: Gift, num: "01", title: t("s1t"), desc: t("s1d") },
    { icon: Coins, num: "02", title: t("s2t"), desc: t("s2d") },
    { icon: ArrowRightLeft, num: "03", title: t("s3t"), desc: t("s3d") },
    { icon: ScanSearch, num: "04", title: t("s4t"), desc: t("s4d") },
  ];

  return (
    <section id="bot" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-sky-300">
            {t("eyebrow")}
          </p>
          <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-white/60 leading-relaxed">{t("intro")}</p>
        </div>

        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="glass rounded-2xl p-6 transition-all hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-sky-300">
                  {step.num}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20">
                  <step.icon className="h-5 w-5 text-sky-300" />
                </div>
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {t("openBot")}
          </a>
          <Link
            href="/account"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            {t("manageTokens")}
          </Link>
        </div>
      </div>
    </section>
  );
}
