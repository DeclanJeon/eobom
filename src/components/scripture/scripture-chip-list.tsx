"use client";

import type { ScriptureBinding } from "@/lib/bible";

export function ScriptureChipList({
  bindings,
  onRemove,
}: {
  bindings: ScriptureBinding[];
  onRemove?: (slug: string) => void;
}) {
  if (!bindings.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {bindings.map((b) => (
        <span
          key={b.slug}
          className="inline-flex items-center gap-1 rounded-full border border-accent-gold/30 bg-bg-warm px-3 py-1.5 text-label-sm text-primary"
        >
          {b.display}
          {onRemove ? (
            <button
              type="button"
              aria-label={`${b.display} 제거`}
              onClick={() => onRemove(b.slug)}
              className="ml-1 text-text-muted hover:text-destructive"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}
