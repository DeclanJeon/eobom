"use client";

import { useEffect, useRef } from "react";

/**
 * 키링 랜딩 계측 (B4·B2) — 서버 컴포넌트 렌더 금지, 클라이언트 mount 후 세션당 1회.
 * guest 포함 — userId 없이 seatId(키링 단위)로만 기록 (사람 단위 추적 금지).
 */
export function KeyringLandingSeen({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const storageKey = `eobom-landing:${slug}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable — still log once per mount */
    }
    fetch("/api/events/landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatId: slug }),
    }).catch(() => {});
  }, [slug]);

  return null;
}
