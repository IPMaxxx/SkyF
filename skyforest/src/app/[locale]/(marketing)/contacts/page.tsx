import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail, Phone, Send, MapPin } from "lucide-react";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";
import { FOOTER_LEGAL_LINKS } from "@/lib/siteNav";
import { BRAND } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contacts" });
  return marketingPageMetadata({
    title: t("title"),
    description: t("metaDescription"),
    path: "/contacts",
    locale,
  });
}

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.contacts");
  const tFooter = await getTranslations("footer");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <MarketingPageHeader
        locale={locale}
        title={t("title")}
        description={t("lead")}
        breadcrumbs={[{ name: t("title"), path: "/contacts" }]}
      />

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("supportTitle")}</h2>
          <ul className="space-y-3">
            <li>
              <a
                href={`mailto:${BRAND.contacts.email}`}
                className="flex items-center gap-3 text-sm transition-colors hover:text-primary-light"
              >
                <Mail className="h-4 w-4 flex-shrink-0 text-primary-light" />
                {BRAND.contacts.email}
              </a>
            </li>
            {BRAND.contacts.phone && (
              <li>
                <a
                  href={`tel:${BRAND.contacts.phone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-3 text-sm transition-colors hover:text-primary-light"
                >
                  <Phone className="h-4 w-4 flex-shrink-0 text-primary-light" />
                  {BRAND.contacts.phone}
                </a>
              </li>
            )}
            {BRAND.contacts.telegram && (
              <li>
                <a
                  href={BRAND.contacts.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm transition-colors hover:text-primary-light"
                >
                  <Send className="h-4 w-4 flex-shrink-0 text-primary-light" />
                  {BRAND.contacts.telegramLabel || tFooter("telegramSupport")}
                </a>
              </li>
            )}
          </ul>
        </section>

        <section id="address">
          <h2 className="mb-4 text-xl font-semibold">{t("addressTitle")}</h2>
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-light" />
              <p className="text-sm">{BRAND.company.address}</p>
            </div>
            <p className="text-sm font-medium text-foreground/90">
              {BRAND.company.legalName}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {BRAND.company.registrationLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("legalTitle")}</h2>
          <ul className="flex flex-wrap gap-2">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-white/10"
                >
                  {tFooter(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("relatedTitle")}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/services" className="text-primary-light hover:underline">
                {locale === "en" ? "Services" : "Услуги"}
              </Link>
            </li>
            <li>
              <Link href="/promotions" className="text-primary-light hover:underline">
                {locale === "en" ? "Promotions" : "Акции"}
              </Link>
            </li>
            <li>
              <Link href="/instruction" className="text-primary-light hover:underline">
                {tFooter("instruction")}
              </Link>
            </li>
            <li>
              <Link href="/payment_method" className="text-primary-light hover:underline">
                {tFooter("paymentMethods")}
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
