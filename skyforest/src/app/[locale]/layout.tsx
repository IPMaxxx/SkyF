import { TelegramFab } from "@/components/TelegramFab";
import { SkipLink } from "@/components/SkipLink";
import { routing } from "@/i18n/routing";
import { getSiteJsonLd } from "@/lib/siteJsonLd";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const base = "https://www.skyforest.by";
  const keywords = t.raw("keywords") as string[];

  return {
    title: {
      default: t("title"),
      template: "%s | Skyforest.by",
    },
    description: t("description"),
    keywords,
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: base,
      siteName: "Skyforest",
      locale: locale === "en" ? "en_US" : "ru_BY",
      type: "website",
      images: [
        {
          url: "https://www.skyforest.by/images/og-cover.png",
          width: 1200,
          height: 630,
          alt: t("ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      images: ["https://www.skyforest.by/images/og-cover.png"],
    },
    alternates: {
      canonical: locale === "en" ? `${base}/en` : base,
      languages: {
        ru: base,
        en: `${base}/en`,
      },
    },
    metadataBase: new URL(base),
    icons: { icon: "/favicon.png" },
    other: {
      "geo.region": "BY",
      "geo.placename": "Belarus",
      "content-language": t("contentLanguage"),
    },
    category: "lifestyle",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const jsonLd = getSiteJsonLd(locale as "ru" | "en");

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SkipLink />
      {children}
      <TelegramFab />
    </NextIntlClientProvider>
  );
}
