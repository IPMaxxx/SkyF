import { BRAND } from "@/lib/brand";

export function PrivacySamplify() {
  return (
    <div className="prose prose-sm max-w-none space-y-6 text-foreground">
      <p className="text-muted-foreground">Revision of March 24, 2026</p>

      <h2 className="text-xl font-semibold">1. General</h2>
      <p>
        This Privacy Policy describes how {BRAND.company.legalName} (the
        Operator) collects, uses, and protects personal data of users of{" "}
        {BRAND.name} at {BRAND.url}.
      </p>
      <p>
        Operator address: {BRAND.company.address}. By using the Service you
        consent to this Policy.
      </p>

      <h2 className="text-xl font-semibold">2. Data we collect</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Name and email address</li>
        <li>
          Payment metadata processed by {BRAND.paymentProviderName} (PCI DSS
          Level 1). We do not store card numbers.
        </li>
        <li>
          User content: coordinates, notes, photos, mushroom day records
        </li>
        <li>
          Technical data: IP address, browser, device type, session information
        </li>
        <li>Cookies and similar technologies</li>
      </ul>

      <h2 className="text-xl font-semibold">3. Purposes</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Providing and improving the Service</li>
        <li>Processing token purchases and account management</li>
        <li>Customer support and security</li>
        <li>Analytics and service quality (aggregated where possible)</li>
      </ul>

      <h2 className="text-xl font-semibold">4. Third parties</h2>
      <p>
        We use {BRAND.paymentProviderName} for payments, Supabase for hosting
        and authentication, and email providers for transactional messages.
        Data may be processed in the EU, US, or other regions where these
        providers operate.
      </p>

      <h2 className="text-xl font-semibold">5. Retention and rights</h2>
      <p>
        Data is retained while your account is active and as required by law.
        You may request access, correction, or deletion by emailing{" "}
        {BRAND.contacts.email}. We respond within 30 days.
      </p>

      <h2 className="text-xl font-semibold">6. Contact</h2>
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
