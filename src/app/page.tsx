import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getOptionalUser } from "@/lib/session";
import { LandingHero } from "@/components/landing-hero";

export const metadata: Metadata = {
  title: "이어봄 — 흩어진 묵상을 잇다",
  description:
    "이어봄은 성구와 기도, 결단을 조용히 남기고 다시 연결하는 개인 공간입니다. 평가하지 않는 기록, 필요할 때의 회고.",
  openGraph: {
    title: "이어봄 — 흩어진 묵상을 잇다",
    description:
      "어제의 믿음이 오늘의 방향이 되도록. 성구·기도·결단을 한곳에 잇는 이어봄.",
  },
};

export default async function LandingPage() {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  return <LandingHero />;
}
