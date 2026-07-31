/**
 * Story Mirror — Visualization Card
 * 회고 기반 이미지 + AI 종합 해설 + freshness(stale) UI
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VisualizationFreshness } from "@/lib/story-mirror/visualization-fingerprint";

type Visualization = {
  id: string;
  kind: string;
  status: string;
  imageUrl: string | null;
  dataJson?: string | null;
  freshness?: VisualizationFreshness;
};

type SynthesisData = {
  headline?: string;
  synthesis?: string;
  themes?: string[];
  emotions?: string[];
  entryCount?: number;
  reviewId?: string | null;
  source?: string;
};

const KIND_LABELS: Record<string, string> = {
  summary: "이야기 요약",
};

const AI_LIMIT =
  "이 이미지와 해설은 기록을 정리한 성찰 자료입니다. 하나님의 뜻이나 신앙 상태를 판정하지 않습니다.";

export function VisualizationCard({
  kind,
  initial,
  initialFreshness = "none",
}: {
  kind: string;
  initial?: Visualization;
  initialFreshness?: VisualizationFreshness;
}) {
  const [vis, setVis] = useState<Visualization | null>(initial ?? null);
  const [freshness, setFreshness] = useState<VisualizationFreshness>(
    initial?.freshness ?? initialFreshness,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const imageFile =
    vis?.imageUrl?.match(/(?:file=|\/|^)([a-z0-9-]+\.png)/i)?.[1] ?? null;
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

  const generate = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/story-mirror/visualize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, force }),
        });
        const data = await res.json();
        if (res.ok) {
          setVis({
            id: data.id,
            kind,
            status: data.status,
            imageUrl: data.imageUrl,
            dataJson: data.dataJson ?? null,
            freshness: data.freshness ?? "fresh",
          });
          setFreshness(
            (data.freshness as VisualizationFreshness | undefined) ?? "fresh",
          );
          setOpenDetail(true);
        } else {
          setError(data.error || "이미지 생성에 실패했습니다.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  const isStale = freshness === "stale" && Boolean(imageUrl);
  const isFresh = freshness === "fresh" && Boolean(imageUrl);

  return (
    <div className="rounded-2xl border border-border/80 bg-surface-shared/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-headline-sm text-primary">
          {KIND_LABELS[kind] ?? kind}
        </h3>
        {isFresh ? (
          <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-label-xs text-accent-gold-ink">
            최신
          </span>
        ) : null}
        {isStale ? (
          <span className="rounded-full bg-accent-terracotta/15 px-2 py-0.5 text-label-xs text-accent-terracotta">
            기록이 달라졌어요
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-surface-low">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
            <p className="text-label-sm text-text-muted">
              회고를 읽고 이미지를 만들고 있습니다...
            </p>
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl bg-destructive/5 p-4 text-center">
          <p className="text-label-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => generate(true)}
            className="mt-2 min-h-11 text-label-sm text-leaf hover:text-primary"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {!loading && !error && imageUrl ? (
        <div className={isStale ? "opacity-80" : undefined}>
          <Image
            src={imageUrl}
            alt={synthesis?.headline || KIND_LABELS[kind] || kind}
            width={800}
            height={600}
            unoptimized
            className="w-full rounded-xl"
          />
        </div>
      ) : null}

      {isStale && !loading ? (
        <div className="mt-3 rounded-xl border border-accent-terracotta/30 bg-white/90 p-4">
          <p className="text-body-sm text-text-muted">
            기록이 더 쌓이거나 회고가 달라졌어요. 이전 장면은 남겨 두었으니, 지금
            흐름으로 다시 그릴 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => generate(true)}
            className="cta-primary mt-3 min-h-11"
          >
            이 흐름으로 다시 그리기
          </button>
        </div>
      ) : null}

      {synthesis && !loading ? (
        <div className="mt-3 rounded-xl border border-border/70 bg-white/90 p-4">
          <p className="text-label-sm font-medium text-primary">
            {synthesis.headline || "이 이미지가 말하는 당신의 기록"}
          </p>
          {typeof synthesis.entryCount === "number" ? (
            <p className="mt-1 text-label-xs text-text-muted">
              기록 {synthesis.entryCount}개
              {synthesis.reviewId ? " · 회고 1개" : ""}에서 도출
              {isFresh ? " · 같은 기록 기준으로 만든 장면" : ""}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setOpenDetail((v) => !v)}
            className="mt-2 min-h-11 text-left text-label-sm text-leaf hover:text-primary"
            aria-expanded={openDetail}
          >
            {openDetail ? "해설 접기" : "이 장면이 말해 주는 것 보기"}
          </button>

          {openDetail && synthesis.synthesis ? (
            <p className="mt-2 text-label-sm leading-relaxed text-text-muted">
              {synthesis.synthesis}
            </p>
          ) : null}

          {openDetail &&
          (synthesis.themes?.length || synthesis.emotions?.length) ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(synthesis.themes ?? []).slice(0, 3).map((t) => (
                <span
                  key={`t-${t}`}
                  className="rounded-full bg-surface-low px-2 py-0.5 text-label-xs text-text-muted"
                >
                  {t}
                </span>
              ))}
              {(synthesis.emotions ?? []).slice(0, 2).map((e) => (
                <span
                  key={`e-${e}`}
                  className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-label-xs text-accent-gold-ink"
                >
                  {e}
                </span>
              ))}
            </div>
          ) : null}

          {isFresh ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/entries/new"
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-3 text-label-sm text-primary transition hover:border-accent-gold/40"
              >
                기도문으로 남기기
              </Link>
              <Link
                href="/entries/new"
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-3 text-label-sm text-primary transition hover:border-accent-gold/40"
              >
                결단 이어 쓰기
              </Link>
              <button
                type="button"
                onClick={() => generate(true)}
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-label-sm text-leaf hover:text-primary"
              >
                다시 만들기
              </button>
            </div>
          ) : null}

          <p className="mt-4 text-label-xs leading-relaxed text-text-muted">
            {AI_LIMIT}
          </p>
        </div>
      ) : null}

      {!loading && !error && !imageUrl ? (
        <button
          type="button"
          onClick={() => generate(false)}
          className="flex min-h-[200px] w-full items-center justify-center rounded-xl border-2 border-dashed border-border transition hover:border-accent-gold/30"
        >
          <span className="text-label-sm text-text-muted">
            회고와 기록으로 이미지 만들기
          </span>
        </button>
      ) : null}
    </div>
  );
}
