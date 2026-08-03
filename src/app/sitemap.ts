import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://eobom.ponslink.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/suggest`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Public keyring entry points (no private content in sitemap beyond URL)
  let seatRoutes: MetadataRoute.Sitemap = [];
  try {
    const seats = await db.journalSeat.findMany({
      where: { status: { in: ["unclaimed", "claimed"] } },
      select: { slug: true, updatedAt: true },
      orderBy: { slug: "asc" },
    });
    seatRoutes = seats.map((s) => ({
      url: `${siteUrl}/j/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch {
    // DB unavailable at build time — static only
    seatRoutes = Array.from({ length: 13 }, (_, i) => ({
      url: `${siteUrl}/j/e${String(i + 1).padStart(2, "0")}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  }

  return [...staticRoutes, ...seatRoutes];
}
