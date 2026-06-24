/**
 * Brand configuration for multi-domain deployments.
 *
 * skyforest.by — ИП Горбацевич М.С. (Belarus), payments via bePaid, BYN.
 * skyforest.ai — SAMPLIFY FZCO (UAE), payments via Stripe, USD.
 *   Commercial/requisite data mirrors the sister project fishday.pro.
 *
 * Selected at build time via NEXT_PUBLIC_BRAND ("skyforest" | "samplify").
 * Defaults to "skyforest" so the .by deployment is unaffected if unset.
 * The .ai deployment must set NEXT_PUBLIC_BRAND=samplify.
 */

export type BrandId = "skyforest" | "samplify";
export type PaymentProvider = "bepaid" | "stripe";

export interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  label: string;
  popular: boolean;
}

export interface Brand {
  id: BrandId;
  /** Public app name shown in UI/legal text */
  name: string;
  /** Primary domain (no protocol) */
  domain: string;
  /** Canonical origin used for metadata/sitemap/JSON-LD (with protocol, no trailing slash) */
  url: string;
  /** Currency ISO code for payments */
  currency: string;
  /** Locale code passed to the payment provider checkout */
  paymentLanguage: string;
  paymentProvider: PaymentProvider;
  /** Human payment-provider name used in legal copy */
  paymentProviderName: string;

  seo: {
    /** ISO country code for geo.region meta */
    geoRegion: string;
    /** geo.placename meta */
    geoPlacename: string;
    /** schema.org areaServed (EN / RU) */
    areaServedEn: string;
    areaServedRu: string;
  };

  /** Legal entity / requisites */
  company: {
    /** Full legal name */
    legalName: string;
    /** Short form for compact footer/copyright */
    shortName: string;
    /** Suffix rendered after the app name in the footer copyright line */
    copyrightSuffix: string;
    /** Country code (geo + metadata) */
    country: string;
    /** Free-form registration identifiers, rendered as separate lines */
    registrationLines: string[];
    /** Optional bank/settlement lines (BY: Р/с, Банк, БИК) */
    bankLines?: string[];
    address: string;
    /** Optional working hours line (BY only) */
    schedule?: string;
    activity?: string;
  };

  contacts: {
    email: string;
    phone?: string;
    telegram?: string;
    telegramLabel?: string;
  };

  /** Telegram-бот определения грибов по фото */
  mushroomBotUrl?: string;
  mushroomBotHandle?: string;

  social: { label: string; href: string }[];
}

const SKYFOREST: Brand = {
  id: "skyforest",
  name: "SkyForest",
  domain: "skyforest.by",
  url: "https://www.skyforest.by",
  currency: "BYN",
  paymentLanguage: "ru",
  paymentProvider: "bepaid",
  paymentProviderName: "bePaid",
  seo: {
    geoRegion: "BY",
    geoPlacename: "Belarus",
    areaServedEn: "Belarus",
    areaServedRu: "Беларусь",
  },
  company: {
    legalName: "ИП Горбацевич Максим Сергеевич",
    shortName: "ИП Горбацевич М.С.",
    copyrightSuffix: "ИП Горбацевич М.С. УНП 191145831",
    country: "BY",
    registrationLines: [
      "УНП: 191145831",
      "Вид деятельности: услуги в области информационных технологий",
      "Зарегистрирован Мингорисполкомом 25.01.2010",
    ],
    bankLines: [
      "Р/с: BY86OLMP30130000757520000933",
      "Банк: ОАО «Белгазпромбанк»",
      "БИК: OLMPBY2X",
    ],
    address: "220102, г. Минск, ул. Магнитная, д. 12, пом. 1",
    schedule: "Режим работы: Пн–Пт 9:00–18:00",
    activity: "услуги в области информационных технологий",
  },
  contacts: {
    email: "support@skyforest.by",
    phone: "+375 29 328 2842",
    telegram: "https://t.me/skyforest_support_bot",
    telegramLabel: "@skyforest_support_bot",
  },
  mushroomBotUrl: "https://t.me/skyforest_mushroom_bot",
  mushroomBotHandle: "@skyforest_mushroom_bot",
  social: [
    { label: "Instagram", href: "https://www.instagram.com/ip.chaser" },
    { label: "TikTok", href: "https://www.tiktok.com/@skyforest1" },
    { label: "YouTube", href: "https://www.youtube.com/@sky_forest" },
    { label: "Telegram", href: "https://t.me/iPChaser" },
  ],
};

// Requisites mirror fishday.pro (SAMPLIFY FZCO, UAE).
const SAMPLIFY: Brand = {
  id: "samplify",
  name: "SkyForest",
  domain: "skyforest.ai",
  url: "https://skyforest.ai",
  currency: "USD",
  paymentLanguage: "en",
  paymentProvider: "stripe",
  paymentProviderName: "Stripe",
  seo: {
    geoRegion: "AE",
    geoPlacename: "United Arab Emirates",
    areaServedEn: "Worldwide",
    areaServedRu: "По всему миру",
  },
  company: {
    legalName: "SAMPLIFY FZCO",
    shortName: "SAMPLIFY FZCO",
    copyrightSuffix: "SAMPLIFY FZCO",
    country: "AE",
    registrationLines: [
      "Tax Registration Number: 104045419900003",
      "D-U-N-S number: 850103731",
      "UAE License Number: 10142",
    ],
    address:
      "UAE, Dubai, Dubai Digital Park, Dubai Silicon Oasis, Building A2, office 101",
  },
  contacts: {
    email: "support@skyforest.ai",
  },
  social: [],
};

const BRANDS: Record<BrandId, Brand> = {
  skyforest: SKYFOREST,
  samplify: SAMPLIFY,
};

function resolveBrandId(): BrandId {
  const raw = (process.env.NEXT_PUBLIC_BRAND || "").toLowerCase();
  if (raw === "samplify" || raw === "ai") return "samplify";
  return "skyforest";
}

export const BRAND: Brand = BRANDS[resolveBrandId()];

export function getBrand(id?: BrandId): Brand {
  return id ? BRANDS[id] : BRAND;
}

export const isSamplify = BRAND.id === "samplify";
