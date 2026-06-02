import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

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
  "Google-InspectionTool",
  "Amazonbot",
  "FacebookExternalHit",
  "YouBot",
];

const AI_ALLOWED_PATHS = [
  "/",
  "/blog",
  "/blog/pogoda-dlya-gribov",
  "/blog/griby-posle-dozhdya",
  "/blog/kogda-pora-v-les",
  "/blog/v-kakom-lesu-iskat-griby",
  "/blog/gde-rastut-griby",
  "/blog/ezhovik-grebenchatyj",
  "/instruction",
  "/llms.txt",
  "/llms-full.txt",
  "/offer",
  "/privacy",
  "/payment_method",
  "/return_goods",
  "/feed.xml",
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
        allow: AI_ALLOWED_PATHS,
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${BRAND.url}/sitemap.xml`,
    host: BRAND.url,
  };
}
