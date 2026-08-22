import { redirect } from "next/navigation";

/**
 * 루트(/)는 키링 QR의 입구다.
 * QR이 `eobom.ponslink.com`(루트)로 들어오면, 로그인 없이 "오늘의 말씀"부터 보여준다.
 * 마케팅 랜딩은 /landing 으로 이동했다.
 */
export default function RootPage() {
  redirect("/today");
}
