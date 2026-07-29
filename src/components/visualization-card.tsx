/**
 * Story Mirror — Visualization Card
 *
 * 시각화 이미지를 표시하는 클라이언트 컴포넌트.
 * 이미지가 없으면 생성 요청, 생성 중이면 로딩 표시.
 */

"use client";

import { useState, useCallback } from "react";

type Visualization = {
  id: string;
  kind: string;
  status: string;
  imageUrl: string | null;
};

const KIND_LABELS: Record<string, string> = {
  timeline: "여정 타임라인",
  network: "생각의 네트워크",
  emotion: "감정 분포",
  "story-match": "이야기 매칭",
};

export function VisualizationCard({
  kind,
  initial,
}: {
  kind: string;
  initial?: Visualization;
}) {
  const [vis, setVis] = useState<Visualization | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = now.toISOString();

    try {
      const res = await fetch("/api/story-mirror/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, periodStart, periodEnd }),
      });
      const data = await res.json();

      if (res.ok) {
        setVis({
          id: data.id,
          kind,
          status: data.status,
          imageUrl: data.imageUrl,
        });
      } else {
        setError(data.error || "이미지 생성에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  return (
    <div className="rounded-2xl border border-line bg-white/95 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-headline-sm text-primary">
          {KIND_LABELS[kind] ?? kind}
        </h3>
        {vis?.status === "complete" && vis.imageUrl && (
          <span className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-label-xs text-accent-gold-ink">
            완료
          </span>
        )}
      </div>

      {loading && (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-chalk">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
            <p className="text-label-sm text-text-muted">
              이미지를 생성하고 있습니다...
            </p>
            <p className="mt-1 text-label-xs text-text-muted">
              잠시만 기다려 주세요
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl bg-safety/5 p-4 text-center">
          <p className="text-label-sm text-safety">{error}</p>
          <button
            onClick={generate}
            className="mt-2 text-label-sm text-leaf hover:text-primary"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && vis?.status === "complete" && vis.imageUrl && (
        <img
          src={vis.imageUrl}
          alt={KIND_LABELS[kind] ?? kind}
          className="w-full rounded-xl"
        />
      )}

      {!loading && !error && (!vis || vis.status === "failed") && (
        <button
          onClick={generate}
          className="flex min-h-[200px] w-full items-center justify-center rounded-xl border-2 border-dashed border-line transition hover:border-accent-gold/30"
        >
          <span className="text-label-sm text-text-muted">
            이미지 생성하기
          </span>
        </button>
      )}
    </div>
  );
}
