import type { MetadataRoute } from "next";
import {
  SITEMAP_BLOG_PATHS,
  SITEMAP_MARKETING_PATHS,
  buildSitemapEntries,
  fetchSitemapTourPaths,
} from "@/lib/sitemapData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tourPaths = await fetchSitemapTourPaths();

  return [
    ...buildSitemapEntries(SITEMAP_MARKETING_PATHS),
    ...buildSitemapEntries(SITEMAP_BLOG_PATHS),
    ...buildSitemapEntries(tourPaths),
  ];
}
