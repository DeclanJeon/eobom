"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * 로그인 없는 익명 정체성 부트스트랩.
 * 서버 렌더 시 정체성이 없으면 mount 후 /api/identity로 User+기기 토큰을 만들고
 * router.refresh()로 현재 페이지를 멤버 뷰로 다시 렌더한다.
 * 정체성이 이미 있으면 아무것도 하지 않는다.
 */
export function IdentityBootstrap({ hasIdentity }: { hasIdentity: boolean }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (hasIdentity || ran.current) return;
    ran.current = true;
    fetch("/api/identity", { method: "POST" })
      .then((r) => {
        if (r.ok) router.refresh();
      })
      .catch(() => {});
  }, [hasIdentity, router]);

  return null;
}
