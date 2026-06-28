import type { Metadata } from "next";
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
