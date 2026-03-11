import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.skyforest.by";

  return [
    {
      url: baseUrl,
      lastModified: new Date("2025-10-01"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date("2025-09-20"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/pogoda-dlya-gribov`,
      lastModified: new Date("2025-09-01"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/griby-posle-dozhdya`,
      lastModified: new Date("2025-09-05"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/kogda-pora-v-les`,
      lastModified: new Date("2025-09-10"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/v-kakom-lesu-iskat-griby`,
      lastModified: new Date("2025-09-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/gde-rastut-griby`,
      lastModified: new Date("2025-09-20"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/instruction`,
      lastModified: new Date("2025-06-01"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/offer`,
      lastModified: new Date("2024-10-02"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2025-01-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/payment_method`,
      lastModified: new Date("2025-01-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/return_goods`,
      lastModified: new Date("2025-01-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
