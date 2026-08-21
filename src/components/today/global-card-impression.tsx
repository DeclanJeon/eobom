"use client";

import { useEffect, useRef } from "react";

/** 전역 게스트 카드도 session당 1회 노출 계측 (userId 없이 집계). */
export function GlobalCardImpression({
  dateKey,
  surface = "guest",
}: {
  dateKey: string;
  surface?: "guest" | "keyring_guest";
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const cardKey = `scripture:${dateKey}`;
    const storageKey = `eobom-guest-imp:${surface}:${cardKey}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable — mount still counts once */
    }
    fetch("/api/today/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey, surface }),
    }).catch(() => {});
  }, [dateKey, surface]);
  return null;
}
