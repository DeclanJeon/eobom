"use client";

import { useState } from "react";
import type { ScriptureBinding } from "@/lib/bible";

export function ScriptureQuickInput({
  onAdd,
  disabled,
}: {
  onAdd: (bindings: ScriptureBinding[]) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const input = text.trim();
    if (!input || loading || disabled) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bible/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "해석에 실패했습니다.");
        return;
      }
      if (!data.ok?.length) {
        setError(data.failed?.join(", ") || "성구를 찾지 못했습니다.");
        return;
      }
      onAdd(data.ok);
      setText("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="직접 입력 (예: 시 23:1)"
          className="min-h-[44px] flex-1 rounded-xl border border-[#E0DDD7] bg-white px-3 py-2 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          type="button"
          disabled={loading || disabled || !text.trim()}
          onClick={() => void submit()}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-label-md text-primary-foreground disabled:opacity-40"
        >
          {loading ? "…" : "추가"}
        </button>
      </div>
      {error ? <p className="text-label-sm text-destructive">{error}</p> : null}
    </div>
  );
}
