import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BRAND.url;

  const blogPaths = [
    { path: "/blog", lastModified: new Date("2026-04-15"), changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/blog/pogoda-dlya-gribov", lastModified: new Date("2026-04-15"), changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog/griby-posle-dozhdya", lastModified: new Date("2026-04-15"), changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog/kogda-pora-v-les", lastModified: new Date("2026-04-15"), changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog/v-kakom-lesu-iskat-griby", lastModified: new Date("2026-04-15"), changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog/gde-rastut-griby", lastModified: new Date("2026-04-15"), changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog/ezhovik-grebenchatyj", lastModified: new Date("2026-04-15"), changeFrequency: "monthly" as const, priority: 0.8 },
  ];

  const bilingualPaths = [
    { path: "", lastModified: new Date("2026-04-15"), changeFrequency: "weekly" as const, priority: 1 },
    { path: "/instruction", lastModified: new Date("2025-06-01"), changeFrequency: "yearly" as const, priority: 0.5 },
    { path: "/offer", lastModified: new Date("2024-10-02"), changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", lastModified: new Date("2025-01-15"), changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/payment_method", lastModified: new Date("2025-01-15"), changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/return_goods", lastModified: new Date("2025-01-15"), changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const out: MetadataRoute.Sitemap = [];

  for (const p of blogPaths) {
    out.push({
      url: `${baseUrl}${p.path}`,
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    });
  }

  for (const p of bilingualPaths) {
    out.push({
      url: `${baseUrl}${p.path}`,
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    });
    out.push({
      url: `${baseUrl}/en${p.path || ""}`,
      lastModified: p.lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    });
  }

  return out;
}
