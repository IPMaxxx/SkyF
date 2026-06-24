import { BRAND } from "@/lib/brand";

export function PaymentMethodSamplify() {
  return (
    <div className="prose prose-sm max-w-none space-y-8 text-foreground">
      <section>
        <h2 className="text-xl font-semibold">1. Card payments via Stripe</h2>
        <p>
          Token purchases are processed by{" "}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Stripe
          </a>
          , a PCI DSS Level 1 certified payment provider. Prices are displayed
          in {BRAND.currency}.
        </p>
        <h3 className="text-lg font-semibold">Accepted cards:</h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>Visa</li>
          <li>Mastercard</li>
          <li>American Express</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Security</h2>
        <p>
          All traffic is encrypted (TLS). Card details are entered on
          Stripe&apos;s secure checkout page and are not stored on our servers.
          Strong Customer Authentication (3D Secure) may apply.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Checkout flow</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Select a token package in your account</li>
          <li>Click purchase — you will be redirected to Stripe Checkout</li>
          <li>Complete payment</li>
          <li>Tokens are credited automatically after confirmation</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Refunds</h2>
        <p>
          See our{" "}
          <a href="/return_goods" className="text-primary hover:underline">
            refund policy
          </a>
          . Approved refunds are returned to the original card where possible.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Support</h2>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p>Email: {BRAND.contacts.email}</p>
        </div>
      </section>
    </div>
  );
}
