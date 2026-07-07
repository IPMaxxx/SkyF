import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapPathEntry = {
  path: string;
  lastModified: Date;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

/** Static marketing routes included in sitemap.xml */
export const SITEMAP_MARKETING_PATHS: SitemapPathEntry[] = [
  { path: "", lastModified: new Date("2026-06-24"), changeFrequency: "weekly", priority: 1 },
  { path: "/services", lastModified: new Date("2026-06-24"), changeFrequency: "monthly", priority: 0.85 },
  { path: "/contacts", lastModified: new Date("2026-06-24"), changeFrequency: "monthly", priority: 0.85 },
  { path: "/promotions", lastModified: new Date("2026-06-24"), changeFrequency: "weekly", priority: 0.8 },
  { path: "/instruction", lastModified: new Date("2026-06-24"), changeFrequency: "yearly", priority: 0.6 },
  { path: "/offer", lastModified: new Date("2026-03-08"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", lastModified: new Date("2026-03-08"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/delete-account", lastModified: new Date("2026-07-02"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/payment_method", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
  { path: "/return_goods", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
];

export const SITEMAP_BLOG_PATHS: SitemapPathEntry[] = [
  { path: "/blog", lastModified: new Date("2026-07-07"), changeFrequency: "weekly", priority: 0.9 },
  { path: "/blog/kak-ne-zabluditsya-v-lesu", lastModified: new Date("2026-07-07"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/kak-opredelit-grib", lastModified: new Date("2026-06-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/pervye-majskie-boroviki", lastModified: new Date("2026-06-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/pogoda-dlya-gribov", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/griby-posle-dozhdya", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/kogda-pora-v-les", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/v-kakom-lesu-iskat-griby", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/gde-rastut-griby", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/ezhovik-grebenchatyj", lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
];

export function buildSitemapEntries(paths: SitemapPathEntry[]): MetadataRoute.Sitemap {
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

/** Published/finished mushroom tours with public landing pages at /tours/[id]. */
export async function fetchSitemapTourPaths(): Promise<SitemapPathEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mushroom_tours")
      .select("id, updated_at, auction_start_at")
      .in("status", ["published", "finished"])
      .order("auction_start_at", { ascending: false });

    if (error) {
      console.error("Sitemap tours fetch error:", error);
      return [];
    }

    return (data ?? []).map((tour) => ({
      path: `/tours/${tour.id}`,
      lastModified: new Date(tour.updated_at ?? tour.auction_start_at),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  } catch (err) {
    console.error("Sitemap tours fetch failed:", err);
    return [];
  }
}
