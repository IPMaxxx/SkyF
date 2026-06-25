import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  CloudSun,
  GitCompare,
  Map,
  Trees,
  Bot,
  Store,
  ArrowRight,
} from "lucide-react";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";
import { BRAND } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.services" });
  return marketingPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    path: "/services",
    locale,
  });
}

const SERVICE_ITEMS = [
  { icon: CloudSun, titleKey: "weatherTitle", descKey: "weatherDesc", href: "/instruction" },
  { icon: GitCompare, titleKey: "compareTitle", descKey: "compareDesc", href: "/instruction" },
  { icon: Map, titleKey: "rainTitle", descKey: "rainDesc", href: "/instruction" },
  { icon: Trees, titleKey: "forestTitle", descKey: "forestDesc", href: "/instruction" },
  { icon: Bot, titleKey: "botTitle", descKey: "botDesc", href: "/#bot" },
  { icon: Store, titleKey: "marketplaceTitle", descKey: "marketplaceDesc", href: "/instruction" },
] as const;

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.services");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <MarketingPageHeader
        locale={locale}
        title={t("title")}
        description={t("lead")}
        breadcrumbs={[{ name: t("title"), path: "/services" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SERVICE_ITEMS.map(({ icon: Icon, titleKey, descKey, href }) => (
          <article
            key={titleKey}
            className="glass rounded-2xl p-5 transition-colors hover:bg-white/10"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Icon className="h-5 w-5 text-primary-light" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">{t(titleKey)}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t(descKey)}</p>
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-light hover:underline"
            >
              {t("moreLink")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/#tariffs"
          className="rounded-xl bg-primary/20 px-5 py-2.5 text-sm font-medium text-primary-light transition-colors hover:bg-primary/30"
        >
          {t("pricingLink")}
        </Link>
        <Link
          href="/register"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {t("registerLink")}
        </Link>
        <Link
          href="/blog"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
        >
          {locale === "en" ? "Blog" : "Блог"}
        </Link>
      </div>

      {BRAND.mushroomBotUrl && (
        <p className="mt-8 text-sm text-muted-foreground">
          {locale === "en" ? "Mushroom ID bot: " : "Бот определения грибов: "}
          <a
            href={BRAND.mushroomBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-light hover:underline"
          >
            {BRAND.mushroomBotHandle || BRAND.mushroomBotUrl}
          </a>
        </p>
      )}
    </div>
  );
}
