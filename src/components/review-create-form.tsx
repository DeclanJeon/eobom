"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewCreateForm({ entryCount }: { entryCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "회고 생성에 실패했습니다.");
      return;
    }
    router.push(`/reviews/${data.report.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-body-md text-text-muted">
        지금까지의 기록 {entryCount}개를 바탕으로 회고를 생성합니다.
      </p>

      {error ? (
        <p className="rounded-xl bg-safety/10 px-3 py-2 text-label-md text-safety">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="cta-primary w-full py-4">
        {loading ? "만드는 중…" : "회고 생성하기"}
      </button>
    </form>
  );
}
