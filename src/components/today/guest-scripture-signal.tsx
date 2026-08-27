"use client";

import { useState } from "react";

/**
 * Public receive reaction. It stores only the enum event and never creates a
 * person-level guest identity.
 */
export function GuestScriptureSignal({
  surface = "today",
  seatToken,
}: {
  surface?: "today" | "keyring";
  seatToken?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onHeart() {
    if (saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/moments/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          reaction: "still_hold",
          seatToken,
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
