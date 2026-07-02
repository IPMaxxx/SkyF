import type { Brand } from "@/lib/brand";

/**
 * Brand-aware templates for Supabase Auth transactional emails
 * (confirm signup, password recovery, magic link, email change, reauthentication).
 *
 * These are rendered by the Supabase "Send Email" auth hook
 * (see src/app/api/auth/send-email/route.ts) so that a single shared Supabase
 * project can deliver per-brand branding and support address:
 *   - skyforest.by  → skyforest.by branding, support@skyforest.by
 *   - skyforest.ai  → skyforest.ai branding, support@skyforest.ai
 *
 * All copy is delivered in English regardless of brand/locale. The locale
 * parameter is retained for future localization, but every branch renders
 * English so no Russian is ever emitted.
 *
 * The active brand is resolved per-request from the hook payload,
 * NOT from the build-time NEXT_PUBLIC_BRAND, because one deployment hosts the
 * hook for both domains.
 */

export type AuthEmailKind =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change"
  | "reauthentication";

export type AuthEmailLocale = "en" | "ru";

interface RenderInput {
  locale: AuthEmailLocale;
  brand: Brand;
  /** Fully-formed confirmation/action link (already contains token_hash + type + next). */
  actionUrl?: string;
  /** 6-digit OTP code, used for reauthentication (and shown as a fallback elsewhere). */
  token?: string;
}

interface Copy {
  subject: string;
  preview: string;
  heading: string;
  intro: string;
  button: string;
  fallback: string;
  ignore: string;
  otpLead?: string;
}

const YEAR = new Date().getFullYear();

function copyFor(kind: AuthEmailKind, locale: AuthEmailLocale, brand: Brand): Copy {
  const app = brand.name;
  if (locale === "en") {
    switch (kind) {
      case "signup":
        return {
          subject: `Confirm your ${app} account`,
          preview: `Confirm your email to activate your ${app} account.`,
          heading: "Confirm your email",
          intro: `Welcome to ${app}! Tap the button below to confirm your email address and activate your account.`,
          button: "Confirm email",
          fallback: "If the button doesn't work, copy and paste this link into your browser:",
          ignore: "If you didn't create this account, you can safely ignore this email.",
        };
      case "recovery":
        return {
          subject: `Reset your ${app} password`,
          preview: `Reset the password for your ${app} account.`,
          heading: "Reset your password",
          intro: "We received a request to reset your password. Tap the button below to choose a new one.",
          button: "Reset password",
          fallback: "If the button doesn't work, copy and paste this link into your browser:",
          ignore: "If you didn't request a password reset, you can safely ignore this email.",
        };
      case "magiclink":
        return {
          subject: `Your ${app} sign-in link`,
          preview: `Sign in to ${app} with this magic link.`,
          heading: "Sign in to your account",
          intro: "Tap the button below to sign in. This link will expire shortly for your security.",
          button: "Sign in",
          fallback: "If the button doesn't work, copy and paste this link into your browser:",
          ignore: "If you didn't request this link, you can safely ignore this email.",
        };
      case "invite":
        return {
          subject: `You've been invited to ${app}`,
          preview: `Accept your invitation to ${app}.`,
          heading: "You've been invited",
          intro: `You've been invited to join ${app}. Tap the button below to accept the invitation and set up your account.`,
          button: "Accept invitation",
          fallback: "If the button doesn't work, copy and paste this link into your browser:",
          ignore: "If you weren't expecting this invitation, you can safely ignore this email.",
        };
      case "email_change":
        return {
          subject: `Confirm your new ${app} email`,
          preview: `Confirm the email change on your ${app} account.`,
          heading: "Confirm your new email",
          intro: "Tap the button below to confirm the new email address for your account.",
          button: "Confirm new email",
          fallback: "If the button doesn't work, copy and paste this link into your browser:",
          ignore: "If you didn't request this change, please contact support immediately.",
        };
      case "reauthentication":
        return {
          subject: `Your ${app} verification code`,
          preview: `Your ${app} verification code.`,
          heading: "Verification code",
          intro: "Use the code below to confirm this action:",
          button: "",
          fallback: "",
          ignore: "If you didn't request this code, you can safely ignore this email.",
          otpLead: "Your verification code is:",
        };
    }
  }

  // Fallback locale: English content is emitted for every brand/locale so all
  // transactional email is delivered in English.
  switch (kind) {
    case "signup":
      return {
        subject: `Confirm your ${app} account`,
        preview: `Confirm your email to activate your ${app} account.`,
        heading: "Confirm your email",
        intro: `Welcome to ${app}! Tap the button below to confirm your email address and activate your account.`,
        button: "Confirm email",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        ignore: "If you didn't create this account, you can safely ignore this email.",
      };
    case "recovery":
      return {
        subject: `Reset your ${app} password`,
        preview: `Reset the password for your ${app} account.`,
        heading: "Reset your password",
        intro: "We received a request to reset your password. Tap the button below to choose a new one.",
        button: "Reset password",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        ignore: "If you didn't request a password reset, you can safely ignore this email.",
      };
    case "magiclink":
      return {
        subject: `Your ${app} sign-in link`,
        preview: `Sign in to ${app} with this magic link.`,
        heading: "Sign in to your account",
        intro: "Tap the button below to sign in. This link will expire shortly for your security.",
        button: "Sign in",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        ignore: "If you didn't request this link, you can safely ignore this email.",
      };
    case "invite":
      return {
        subject: `You've been invited to ${app}`,
        preview: `Accept your invitation to ${app}.`,
        heading: "You've been invited",
        intro: `You've been invited to join ${app}. Tap the button below to accept the invitation and set up your account.`,
        button: "Accept invitation",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        ignore: "If you weren't expecting this invitation, you can safely ignore this email.",
      };
    case "email_change":
      return {
        subject: `Confirm your new ${app} email`,
        preview: `Confirm the email change on your ${app} account.`,
        heading: "Confirm your new email",
        intro: "Tap the button below to confirm the new email address for your account.",
        button: "Confirm new email",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        ignore: "If you didn't request this change, please contact support immediately.",
      };
    case "reauthentication":
      return {
        subject: `Your ${app} verification code`,
        preview: `Your ${app} verification code.`,
        heading: "Verification code",
        intro: "Use the code below to confirm this action:",
        button: "",
        fallback: "",
        ignore: "If you didn't request this code, you can safely ignore this email.",
        otpLead: "Your verification code is:",
      };
  }
}

