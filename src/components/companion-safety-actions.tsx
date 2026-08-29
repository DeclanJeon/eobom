"use client";

import { useState } from "react";

export function CompanionSafetyActions({ connectionId, targetUserId }: { connectionId: string; targetUserId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(type: "end" | "block" | "report") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/companions/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetUserId, connectionId, reason: type === "report" ? "사용자 신고" : undefined }),
      });
      if (!response.ok) throw new Error();
      setMessage(type === "block" ? "차단했어요." : type === "report" ? "신고를 접수했어요." : "연결을 종료했어요.");
    } catch {
      setMessage("처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-label-sm text-text-muted">연결 관리</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void act("end")} className="min-h-11 px-3 text-label-sm text-text-muted">연결 종료</button>
        <button type="button" disabled={busy} onClick={() => void act("block")} className="min-h-11 px-3 text-label-sm text-text-muted">차단</button>
        <button type="button" disabled={busy} onClick={() => void act("report")} className="min-h-11 px-3 text-label-sm text-destructive">신고</button>
      </div>
      {message ? <p className="mt-2 text-label-sm text-text-muted" role="status">{message}</p> : null}
    </div>
  );
}
