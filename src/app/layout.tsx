import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "@mdxeditor/editor/style.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/json-ld";

const notoSans = Noto_Sans_KR({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-journal",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://eobom.ponslink.com";

const siteName = "이어봄";
const titleDefault = "이어봄 — 흩어진 묵상을 잇는 개인 기록지";
const description =
  "모이고, 다시 보이고, 함께 가벼워집니다. 성경 묵상·기도·결단을 한곳에 남기고, AI 회고로 어제의 기록을 오늘의 방향과 잇는 개인 묵상 공간. 평가하지 않는 성찰 도구.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#061b0e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: titleDefault,
    template: "%s · 이어봄",
  },
  description,
  applicationName: siteName,
  authors: [{ name: "이어봄", url: siteUrl }],
  creator: "이어봄",
  publisher: "PonsLink",
  category: "religion",
  keywords: [
    "이어봄",
    "eobom",
    "묵상",
    "묵상 기록",
    "큐티",
    "QT",
    "기도 일기",
    "성경 묵상",
    "신앙 일기",
    "AI 회고",
    "개인 묵상기록지",
    "성구 기록",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "ko-KR": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName,
    title: titleDefault,
    description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "이어봄 — 흩어진 묵상을 잇는 개인 기록지",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description,
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light" suppressHydrationWarning>
      <body
        className={`${notoSans.variable} ${notoSerif.variable} min-h-dvh bg-background font-ui text-text-main antialiased`}
      >
        <JsonLd />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
