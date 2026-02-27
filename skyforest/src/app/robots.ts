import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: [
          "/dashboard",
          "/map",
          "/payment",
          "/account",
          "/api/",
          "/login",
          "/register",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/map", "/payment", "/account", "/api/"],
      },
    ],
    sitemap: "https://skyforest.by/sitemap.xml",
  };
}
