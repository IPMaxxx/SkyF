import { BRAND } from "@/lib/brand";
import { getLegalProduct } from "@/lib/serverFlavor";
import type { AppFlavor } from "@/lib/appFlavor";

/**
 * Политика конфиденциальности оператора (SAMPLIFY FZCO) — общая для всех
 * продуктов юрлица. Название/адрес продукта и перечень собираемых данных
 * подставляются по флейвору: в Checker нет треков, в WayBack — фотографий.
 */
const PRODUCT_COPY: Record<
  AppFlavor,
  { content: string; payments: string }
> = {
  skyforest: {
    content: "User content: coordinates, notes, photos, mushroom day records",
    payments: "Processing token purchases and account management",
  },
  checker: {
    content: "User content: photos you submit for mushroom identification",
    payments: "Processing subscription payments and account management",
  },
  wayback: {
    content:
      "User content: coordinates of your entry point and the path you walk, precise or approximate depending on the location permission you grant — if you allow approximate location only, recording continues at lower accuracy. The path is recorded only between the moment you start a walk and the moment you finish it, including while the app is in the background with the screen off. While you walk it is kept on your device; a finished walk is saved to your own account so that your history is still there on your next phone. Tracks are never shared with other users or with third parties",
    payments: "Processing subscription payments and account management",
  },
};

export async function PrivacySamplify() {
  const { flavor, appName, appUrl } = await getLegalProduct();
  const copy = PRODUCT_COPY[flavor];

  return (
    <div className="prose prose-sm max-w-none space-y-6 text-foreground">
      <p className="text-muted-foreground">Revision of March 24, 2026</p>

      <h2 className="text-xl font-semibold">1. General</h2>
      <p>
        This Privacy Policy describes how {BRAND.company.legalName} (the
        Operator) collects, uses, and protects personal data of users of{" "}
        {appName} at {appUrl}.
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
        <li>{copy.content}</li>
        <li>
          Technical data: IP address, browser, device type, session information
        </li>
        <li>Cookies and similar technologies</li>
      </ul>

      <h2 className="text-xl font-semibold">3. Purposes</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Providing and improving the Service</li>
        <li>{copy.payments}</li>
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
