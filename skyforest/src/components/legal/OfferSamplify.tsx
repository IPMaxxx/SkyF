import { BRAND } from "@/lib/brand";

export function OfferSamplify() {
  return (
    <div className="prose prose-sm max-w-none space-y-6 text-foreground">
      <p className="text-muted-foreground">
        Dubai, UAE — March 24, 2026 — Revision 1
      </p>

      <h2 className="text-xl font-semibold">
        Terms of Service for Weather Data Analysis
      </h2>

      <p>
        {BRAND.company.legalName} (hereinafter — the Provider), registered at{" "}
        {BRAND.company.address}, publishes these Terms of Service regarding the
        following:
      </p>

      <h3 className="text-lg font-semibold">1. Definitions</h3>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Service</strong> — the software platform at {BRAND.url}{" "}
          providing informational services for collecting, visualizing,
          comparing, and analyzing publicly available meteorological data.
        </li>
        <li>
          <strong>User</strong> — an individual who registers and uses the
          Service.
        </li>
        <li>
          <strong>Tokens</strong> — internal units used to access paid features
          of the Service. Tokens are not currency, securities, or electronic
          money.
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

      <h3 className="text-lg font-semibold">4. Tokens and payment</h3>
      <p>
        Tokens are purchased via {BRAND.paymentProviderName}. Prices are shown
        in {BRAND.currency} before checkout. Payment processing is handled by{" "}
        {BRAND.paymentProviderName} (PCI DSS Level 1). The Provider does not
        store card details.
      </p>
      <p>
        Unused tokens may be refunded within 14 calendar days of purchase if no
        tokens from that package were spent. Refund requests: {BRAND.contacts.email}.
      </p>

      <h3 className="text-lg font-semibold">5. Acceptable use</h3>
      <p>
        The User shall not abuse the Service, attempt unauthorized access,
        scrape data at scale, or use the Service for unlawful purposes.
      </p>

      <h3 className="text-lg font-semibold">6. Disclaimer</h3>
      <p>
        Weather data is provided for informational purposes only. The Provider
        does not guarantee mushroom yields, safety of foraging locations, or
        accuracy of third-party data sources.
      </p>

      <h3 className="text-lg font-semibold">7. Personal data</h3>
      <p>
        Processing of personal data is governed by the Privacy Policy at{" "}
        {BRAND.url}/privacy and applicable UAE data protection regulations.
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
