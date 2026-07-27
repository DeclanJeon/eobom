import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://eobom.ponslink.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/contact", "/j/"],
        disallow: [
          "/api/",
          "/admin/",
          "/today",
          "/entries",
          "/reviews",
          "/together",
          "/me",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/contact", "/llms.txt"],
        disallow: ["/api/", "/admin/", "/today", "/entries", "/me"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/contact", "/llms.txt"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/contact", "/llms.txt"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/contact", "/llms.txt"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
