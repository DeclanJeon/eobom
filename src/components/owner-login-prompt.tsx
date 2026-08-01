"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

/**
 * claimed 키링 + 게스트 + 소유자 기기(기기 토큰 일치)일 때만 노출한다.
 * 소유자가 로그아웃된 상태에서 본인 기기로 접근한 경우, 로그인만 시키면 된다.
 */
export function OwnerLoginPrompt({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <p className="text-label-sm text-text-muted">키링 {slug}</p>
      <h1 className="mt-2 text-display-lg text-primary">
        내 기록으로
        <br />
        로그인하기
      </h1>
      <p className="mt-3 text-body-md text-text-muted">
        이 브라우저는 이 키링의 소유자 기기로 등록되어 있습니다. 로그인하면
        바로 내 기록을 볼 수 있습니다.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await signIn("google", { callbackUrl: `/j/${slug}` });
        }}
        className="cta-primary mt-10 w-full py-4 disabled:opacity-60"
      >
        {loading ? "로그인 중…" : "Google로 로그인"}
      </button>
    </div>
  );
}
