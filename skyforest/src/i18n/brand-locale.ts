/** Build-time default locale per deployment (no @/lib import — used from Edge middleware). */
export const defaultLocale =
  process.env.NEXT_PUBLIC_BRAND === "samplify" ||
  process.env.NEXT_PUBLIC_BRAND === "ai"
    ? "en"
    : "ru";
