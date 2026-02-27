import type { MetadataRoute } from "next";

const PRIVATE_PATHS = ["/dashboard", "/map", "/payment", "/account", "/api/", "/login", "/register"];

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "Claude-Web",
  "ClaudeBot",
  "Anthropic-AI",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Cohere-AI",
  "Meta-ExternalAgent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: PRIVATE_PATHS,
      },
      ...AI_BOTS.map((bot) => ({
        userAgent: bot,
        allow: ["/", "/llms.txt", "/llms-full.txt", "/offer", "/privacy", "/payment_method", "/return_goods"],
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: "https://skyforest.by/sitemap.xml",
  };
}
