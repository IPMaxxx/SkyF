import { SkipLink } from "@/components/SkipLink";
import { PwaInstallProvider } from "@/lib/pwa/PwaInstallProvider";
import { MobileInstallBanner } from "@/components/pwa/MobileInstallBanner";
import { IosInstallHelpModal } from "@/components/pwa/IosInstallHelpModal";
import { NativeAppProvider } from "@/lib/native/NativeAppProvider";
import { WebOnly } from "@/components/native/NativeOnly";
import { BiometricLockGate } from "@/components/native/BiometricLockGate";
import { routing } from "@/i18n/routing";
import { getSiteJsonLd } from "@/lib/siteJsonLd";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/lib/brand";

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
  const base = BRAND.url;
  const ogImage = `${base}/images/og-cover.png`;
  const keywords = t.raw("keywords") as string[];

  return {
    title: {
      default: t("title"),
      template: `%s | ${BRAND.domain}`,
    },
    description: t("description"),
    keywords,
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: base,
      siteName: BRAND.name,
      locale: locale === "en" ? "en_US" : "ru_BY",
      type: "website",
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
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
      "geo.region": BRAND.seo.geoRegion,
      "geo.placename": BRAND.seo.geoPlacename,
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
      <PwaInstallProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SkipLink />
        <NativeAppProvider />
        <BiometricLockGate />
        {children}
        {/* PWA-подсказки только в вебе/браузере — в нативном приложении не нужны */}
        <WebOnly>
          <MobileInstallBanner />
          <IosInstallHelpModal />
        </WebOnly>
      </PwaInstallProvider>
    </NextIntlClientProvider>
  );
}
