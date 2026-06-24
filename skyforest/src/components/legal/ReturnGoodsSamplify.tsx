import { BRAND } from "@/lib/brand";

export function ReturnGoodsSamplify() {
  return (
    <div className="prose prose-sm max-w-none space-y-6 text-foreground">
      <h2 className="text-xl font-semibold">General</h2>
      <p>
        SkyForest sells access to informational services via{" "}
        <strong>tokens</strong> — internal units used for weather analysis,
        maps, and comparisons. Tokens are not goods, e-money, or securities.
      </p>

      <h2 className="text-xl font-semibold">Refund conditions</h2>
      <p>
        A refund is available only if <strong>all</strong> of the following
        apply:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>No tokens from the purchased package were used</li>
        <li>Request is made within 14 calendar days of purchase</li>
      </ul>

      <h2 className="text-xl font-semibold">Non-refundable</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Partially used token packages</li>
        <li>Purchases older than 14 days</li>
        <li>Free or referral bonus tokens</li>
      </ul>

      <h2 className="text-xl font-semibold">How to request</h2>
      <p>Email {BRAND.contacts.email} with:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Account email</li>
        <li>Purchase date and amount</li>
        <li>Reason for refund</li>
      </ul>

      <h2 className="text-xl font-semibold">Processing time</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Review: up to 7 business days</li>
        <li>Refund to original payment method: 1–10 business days after approval</li>
      </ul>

      <h2 className="text-xl font-semibold">Legal basis</h2>
      <p>
        See also our{" "}
        <a href="/offer" className="text-primary hover:underline">
          Terms of Service
        </a>{" "}
        at {BRAND.url}/offer.
      </p>
    </div>
  );
}
