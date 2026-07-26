"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewCreateForm({ entryCount }: { entryCount: number }) {
  const router = useRouter();
  const [reportType, setReportType] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType }),
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
      <label className="block text-sm">
        <span className="font-medium">회고 기간 유형</span>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        >
          <option value="15d">15일 회고 (최소 5개)</option>
          <option value="monthly">월간 회고 (최소 8개)</option>
          <option value="quarterly">분기 회고 (최소 15개)</option>
          <option value="yearly">연간 회고 (최소 30개)</option>
        </select>
      </label>

      <p className="text-sm leading-relaxed text-muted-foreground">
        현재 기록 {entryCount}개. MiMo API 키가 없으면 로컬 근거 기반 초안을
        만들고, 키가 있으면 MiMo V2.5로 생성합니다. 결과는 하나님의 뜻을
        판정하지 않습니다.
      </p>

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "회고 생성 중…" : "회고 초안 만들기"}
      </button>
    </form>
  );
}
