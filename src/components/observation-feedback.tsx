/**
 * Review Observation Feedback
 *
 * 회고 관찰별 피드백을 수집한다.
 */

"use client";

import { useState } from "react";

const FEEDBACK_TYPES = [
  { type: "helpful", label: "도움 됨", icon: "👍" },
  { type: "inaccurate", label: "부정확함", icon: "❌" },
  { type: "context_different", label: "맥락이 다름", icon: "🔄" },
  { type: "exclude", label: "민감하므로 제외", icon: "⚠️" },
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

  async function sendFeedback(type: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationKey, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback ?? []);
      }
    } catch {
      // 실패 시 무시
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FEEDBACK_TYPES.map((fb) => (
        <button
          key={fb.type}
          onClick={() => sendFeedback(fb.type)}
          disabled={loading}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-label-xs transition disabled:opacity-50 ${
            feedback.includes(fb.type)
              ? "border-accent-gold bg-accent-gold/10 text-accent-gold-ink"
              : "border-line text-text-muted hover:border-accent-gold/30"
          }`}
        >
          <span>{fb.icon}</span>
          <span>{fb.label}</span>
        </button>
      ))}
    </div>
  );
}
