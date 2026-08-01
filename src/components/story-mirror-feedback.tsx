/**
 * Story Mirror — Feedback Component
 *
 * 매칭 결과(matchId)에 대한 피드백을 수집한다.
 */

"use client";

import { useState } from "react";

const FEEDBACK_TYPES = [
  { type: "helpful", label: "도움 됨", icon: "👍" },
  { type: "inaccurate", label: "부정확함", icon: "❌" },
  { type: "unrelated", label: "관련 없음", icon: "🔗" },
  { type: "sensitive", label: "민감함", icon: "⚠️" },
] as const;

export function StoryMirrorFeedback({ matchId }: { matchId: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendFeedback(type: string) {
    setLoading(true);
    setError(false);
    try {
      const fbRes = await fetch(
        `/api/story-mirror/matches/${matchId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        },
      );

      if (fbRes.ok) {
        setSent(type);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl bg-chalk p-4 text-center">
        <p className="text-label-sm text-primary">감사합니다.</p>
        <p className="mt-1 text-label-xs text-text-muted">
          피드백이 반영되었습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-3 text-label-sm text-text-muted">
        이 이야기가 유용했나요?
      </p>
      {error && (
        <p className="mb-2 text-label-xs text-destructive">
          피드백 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_TYPES.map((fb) => (
          <button
            key={fb.type}
            onClick={() => sendFeedback(fb.type)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-label-sm transition hover:border-accent-gold/30 hover:bg-chalk disabled:opacity-50"
          >
            <span>{fb.icon}</span>
            <span>{fb.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
