"use client";

import type { ScriptureBinding } from "@/lib/bible";

export function ScripturePreviewCard({
  binding,
  sourceNote = "한국어 성경 (Open Bibles) · 개역개정 아님",
}: {
  binding: ScriptureBinding;
  sourceNote?: string;
}) {
  return (
    <div className="paper-card writing-margin p-4">
      <p className="text-label-md text-gold-ink">{binding.display}</p>
      {binding.excerpt ? (
        <p className="mt-2 text-body-lg text-text-main">“{binding.excerpt}”</p>
      ) : null}
      <p className="mt-3 text-label-sm text-text-muted">{sourceNote}</p>
    </div>
  );
}
