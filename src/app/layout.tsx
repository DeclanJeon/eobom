import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "이어봄",
    template: "%s · 이어봄",
  },
  description:
    "흩어진 묵상을 이어, 어제의 믿음이 오늘의 방향이 되게 하는 개인 묵상 기록지",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${sourceSerif.variable} min-h-dvh bg-background font-ui text-text-main antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
