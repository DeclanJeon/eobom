"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { clearPendingSignal, readPendingSignal } from "@/lib/pending-signal";

/**
 * 로그인 유저가 /today 멤버 화면에 진입하면, 로그인 전에 눌렀던
 * "마음에 남아요" 임시 신호를 소비해 저장한다 (무손실).
 * - TodayCard가 렌더되기 전에 소비할 필요는 없고, 진입 시 1회면 충분하다.
 */
export function PendingSignalConsumer({ dateKey }: { dateKey: string }) {
  const { data: session } = useSession();
  const consumed = useRef(false);

  useEffect(() => {
    if (!session?.user || consumed.current) return;
    const pending = readPendingSignal();
    if (!pending) return;
    consumed.current = true;
    clearPendingSignal();
    fetch("/api/today/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardKey: `scripture:${dateKey}`,
        surface: "today",
        reaction: pending.reaction,
      }),
    }).catch(() => {});
  }, [session, dateKey]);

  return null;
}
