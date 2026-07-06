import {
  CloudSun,
  BarChart3,
  Map,
  CheckCircle2,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function Bridge() {
  const t = await getTranslations("bridge");

  const CAPABILITIES = [
    { icon: Thermometer, text: t("cap0") },
    { icon: BarChart3, text: t("cap1") },
    { icon: Droplets, text: t("cap2") },
    { icon: Wind, text: t("cap3") },
  ];

  const STEPS = [
    {
      icon: CloudSun,
      num: t("s1n"),
      title: t("s1t"),
      desc: t("s1d"),
    },
    {
      icon: CheckCircle2,
      num: t("s2n"),
      title: t("s2t"),
      desc: t("s2d"),
    },
    {
      icon: BarChart3,
      num: t("s3n"),
      title: t("s3t"),
      desc: t("s3d"),
    },
    {
      icon: Map,
      num: t("s4n"),
      title: t("s4t"),
      desc: t("s4d"),
    },
  ];

  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-20 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-light">
              {t("eyebrow")}
            </p>
            <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mb-8 text-white/60 leading-relaxed">{t("intro")}</p>
            <ul className="space-y-4">
              {CAPABILITIES.map((cap) => (
                <li key={cap.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <cap.icon className="h-3.5 w-3.5 text-primary-light" />
                  </div>
                  <span className="text-sm text-white/80">{cap.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="glass-strong overflow-hidden rounded-2xl">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-1">
                <div className="rounded-xl bg-black/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-white/30">
                      {t("mockUrl")}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-white/60">
                          {t("mockMatch")}
                        </span>
                        <span className="text-lg font-bold text-primary-light">
                          87%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-primary to-primary-light" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/5 p-3">
                        <p className="text-[10px] text-white/40">
                          {t("mockTemp")}
                        </p>
                        <p className="text-sm font-semibold text-white">
                          +18°C
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <p className="text-[10px] text-white/40">
                          {t("mockHumidity")}
                        </p>
                        <p className="text-sm font-semibold text-white">82%</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <p className="text-[10px] text-white/40">
                          {t("mockRain")}
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {t("mockRainValue")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <p className="text-[10px] text-white/40">
                          {t("mockWind")}
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {t("mockWindValue")}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3 text-center">
                      <p className="text-xs text-primary-light">{t("mockHint")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl bg-primary/10 blur-xl" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="glass rounded-2xl p-6 transition-all hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-primary-light">
                  {step.num}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <step.icon className="h-5 w-5 text-primary-light" />
                </div>
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