function shell(brand: Brand, c: Copy, body: string): string {
  const domain = brand.domain;
  const support = brand.contacts.email;
  const supportLine = `Questions? Email us at <a href="mailto:${support}" style="color:#62a863;">${support}</a>.`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0b;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none!important;opacity:0;color:#0a0f0b;height:0;width:0;overflow:hidden;">${c.preview}</span>
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;padding:20px 0;">
      <div style="font-size:40px;line-height:1;">🌲</div>
      <h1 style="margin:8px 0 0;font-size:22px;color:#e8f0ea;">${brand.name}</h1>
    </div>

    <div style="background:#0f1a12;border:1px solid #1a2e1d;border-radius:16px;padding:28px 24px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;font-size:19px;color:#e8f0ea;">${c.heading}</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">${c.intro}</p>
      ${body}
      <p style="margin:20px 0 0;font-size:12px;color:#64748b;line-height:1.5;">${c.ignore}</p>
    </div>

    <p style="text-align:center;font-size:12px;color:#64748b;margin:0 0 6px;">${supportLine}</p>
    <p style="text-align:center;font-size:11px;color:#475569;margin:0;">© ${YEAR} ${brand.name} · ${domain}</p>
  </div>
</body>
</html>`;
}

function buttonBlock(url: string, label: string, c: Copy): string {
  return `
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#62a863;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:600;">${label}</a>
      </div>
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">${c.fallback}</p>
      <p style="margin:6px 0 0;font-size:12px;word-break:break-all;"><a href="${url}" style="color:#62a863;">${url}</a></p>`;
}

function otpBlock(token: string, c: Copy): string {
  return `
      <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">${c.otpLead ?? ""}</p>
      <div style="text-align:center;margin:8px 0 4px;">
        <span style="display:inline-block;background:#0a0f0b;border:1px solid #1a2e1d;border-radius:12px;padding:16px 28px;font-size:30px;font-weight:800;letter-spacing:8px;color:#e8f0ea;">${token}</span>
      </div>`;
}

export function buildAuthEmail(
  kind: AuthEmailKind,
  input: RenderInput,
): { subject: string; html: string } {
  const c = copyFor(kind, input.locale, input.brand);
  let body: string;
  if (kind === "reauthentication") {
    body = otpBlock(input.token ?? "------", c);
  } else if (input.actionUrl) {
    body = buttonBlock(input.actionUrl, c.button, c);
  } else if (input.token) {
    // No link available but we have an OTP — surface it as a fallback.
    body = otpBlock(input.token, c);
  } else {
    body = "";
  }
  return { subject: c.subject, html: shell(input.brand, c, body) };
}
