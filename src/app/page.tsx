import type { Metadata } from "next";
import { getOptionalUser } from "@/lib/session";
import { LandingHero } from "@/components/landing-hero";

export const metadata: Metadata = {
  title: "이어봄 — 흩어진 묵상을 잇다",
  description:
    "모이고, 다시 보이고, 함께 가벼워집니다. 성구·기도·결단을 한곳에 잇는 개인 묵상 기록 공간. 평가하지 않는 회고.",
  openGraph: {
    title: "이어봄 — 흩어진 묵상을 잇다",
    description:
      "흩어진 묵상을 이어, 어제의 믿음이 오늘의 방향이 되게 합니다.",
  },
};

export default async function LandingPage() {
  const user = await getOptionalUser();

  return (
    <LandingHero
      isAuthenticated={Boolean(user)}
      displayName={user?.displayName || user?.name || null}
    />
  );
}
