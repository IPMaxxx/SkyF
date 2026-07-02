import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getBrand, type BrandId } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import {
  buildAuthEmail,
  type AuthEmailKind,
  type AuthEmailLocale,
} from "@/lib/auth-email-templates";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth "Send Email" hook.
 *
 * Supabase calls this endpoint (Standard Webhooks signed) for every auth email
 * across the SHARED project instead of using the built-in template + global SMTP.
 * We render a brand-aware email (English copy for every brand) and send it
 * through the app's own SMTP so that:
 *   - skyforest.ai registrations → English copy + support@skyforest.ai
 *   - skyforest.by registrations → English copy + support@skyforest.by
 *
 * Enable via Supabase Dashboard → Authentication → Hooks → "Send Email".
 * The generated secret (v1,whsec_...) must be stored in SEND_EMAIL_HOOK_SECRET.
 */

interface EmailData {
  token?: string;
  token_hash?: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
}

interface HookPayload {
  user?: {
    email?: string;
    new_email?: string;
    user_metadata?: Record<string, unknown> | null;
  };
  email_data?: EmailData;
}

const ACTION_TO_KIND: Record<string, AuthEmailKind> = {
  signup: "signup",
  recovery: "recovery",
  magiclink: "magiclink",
  invite: "invite",
  email_change: "email_change",
  email_change_new: "email_change",
  reauthentication: "reauthentication",
};

const ACTION_TO_OTP_TYPE: Record<string, EmailOtpType> = {
  signup: "signup",
  recovery: "recovery",
  magiclink: "magiclink",
  invite: "invite",
  email_change: "email_change",
  email_change_new: "email_change",
};

/** Verify a Standard Webhooks signature (the scheme Supabase auth hooks use). */
function verifySignature(rawBody: string, headers: Headers): boolean {
  const secretEnv = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secretEnv) return false;

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  // Reject stale deliveries (replay protection), 5 min tolerance.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const base64Secret = secretEnv.replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
  let key: Buffer;
  try {
    key = Buffer.from(base64Secret, "base64");
  } catch {
    return false;
  }

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", key)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Header is a space-delimited list of "<version>,<base64sig>" pairs.
  for (const part of signatureHeader.split(" ")) {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const sigBuf = Buffer.from(sig);
    if (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return true;
    }
  }
  return false;
}

function detectBrandId(
  metadataBrand: unknown,
  redirectTo?: string,
  siteUrl?: string,
): BrandId {
  if (metadataBrand === "samplify" || metadataBrand === "skyforest") {
    return metadataBrand;
  }
  const source = redirectTo || siteUrl || "";
  try {
    const host = new URL(source).host.toLowerCase();
    if (host.includes("skyforest.ai")) return "samplify";
  } catch {
    if (source.toLowerCase().includes("skyforest.ai")) return "samplify";
  }
  // Default to the .by brand so existing skyforest.by behaviour is preserved.
  return "skyforest";
}

function buildActionUrl(data: EmailData): string | undefined {
  const otpType = data.email_action_type
    ? ACTION_TO_OTP_TYPE[data.email_action_type]
    : undefined;
  const tokenHash =
    data.email_action_type === "email_change_new"
      ? data.token_hash_new || data.token_hash
      : data.token_hash;
  if (!tokenHash || !otpType) return undefined;

  const base =
    data.redirect_to ||
    (data.site_url ? `${data.site_url.replace(/\/$/, "")}/auth/confirm` : "");
  if (!base) return undefined;

  try {
    const url = new URL(base);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", otpType);
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody) as HookPayload;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const emailData = payload.email_data;
  const action = emailData?.email_action_type || "";
  const kind = ACTION_TO_KIND[action];

  if (!kind) {
    return NextResponse.json(
      { error: `unsupported email_action_type: ${action}` },
      { status: 422 },
    );
  }

  // For "email_change" the new address is confirmed; deliver to new_email when present.
  const recipient =
    action === "email_change_new"
      ? payload.user?.new_email || payload.user?.email
      : payload.user?.email;

  if (!recipient) {
    return NextResponse.json({ error: "no recipient" }, { status: 422 });
  }

  const brandId = detectBrandId(
    payload.user?.user_metadata?.brand,
    emailData?.redirect_to,
    emailData?.site_url,
  );
  const brand = getBrand(brandId);
  // All transactional auth emails are delivered in English for every brand.
  const locale: AuthEmailLocale = "en";

  const { subject, html } = buildAuthEmail(kind, {
    locale,
    brand,
    actionUrl: buildActionUrl(emailData || {}),
    token: emailData?.token,
  });

  try {
    await sendEmail(recipient, subject, html, {
      from: brand.contacts.email,
      fromName: brand.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Surface a 500 so Supabase records the failure (and does not swallow it).
    return NextResponse.json({ error: `send failed: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({}, { status: 200 });
}
