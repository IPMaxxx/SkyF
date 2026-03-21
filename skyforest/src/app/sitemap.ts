import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.skyforest.by";

  const paths: { path: string; lastModified: Date; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
    { path: "", lastModified: new Date("2025-10-01"), changeFrequency: "weekly", priority: 1 },
    { path: "/blog", lastModified: new Date("2025-09-20"), changeFrequency: "weekly", priority: 0.9 },
    { path: "/blog/pogoda-dlya-gribov", lastModified: new Date("2025-09-01"), changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog/griby-posle-dozhdya", lastModified: new Date("2025-09-05"), changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog/kogda-pora-v-les", lastModified: new Date("2025-09-10"), changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog/v-kakom-lesu-iskat-griby", lastModified: new Date("2025-09-15"), changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog/gde-rastut-griby", lastModified: new Date("2025-09-20"), changeFrequency: "monthly", priority: 0.8 },
    { path: "/blog/ezhovik-grebenchatyj", lastModified: new Date("2025-10-01"), changeFrequency: "monthly", priority: 0.8 },
    { path: "/instruction", lastModified: new Date("2025-06-01"), changeFrequency: "yearly", priority: 0.5 },
    { path: "/offer", lastModified: new Date("2024-10-02"), changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
    { path: "/payment_method", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
    { path: "/return_goods", lastModified: new Date("2025-01-15"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const out: MetadataRoute.Sitemap = [];
  for (const p of paths) {
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
