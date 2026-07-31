/**
 * Story Mirror — Visualization Card
 *
 * 시각화 이미지를 표시하는 클라이언트 컴포넌트.
 * 이미지가 없으면 생성 요청, 생성 중이면 로딩 표시.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";

type Visualization = {
  id: string;
  kind: string;
  status: string;
  imageUrl: string | null;
  dataJson?: string | null;
};

const KIND_LABELS: Record<string, string> = {
  summary: "이야기 요약",
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

  const imageFile = vis?.imageUrl?.match(/(?:^|\/)([a-z0-9-]+\.png)(?:$|\?)/i)?.[1];
  const imageUrl = imageFile
    ? `/api/story-mirror/visualize?file=${encodeURIComponent(imageFile)}`
    : null;

  const rationale = useMemo(() => {
    if (!vis?.dataJson) return null;
    try {
      const d = JSON.parse(vis.dataJson) as {
        summary?: string | null;
        connections?: Array<{
          workTitle?: string;
          title?: string;
          connection?: string;
          differentPerspective?: boolean;
        }>;
      };
      if (!d.summary && !(d.connections && d.connections.length)) return null;
      return d;
    } catch {
      return null;
    }
  }, [vis?.dataJson]);

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
          dataJson: data.dataJson ?? null,
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
        {vis?.status === "complete" && imageUrl && (
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

      {!loading && !error && vis?.status === "complete" && imageUrl && (
        <Image
          src={imageUrl}
          alt={KIND_LABELS[kind] ?? kind}
          width={800}
          height={600}
          unoptimized
          className="w-full rounded-xl"
        />
      )}

      {rationale && (
        <div className="mt-3 rounded-xl border border-line bg-chalk/60 p-4">
          <p className="mb-2 text-label-sm font-medium text-primary">
            이 이미지가 만들어진 이유
          </p>
          {rationale.summary && (
            <p className="mb-3 text-label-sm leading-relaxed text-text-muted">
              {rationale.summary.length > 220
                ? `${rationale.summary.slice(0, 220).trimEnd()}…`
                : rationale.summary}
            </p>
          )}
          {rationale.connections && rationale.connections.length > 0 && (
            <ul className="space-y-2">
              {rationale.connections.slice(0, 5).map((c, i) => (
                <li key={i} className="text-label-sm">
                  <span className="text-primary">
                    《{c.workTitle ?? ""}》 · {c.title ?? ""}
                  </span>
                  {c.differentPerspective && (
                    <span className="ml-1 rounded-full bg-leaf/10 px-1.5 py-0.5 text-label-xs text-leaf">
                      다른 시선
                    </span>
                  )}
                  {c.connection && (
                    <p className="mt-0.5 text-text-muted">{c.connection}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
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
