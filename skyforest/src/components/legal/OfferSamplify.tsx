import { BRAND } from "@/lib/brand";
import { getLegalProduct } from "@/lib/serverFlavor";
import type { AppFlavor } from "@/lib/appFlavor";

/**
 * Оферта оператора (SAMPLIFY FZCO) — юридическая рамка общая для всех
 * продуктов юрлица, а предмет, модель оплаты и дисклеймер зависят от продукта:
 * в SkyForest это анализ погоды и токены, в Checker/WayBack — подписка.
 */
interface ProductCopy {
  heading: string;
  service: string;
  /** Платная модель: определение в разделе «Термины». */
  unitTitle: string;
  unitBody: string;
  paymentTitle: string;
  paymentBody: string;
  refundBody: string;
  disclaimer: string;
}

const PRODUCT_COPY: Record<AppFlavor, ProductCopy> = {
  skyforest: {
    heading: "Terms of Service for Weather Data Analysis",
    service:
      "providing informational services for collecting, visualizing, comparing, and analyzing publicly available meteorological data",
    unitTitle: "Tokens",
    unitBody:
      "internal units used to access paid features of the Service. Tokens are not currency, securities, or electronic money.",
    paymentTitle: "Tokens and payment",
    paymentBody: "Tokens are purchased via",
    refundBody:
      "Unused tokens may be refunded within 14 calendar days of purchase if no tokens from that package were spent.",
    disclaimer:
      "Weather data is provided for informational purposes only. The Provider does not guarantee mushroom yields, safety of foraging locations, or accuracy of third-party data sources.",
  },
  checker: {
    heading: "Terms of Service for Mushroom Identification",
    service:
      "providing informational services for automated recognition of mushrooms from user-submitted photos",
    unitTitle: "Subscription",
    unitBody:
      "recurring paid access to the identification features of the Service. The subscription is not currency, securities, or electronic money.",
    paymentTitle: "Subscription and payment",
    paymentBody: "The subscription is purchased via",
    refundBody:
      "Subscriptions purchased inside the mobile app are refunded under the rules of the corresponding app store (App Store or Google Play). For web payments, refund requests are accepted within 14 calendar days of purchase.",
    disclaimer:
      "Recognition results are produced automatically and are provided for informational purposes only. They are not an expert mycological opinion. The Provider does not guarantee that a mushroom is edible or safe, and is not liable for consequences of consuming any mushroom. Never eat a mushroom identified only by this app.",
  },
  wayback: {
    heading: "Terms of Service for Offline Return Navigation",
    service:
      "providing informational services for saving an entry point and showing the direction and distance back to it, including offline",
    unitTitle: "Subscription",
    unitBody:
      "recurring paid access to the extended features of the Service. The subscription is not currency, securities, or electronic money.",
    paymentTitle: "Subscription and payment",
    paymentBody: "The subscription is purchased via",
    refundBody:
      "Subscriptions purchased inside the mobile app are refunded under the rules of the corresponding app store (App Store or Google Play). For web payments, refund requests are accepted within 14 calendar days of purchase.",
    disclaimer:
      "The Service is an auxiliary navigation aid that depends on the accuracy of the device satellite receiver and on battery charge. It does not replace a map, a compass, or a rescue service, and must not be relied upon as the only means of finding your way. The Provider is not liable for the User's safety in the field.",
  },
};

export async function OfferSamplify() {
  const { flavor, appName, appUrl } = await getLegalProduct();
  const copy = PRODUCT_COPY[flavor];
  // На поддоменах документ читают как условия конкретного приложения, поэтому
  // продукт называется явно; для SkyForest формулировка оставлена прежней.
  const serviceLead =
    flavor === "skyforest"
      ? "the software platform at"
      : `${appName}, the software platform at`;

  return (
    <div className="prose prose-sm max-w-none space-y-6 text-foreground">
      <p className="text-muted-foreground">
        Dubai, UAE — March 24, 2026 — Revision 1
      </p>

      <h2 className="text-xl font-semibold">{copy.heading}</h2>

      <p>
        {BRAND.company.legalName} (hereinafter — the Provider), registered at{" "}
        {BRAND.company.address}, publishes these Terms of Service regarding the
        following:
      </p>

      <h3 className="text-lg font-semibold">1. Definitions</h3>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Service</strong> — {serviceLead} {appUrl} {copy.service}.
        </li>
        <li>
          <strong>User</strong> — an individual who registers and uses the
          Service.
        </li>
        <li>
          <strong>{copy.unitTitle}</strong> — {copy.unitBody}
        </li>
      </ul>

      <h3 className="text-lg font-semibold">2. Subject</h3>
      <p>
        The Provider grants the User access to the Service under these Terms.
        By registering or using the Service, the User accepts these Terms in
        full.
      </p>

      <h3 className="text-lg font-semibold">3. Registration</h3>
      <p>
        Registration requires a valid email address. The User is responsible
        for keeping credentials secure and for all activity under their account.
      </p>

      <h3 className="text-lg font-semibold">4. {copy.paymentTitle}</h3>
      <p>
        {copy.paymentBody} {BRAND.paymentProviderName}. Prices are shown
        in {BRAND.currency} before checkout. Payment processing is handled by{" "}
        {BRAND.paymentProviderName} (PCI DSS Level 1). The Provider does not
        store card details.
      </p>
      <p>
        {copy.refundBody} Refund requests: {BRAND.contacts.email}.
      </p>

      <h3 className="text-lg font-semibold">5. Acceptable use</h3>
      <p>
        The User shall not abuse the Service, attempt unauthorized access,
        scrape data at scale, or use the Service for unlawful purposes.
      </p>

      <h3 className="text-lg font-semibold">6. Disclaimer</h3>
      <p>{copy.disclaimer}</p>

      <h3 className="text-lg font-semibold">7. Personal data</h3>
      <p>
        Processing of personal data is governed by the Privacy Policy at{" "}
        {appUrl}/privacy and applicable UAE data protection regulations.
      </p>

      <h3 className="text-lg font-semibold">8. Governing law</h3>
      <p>
        These Terms are governed by the laws of the United Arab Emirates.
        Disputes shall first be resolved through negotiation; if unresolved,
        through competent courts in Dubai, UAE.
      </p>

      <h3 className="text-lg font-semibold">9. Provider details</h3>
      <div className="rounded-xl bg-muted p-4 text-sm">
        <p>{BRAND.company.legalName}</p>
        <p>{BRAND.company.address}</p>
        {BRAND.company.registrationLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>Email: {BRAND.contacts.email}</p>
      </div>
    </div>
  );
}
