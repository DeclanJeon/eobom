"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** 설계 05§10 · narrative-trend.ts min-data 게이트와 동일 */
export const REVIEW_MIN_CURRENT_WINDOW = 4;
export const REVIEW_MIN_PRIOR_WINDOW = 3;

export function hasSufficientReviewData(currentWindowCount: number, priorWindowCount: number): boolean {
  return currentWindowCount >= REVIEW_MIN_CURRENT_WINDOW && priorWindowCount >= REVIEW_MIN_PRIOR_WINDOW;
}

export type ReviewCreateFormProps = {
  entryCount: number;
  currentWindowCount?: number;
  priorWindowCount?: number;
  /** 명시적으로 충분 여부를 덮어쓸 때 — 미지정 시 counts로 계산, counts마저 없으면 충분으로 간주(기존 플로우 유지) */
  hasEnoughData?: boolean;
};

export function ReviewCreateForm({
  entryCount,
  currentWindowCount,
  priorWindowCount,
  hasEnoughData,
}: ReviewCreateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const computedEnough =
    hasEnoughData !== undefined
      ? hasEnoughData
      : currentWindowCount !== undefined && priorWindowCount !== undefined
        ? hasSufficientReviewData(currentWindowCount, priorWindowCount)
        : true;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회고 생성에 실패했습니다.");
        return;
      }
      router.push(`/lookback/${data.report.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "회고 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!computedEnough) {
    const curr = currentWindowCount ?? 0;
    const prior = priorWindowCount ?? 0;
    const currPct = Math.min(100, Math.round((curr / REVIEW_MIN_CURRENT_WINDOW) * 100));
    const priorPct = Math.min(100, Math.round((prior / REVIEW_MIN_PRIOR_WINDOW) * 100));
    return (
      <div className="space-y-4">
        <div className="paper-card p-5">
          <p className="text-label-sm font-bold tracking-widest text-accent-gold">회고 준비 중</p>
          <p className="mt-3 text-body-lg leading-relaxed text-primary">
            최소 3개의 기록이 모이면 기간의 흐름을 비춰줄 수 있어요.
          </p>
          <p className="mt-2 text-body-md leading-relaxed text-text-muted">
            최근 28일간 의미 있는 순간이 {REVIEW_MIN_CURRENT_WINDOW}개 이상, 이전 기간에{" "}
            {REVIEW_MIN_PRIOR_WINDOW}개 이상 모이면 회고를 만들 수 있어요. 지금은 흐름을 비교할
            재료가 조금 더 필요한 상태예요.
          </p>
          <div className="mt-5 space-y-3">
            <div>
              <div className="flex justify-between text-label-sm text-text-muted">
                <span>최근 28일</span>
                <span aria-label={`최근 28일 ${curr} / ${REVIEW_MIN_CURRENT_WINDOW}`}>
                  현재 {curr}/{REVIEW_MIN_CURRENT_WINDOW}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-leaf transition-all"
                  style={{ width: `${currPct}%` }}
                  role="progressbar"
                  aria-valuenow={curr}
                  aria-valuemin={0}
                  aria-valuemax={REVIEW_MIN_CURRENT_WINDOW}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label-sm text-text-muted">
                <span>이전 28일</span>
                <span aria-label={`이전 28일 ${prior} / ${REVIEW_MIN_PRIOR_WINDOW}`}>
                  현재 {prior}/{REVIEW_MIN_PRIOR_WINDOW}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-leaf/70 transition-all"
                  style={{ width: `${priorPct}%` }}
                  role="progressbar"
                  aria-valuenow={prior}
                  aria-valuemin={0}
                  aria-valuemax={REVIEW_MIN_PRIOR_WINDOW}
                />
              </div>
            </div>
          </div>
          <p className="mt-3 text-label-sm text-text-muted">보관 중인 기록 {entryCount}개</p>
        </div>

        <Link href="/entries/new" className="cta-primary block w-full py-4 text-center">
          기록하러 가기
        </Link>
        <p className="text-center text-label-sm text-text-muted">
          한 줄이라도 남기면 회고에 한 걸음 가까워져요.
        </p>
        <Link
          href="/today"
          className="block text-center text-label-sm text-leaf hover:text-primary"
        >
          오늘으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-body-md text-text-muted">
        지금까지의 기록 {entryCount}개를 바탕으로 회고를 생성합니다.
      </p>

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="cta-primary w-full py-4">
        {loading ? "만드는 중…" : "회고 생성하기"}
      </button>
    </form>
  );
}
