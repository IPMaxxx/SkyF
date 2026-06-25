import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Gift, Sparkles, Coins } from "lucide-react";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.promotions" });
  return marketingPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    path: "/promotions",
    locale,
  });
}

export default async function PromotionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.promotions");

  const cards = [
    {
      icon: Gift,
      title: t("referralTitle"),
      desc: t("referralDesc"),
      cta: t("referralCta"),
      href: "/dashboard/referral",
    },
    {
      icon: Sparkles,
      title: t("welcomeTitle"),
      desc: t("welcomeDesc"),
      cta: t("welcomeCta"),
      href: "/register",
    },
    {
      icon: Coins,
      title: t("packsTitle"),
      desc: t("packsDesc"),
      cta: t("packsCta"),
      href: "/#tariffs",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <MarketingPageHeader
        locale={locale}
        title={t("title")}
        description={t("lead")}
        breadcrumbs={[{ name: t("title"), path: "/promotions" }]}
      />

      <div className="space-y-4">
        {cards.map(({ icon: Icon, title, desc, cta, href }) => (
          <article key={href} className="glass rounded-2xl p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <Icon className="h-5 w-5 text-amber-400" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">{title}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
            <Link
              href={href}
              className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              {cta}
            </Link>
          </article>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {locale === "en" ? "Questions? " : "Вопросы? "}
        <Link href="/contacts" className="text-primary-light hover:underline">
          {locale === "en" ? "Contact us" : "Свяжитесь с нами"}
        </Link>
      </p>
    </div>
  );
}
