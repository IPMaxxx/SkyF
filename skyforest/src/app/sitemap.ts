import type { MetadataRoute } from "next";
import {
  SITEMAP_BLOG_PATHS,
  SITEMAP_MARKETING_PATHS,
  buildSitemapEntries,
} from "@/lib/marketingSeo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...buildSitemapEntries(SITEMAP_MARKETING_PATHS),
    ...buildSitemapEntries(SITEMAP_BLOG_PATHS),
  ];
}
