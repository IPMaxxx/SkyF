import { Footprints, Flag, Route, Compass, WifiOff, BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function TrackFeature() {
  const t = await getTranslations("trackLanding");

  const STEPS = [
    { icon: Flag, num: "01", title: t("s1t"), desc: t("s1d") },
    { icon: Route, num: "02", title: t("s2t"), desc: t("s2d") },
    { icon: Compass, num: "03", title: t("s3t"), desc: t("s3d") },
    { icon: WifiOff, num: "04", title: t("s4t"), desc: t("s4d") },
  ];

  return (
    <section id="track" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-emerald-950/20" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-300">
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
                <span className="text-2xl font-bold text-emerald-300">
                  {step.num}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <step.icon className="h-5 w-5 text-emerald-300" />
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
          <Link
            href="/dashboard/track"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            <Footprints className="h-4 w-4" aria-hidden="true" />
            {t("openTrack")}
          </Link>
          <Link
            href="/blog/kak-ne-zabluditsya-v-lesu"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t("readMore")}
          </Link>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-white/40">
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}
