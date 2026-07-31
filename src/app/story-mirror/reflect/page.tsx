/**
 * /story-mirror/reflect — 연결 탭 제거 후 이야기 탭으로 리다이렉트
 */

import { redirect } from "next/navigation";

export default function StoryMirrorReflectRedirectPage() {
  redirect("/story-mirror");
}
