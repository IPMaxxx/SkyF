import {
  CreditCard,
  Landmark,
  Lock,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND, isSamplify } from "@/lib/brand";

export async function HowPurchase() {
  const t = await getTranslations("howPurchase");
  const provider = BRAND.paymentProviderName;

  const STEPS = [
    {
      icon: UserRound,
      num: "01",
      title: t("s1t"),
      desc: t("s1d"),
    },
    {
      icon: Package,
      num: "02",
      title: t("s2t"),
      desc: t("s2d"),
    },
    {
      icon: CreditCard,
      num: "03",
      title: t("s3t"),
      desc: t("s3d", { provider }),
    },
    {
      icon: ShieldCheck,
      num: "04",
      title: t("s4t"),
      desc: t("s4d"),
    },
  ];

  const methods = isSamplify
    ? [
        {
          icon: CreditCard,
          title: t("methodCardTitle"),
          desc: t("methodCardDescSamplify", { provider }),
        },
      ]
    : [
        {
          icon: CreditCard,
          title: t("methodCardTitle"),
          desc: t("methodCardDesc", { provider }),
        },
        {
          icon: Landmark,
          title: t("methodEripTitle"),
          desc: t("methodEripDesc"),
        },
      ];

  return (
    <section id="how-purchase" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-light">
            {t("eyebrow")}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">
            {t("subtitle", { provider })}
          </p>
        </div>

        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <h3 className="mb-4 text-lg font-semibold text-white">
              {t("methodsTitle")}
            </h3>
            <ul className="space-y-4">
              {methods.map((method) => (
                <li key={method.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <method.icon className="h-4 w-4 text-primary-light" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {method.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      {method.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                <Lock className="h-4 w-4 text-primary-light" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {t("securityTitle")}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              {t("securityBody", { provider })}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {t("security3ds")}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href="/payment_method"
                className="font-medium text-primary-light underline-offset-4 hover:underline"
              >
                {t("linkMethods")}
              </Link>
              <Link
                href="/return_goods"
                className="font-medium text-primary-light underline-offset-4 hover:underline"
              >
                {t("linkReturns")}
              </Link>
              <Link
                href="/offer"
                className="font-medium text-primary-light underline-offset-4 hover:underline"
              >
                {t("linkOffer")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
