"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 로그인 없이 기록 시작 — /api/identity로 익명 정체성을 확보하고
 * 멤버 뷰로 refresh한다. (부트스트랩과 같은 동작의 명시적 버튼)
 */
export function StartRecordingButton({ label = "기록 시작하기" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await fetch("/api/identity", { method: "POST" });
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
      className="cta-primary w-full py-4"
    >
      {loading ? "시작 중…" : label}
    </button>
  );
}
