"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { savePendingSignal } from "@/lib/pending-signal";

/**
 * 게스트 말씀 카드의 "♡ 마음에 남아요" 신호 (게스트 전용).
 * GlobalScriptureCard는 비로그인(게스트) 맥락에서만 렌더되므로 useSession 불필요.
 * - 누르면 임시 신호 저장 → Google 로그인 유도 → 로그인 후 /today 멤버 진입 시 소비.
 * "말씀 보는 것은 연결 없이도 돼요" 안내와 함께.
 */
export function GuestScriptureSignal({
  scriptureRef,
}: {
  scriptureRef: string;
}) {
  const [saving, setSaving] = useState(false);

  async function onHeart() {
    if (saving) return;
    setSaving(true);
    try {
      savePendingSignal({ ref: scriptureRef, reaction: "still_hold", at: Date.now() });
      await signIn("google", { callbackUrl: "/today" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={onHeart}
        disabled={saving}
        className="min-h-11 rounded-full border border-border bg-white/70 px-4 py-2 text-label-sm text-text-muted transition hover:border-leaf/40 hover:text-primary"
      >
        ♡ 마음에 남아요
      </button>
      <p className="text-label-xs text-text-muted">
        기록·마음에 남아요는 연결 후 저장됩니다. 말씀 보는 것은 연결 없이도 돼요.
      </p>
    </div>
  );
}
