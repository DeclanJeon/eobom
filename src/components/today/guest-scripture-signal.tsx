"use client";

import { useState } from "react";

/**
 * 전역 말씀 카드의 "♡ 마음에 남아요" 신호.
 * 로그인이 없으므로 익명 identity로 즉시 저장한다 (부트스트랩 후 이미 정체성 존재).
 */
export function GuestScriptureSignal({ dateKey }: { dateKey: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onHeart() {
    if (saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/today/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardKey: `scripture:${dateKey}`,
          surface: "guest",
          reaction: "still_hold",
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={onHeart}
        disabled={saving || saved}
        className="min-h-11 rounded-full border border-border bg-white/70 px-4 py-2 text-label-sm text-text-muted transition hover:border-leaf/40 hover:text-primary"
      >
        {saved ? "마음에 남겼어요" : "♡ 마음에 남아요"}
      </button>
    </div>
  );
}
