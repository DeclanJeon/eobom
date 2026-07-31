/**
 * Story Mirror — Visualization Card
 *
 * 회고 기반 이미지 + AI 종합 해설을 표시한다.
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

type SynthesisData = {
  headline?: string;
  synthesis?: string;
  themes?: string[];
  emotions?: string[];
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

  const synthesis = useMemo(() => {
    if (!vis?.dataJson) return null;
    try {
      const d = JSON.parse(vis.dataJson) as SynthesisData;
      if (!d.synthesis?.trim() && !d.headline?.trim()) return null;
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
              회고를 읽고 이미지를 만들고 있습니다...
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
          alt={synthesis?.headline || KIND_LABELS[kind] || kind}
          width={800}
          height={600}
          unoptimized
          className="w-full rounded-xl"
        />
      )}

      {synthesis && (
        <div className="mt-3 rounded-xl border border-line bg-chalk/60 p-4">
          <p className="mb-2 text-label-sm font-medium text-primary">
            이 이미지가 말하는 당신의 기록
          </p>
          {synthesis.headline && (
            <p className="mb-2 text-headline-sm text-primary">{synthesis.headline}</p>
          )}
          {synthesis.synthesis && (
            <p className="text-label-sm leading-relaxed text-text-muted">
              {synthesis.synthesis}
            </p>
          )}
          {(synthesis.themes?.length || synthesis.emotions?.length) ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(synthesis.themes ?? []).slice(0, 4).map((t) => (
                <span
                  key={`t-${t}`}
                  className="rounded-full bg-white px-2 py-0.5 text-label-xs text-text-muted"
                >
                  {t}
                </span>
              ))}
              {(synthesis.emotions ?? []).slice(0, 3).map((e) => (
                <span
                  key={`e-${e}`}
                  className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-label-xs text-accent-gold-ink"
                >
                  {e}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {!loading && !error && (!vis || vis.status === "failed") && (
        <button
          onClick={generate}
          className="flex min-h-[200px] w-full items-center justify-center rounded-xl border-2 border-dashed border-line transition hover:border-accent-gold/30"
        >
          <span className="text-label-sm text-text-muted">
            회고로 이미지 만들기
          </span>
        </button>
      )}

      {!loading &&
        !error &&
        vis?.status === "complete" &&
        imageUrl &&
        !synthesis && (
          <button
            onClick={generate}
            className="mt-3 w-full rounded-xl border border-line py-2 text-label-sm text-leaf hover:text-primary"
          >
            회고 내용으로 다시 만들기
          </button>
        )}
    </div>
  );
}
