import type { Metadata } from "next";
import type { MetadataRoute } from "next";
import type { Locale } from "@/i18n/routing";
import { BRAND } from "@/lib/brand";

export function localePath(path: string, locale: string): string {
  if (locale === "en") {
    return path === "/" ? "/en" : `/en${path}`;
  }
  return path;
}

export function absoluteUrl(path: string, locale: string): string {
  return `${BRAND.url}${localePath(path, locale)}`;
}

export function marketingPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  locale: string;
}): Metadata {
  const canonical = absoluteUrl(opts.path, opts.locale);
  const ruUrl =
    opts.path === "/" ? BRAND.url : `${BRAND.url}${opts.path}`;
  const enUrl =
    opts.path === "/"
      ? `${BRAND.url}/en`
      : `${BRAND.url}/en${opts.path}`;

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical,
      languages: { ru: ruUrl, en: enUrl },
    },
  };
}

export type BreadcrumbItem = { name: string; path?: string };

export function breadcrumbListJsonLd(
  locale: Locale | string,
  items: BreadcrumbItem[]
) {
  const homeName = locale === "en" ? "Home" : "Главная";
  const all: BreadcrumbItem[] = [{ name: homeName, path: "/" }, ...items];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path, locale) } : {}),
    })),
  };
}

type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

/** Static marketing routes included in sitemap.xml */
export const SITEMAP_MARKETING_PATHS: Array<{
  path: string;
  lastModified: Date;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
}> = [
  { path: "", lastModified: new Date("2026-06-24"), changeFrequency: "weekly", priority: 1 },
  { path: "/services", lastModified: new Date("2026-06-24"), changeFrequency: "monthly", priority: 0.85 },
  { path: "/contacts", lastModified: new Date("2026-06-24"), changeFrequency: "monthly", priority: 0.85 },
  { path: "/promotions", lastModified: new Date("2026-06-24"), changeFrequency: "weekly", priority: 0.8 },
  { path: "/instruction", lastModified: new Date("2025-06-01"), changeFrequency: "yearly", priority: 0.6 },
  { path: "/offer", lastModified: new Date("2026-03-08"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", lastModified: new Date("2026-03-08"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/payment_method", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/return_goods", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
];

export const SITEMAP_BLOG_PATHS: Array<{
  path: string;
  lastModified: Date;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
}> = [
  { path: "/blog", lastModified: new Date("2026-06-15"), changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog/kak-opredelit-grib", lastModified: new Date("2026-06-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/pervye-majskie-boroviki", lastModified: new Date("2026-06-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/pogoda-dlya-gribov", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/griby-posle-dozhdya", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/kogda-pora-v-les", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/v-kakom-lesu-iskat-griby", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/gde-rastut-griby", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/ezhovik-grebenchatyj", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
];

export function buildSitemapEntries(
  paths: typeof SITEMAP_MARKETING_PATHS
): MetadataRoute.Sitemap {
  const baseUrl = BRAND.url;
  const out: MetadataRoute.Sitemap = [];

  for (const p of paths) {
    out.push({
      url: `${baseUrl}${p.path}`,
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    });
    out.push({
      url: `${baseUrl}/en${p.path}`,
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    });
  }

  return out;
}
