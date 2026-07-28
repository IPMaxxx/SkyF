import { SkipLink } from "@/components/SkipLink";
import { PwaInstallProvider } from "@/lib/pwa/PwaInstallProvider";
import { MobileInstallBanner } from "@/components/pwa/MobileInstallBanner";
import { IosInstallHelpModal } from "@/components/pwa/IosInstallHelpModal";
import { NativeAppProvider } from "@/lib/native/NativeAppProvider";
import { WebOnly } from "@/components/native/NativeOnly";
import { NativeSplash } from "@/components/native/NativeSplash";
import { UpdatePrompt } from "@/components/native/UpdatePrompt";
import { BiometricLockGate } from "@/components/native/BiometricLockGate";
import { routing } from "@/i18n/routing";
import { getSiteJsonLd } from "@/lib/siteJsonLd";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { flavorFromHost, flavorConfig } from "@/lib/appFlavor";
import { FlavorProvider } from "@/lib/FlavorProvider";

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

  // На поддоменах флейворов — свои название и иконка.
  const flavor = flavorConfig(flavorFromHost((await headers()).get("host")));
  if (flavor.id !== "skyforest") {
    const tFlavor = await getTranslations({ locale, namespace: `flavor.${flavor.id}` });
    return {
      title: { default: flavor.name, template: `%s | ${flavor.name}` },
      description: tFlavor("metaDescription"),
      icons: { icon: flavor.faviconPath },
      robots: { index: false }, // посадочные поддоменов не индексируем
    };
  }

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
  // Разметка организации и PWA-подсказки описывают сайт SkyForest — на
  // поддоменах флейворов (у них свои приложения в сторах) они не нужны.
  const flavor = flavorFromHost((await headers()).get("host"));
  const isFlavored = flavor !== "skyforest";
  const jsonLd = isFlavored ? null : getSiteJsonLd(locale as "ru" | "en");
  // Mushroom Checker монтирует свой светлый splash в src/app/[locale]/ck/layout.
  const isChecker = flavor === "checker";

  return (
    <NextIntlClientProvider messages={messages}>
      <FlavorProvider flavor={flavor}>
        <PwaInstallProvider>
          {jsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
          )}
          <SkipLink />
          <NativeAppProvider />
          {!isChecker && <NativeSplash />}
          <UpdatePrompt />
          <BiometricLockGate />
          {children}
          {/* PWA-подсказки только в вебе/браузере — в нативном приложении не нужны */}
          {!isFlavored && (
            <WebOnly>
              <MobileInstallBanner />
              <IosInstallHelpModal />
            </WebOnly>
          )}
        </PwaInstallProvider>
      </FlavorProvider>
    </NextIntlClientProvider>
  );
}
