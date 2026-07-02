/** Shared marketing navigation structure for header and footer. */

export type NavLink = {
  labelKey: string;
  href: string;
  sectionId?: string;
  external?: boolean;
};

export const HEADER_NAV: NavLink[] = [
  { labelKey: "services", href: "/services" },
  { labelKey: "tariffs", href: "/#tariffs", sectionId: "tariffs" },
  { labelKey: "promotions", href: "/promotions" },
  { labelKey: "blog", href: "/blog" },
  { labelKey: "contacts", href: "/contacts" },
  { labelKey: "faq", href: "/#faq", sectionId: "faq" },
];

export const FOOTER_SERVICE_LINKS: NavLink[] = [
  { labelKey: "about", href: "/#about" },
  { labelKey: "services", href: "/services" },
  { labelKey: "tariffs", href: "/#tariffs" },
  { labelKey: "promotions", href: "/promotions" },
  { labelKey: "blog", href: "/blog" },
  { labelKey: "instruction", href: "/instruction" },
  { labelKey: "faq", href: "/#faq" },
  { labelKey: "legacy", href: "https://app.skyforest.by", external: true },
];

export const FOOTER_LEGAL_LINKS: NavLink[] = [
  { labelKey: "offer", href: "/offer" },
  { labelKey: "privacy", href: "/privacy" },
  { labelKey: "deleteAccount", href: "/delete-account" },
  { labelKey: "paymentMethods", href: "/payment_method" },
  { labelKey: "returns", href: "/return_goods" },
];
