import { redirect } from "next/navigation";

/**
 * 로그인 없음 — /login 진입은 /today로 우회한다 (구 링크·OAuth 콜백 안전망).
 */
export default function LoginPage() {
  redirect("/today");
}
