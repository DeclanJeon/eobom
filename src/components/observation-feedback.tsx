/**
 * Review Observation Feedback
 *
 * 회고 관찰별 피드백을 수집한다.
 */

"use client";

import { useState } from "react";

const FEEDBACK_TYPES = [
  { type: "helpful", label: "도움이 됐어요" },
  { type: "inaccurate", label: "사실과 달라요" },
  { type: "context_different", label: "내 상황과 달라요" },
  { type: "exclude", label: "다음엔 빼주세요" },
] as const;

export function ObservationFeedback({
  reviewId,
  observationKey,
  initialFeedback,
}: {
  reviewId: string;
  observationKey: string;
  initialFeedback?: string[];
}) {
  const [feedback, setFeedback] = useState<string[]>(initialFeedback ?? []);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function sendFeedback(type: string) {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/reviews/${reviewId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationKey, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback ?? []);
        setStatus("saved");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-label-xs text-text-muted">이 내용에 대해 알려주세요</p>
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_TYPES.map((fb) => {
          const selected = feedback.includes(fb.type);

          return (
            <button
              key={fb.type}
              type="button"
              onClick={() => sendFeedback(fb.type)}
              disabled={loading}
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-label-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60 disabled:cursor-wait ${
                selected
                  ? "border-accent-gold bg-accent-gold/10 text-accent-gold-ink"
                  : "border-border text-text-muted hover:border-accent-gold/50 hover:bg-chalk"
              }`}
            >
              {fb.label}
            </button>
          );
        })}
      </div>
      {status === "saved" ? (
        <p className="text-label-xs text-leaf" role="status" aria-live="polite">
          의견을 반영했어요.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-label-xs text-destructive" role="alert">
          저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
    </div>
  );
}
