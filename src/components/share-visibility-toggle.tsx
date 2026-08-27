"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * 기록의 공유 상태를 즉시 토글 (DESIGN.md "Privacy by default" — 작성자가
 * 명시적으로 opt-in). 클릭 한 번으로 /entries/[id] 와 /together 페이지가
 * 새 상태로 다시 그려진다. 실패 시 입력값을 유지하고 메시지만 보여준다.
 */
export function ShareVisibilityToggle({
  entryId,
  initialVisibility,
}: {
  entryId: string;
  initialVisibility: "private" | "public";
}) {
  const [visibility, setVisibility] = useState<"private" | "public">(initialVisibility);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const nextLabel = visibility === "private" ? "공개로 바꾸기" : "비공개로 바꾸기";
  const isPrivate = visibility === "private";

  function toggle() {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/entries/${entryId}/visibility`, { method: "POST" });
      if (!res.ok) {
        setError("공유 상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const data = (await res.json()) as { shareVisibility: "private" | "public" };
      setVisibility(data.shareVisibility);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="cta-secondary min-h-11"
        aria-busy={pending}
      >
        {pending ? "변경 중…" : nextLabel}
      </button>
      {error ? <p className="text-label-sm text-destructive" role="alert">{error}</p> : null}
      <p className="text-label-xs text-text-muted">
        {isPrivate
          ? "이 기록은 지금 나만 볼 수 있어요. 공개로 바꾸면 '함께' 피드에 익명으로 올라갑니다."
          : "이 기록은 '함께' 피드에 공개되어 있어요. 비공개로 돌리면 다른 사람에게서 사라집니다."}
      </p>
    </div>
  );
}
