import { BRAND } from "@/lib/brand";

export function DeleteAccountSamplify() {
  return (
    <div className="prose prose-sm max-w-none space-y-6 text-foreground">
      <p className="text-muted-foreground">Revision of July 2, 2026</p>

      <p>
        This page explains how to delete your {BRAND.name} account and the
        personal data associated with it, operated by {BRAND.company.legalName}{" "}
        ({BRAND.company.address}). You can start a deletion request without
        signing in.
      </p>

      <h2 className="text-xl font-semibold">How to delete your account</h2>

      <h3 className="text-lg font-semibold">Option 1 — In the app (self-serve)</h3>
      <p>
        If you can sign in, you can delete your account yourself:
      </p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Open {BRAND.name} and go to your Account page.</li>
        <li>
          Scroll to the danger zone and tap <strong>Delete account</strong>.
        </li>
        <li>
          Confirm by entering your account email address. Deletion is scheduled
          with a 14-day cancellation window, after which the account and its
          data are permanently removed automatically.
        </li>
        <li>
          You can cancel the scheduled deletion any time within those 14 days by
          signing in again.
        </li>
      </ol>

      <h3 className="text-lg font-semibold">Option 2 — By request</h3>
      <p>
        If you cannot access the app, email us from the email address associated
        with your account:
      </p>
      <div className="rounded-xl bg-muted p-4 text-sm">
        <p>
          Send to: <strong>{BRAND.contacts.email}</strong>
        </p>
        <p>
          Subject: <strong>Delete my account</strong>
        </p>
      </div>
      <p>
        We verify that the request comes from the account owner and process it
        within 30 days.
      </p>

      <h2 className="text-xl font-semibold">What gets deleted</h2>
      <p>When your account is deleted, we permanently remove:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Your profile (name and email address)</li>
        <li>Saved locations and your notes</li>
        <li>&ldquo;Best days&rdquo; records</li>
        <li>Photos you uploaded</li>
        <li>Marketplace listings and messages</li>
        <li>Push notification tokens for your devices</li>
        <li>
          Search history, comparisons, referral codes, and any subscriptions
        </li>
        <li>Token balance and unused tokens (these are not refundable)</li>
      </ul>

      <h2 className="text-xl font-semibold">What may be retained, and for how long</h2>
      <p>
        Some records must be kept for a limited time for legal, financial, and
        anti-fraud reasons:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          Purchase and transaction records required by accounting and tax law
          are retained for the period required by applicable law, then deleted.
        </li>
        <li>
          A minimal record (a hashed reference and the email) may be kept to
          prevent abuse and fraud.
        </li>
        <li>
          Residual copies in encrypted backups are purged within approximately
          30 days.
        </li>
      </ul>

      <h2 className="text-xl font-semibold">Timeline</h2>
      <p>
        Self-serve deletions are finalized automatically after the 14-day
        cancellation window. Requests sent by email are processed within 30
        days. Backups are purged within approximately 30 days thereafter.
      </p>

      <p>
        For full details on how we handle personal data, see our{" "}
        <a href={`${BRAND.url}/privacy`} className="underline">
          Privacy Policy
        </a>
        . Questions? Contact {BRAND.contacts.email}.
      </p>
    </div>
  );
}
