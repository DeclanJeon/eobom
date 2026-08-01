"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimErrorMessage } from "@/lib/seats";

/**
 * unclaimed 키링 + 로그인 사용자: 명시적 동의를 받아 claim한다.
 * (자동 claim은 선점 공격 경로이므로 절대 사용하지 않는다.)
 */
export function KeyringClaimPrompt({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seats/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          code?: string;
          error?: string;
        } | null;
        setError(
          data?.code
            ? claimErrorMessage(data.code as Parameters<typeof claimErrorMessage>[0])
            : data?.error || "연결에 실패했습니다.",
        );
        return;
      }
      router.push(`/j/${slug}`);
      router.refresh();
    } catch {
      setError("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mt-2 text-display-lg text-primary">
        이 키링을
        <br />
        내 기록으로 연결할까요?
      </h1>
      <p className="mt-3 text-body-md text-text-muted">
        이 키링은 아직 등록되지 않았습니다. 연결하면 이 주소는 내 개인 기록
        공간이 되며, 다른 사용자는 접근할 수 없습니다.
      </p>
      {error ? (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={claim}
        disabled={loading}
        className="cta-primary mt-10 w-full py-4 disabled:opacity-60"
      >
        {loading ? "연결 중…" : "이 키링을 내 기록으로 연결하기"}
      </button>
    </div>
  );
}
