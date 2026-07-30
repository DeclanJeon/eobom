import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "lucide-react",
      "@reactuses/core",
      "date-fns",
      "zod",
    ],
  },
  // Public/static assets are content-hashed or rarely change; let Cloudflare/edge
  // cache them for a year so repeat navigations don't revalidate every load.
  // Authenticated HTML is left uncacheable (no s-maxage) on purpose.
  headers: async () => [
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/:path*(svg|png|jpg|jpeg|gif|ico|webp|woff2|woff|ttf)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
