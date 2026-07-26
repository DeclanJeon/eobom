"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        if (!confirm("이 기록을 삭제할까요? 연결된 공개본·회고 근거에 영향을 줄 수 있습니다.")) {
          return;
        }
        setLoading(true);
        const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
        setLoading(false);
        if (res.ok) {
          router.push("/entries");
          router.refresh();
        }
      }}
      className="rounded-full border border-destructive/30 px-4 py-2 text-sm text-destructive"
    >
      {loading ? "삭제 중…" : "삭제"}
    </button>
  );
}
