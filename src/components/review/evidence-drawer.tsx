"use client";

import { useState } from "react";
import Link from "next/link";

type EvidenceItem = {
  entryId: string;
  date?: string;
  excerpt: string;
};

export function EvidenceDrawer({
  items,
  label,
}: {
  items: EvidenceItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between text-left text-label-sm text-leaf hover:text-primary"
        aria-expanded={open}
      >
        <span>
          {label ||
            `근거 기록 ${items.length}개 ${open ? "접기" : "펼쳐 보기"}`}
        </span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {items.map((ev, idx) => (
            <div key={`${ev.entryId}-${idx}`} className="text-label-sm text-text-muted">
              <Link
                href={`/entries/${ev.entryId}`}
                className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline"
              >
                {ev.date
                  ? `${ev.date.slice(0, 10)} 기록 열기`
                  : "기록 열기"}
              </Link>
              {ev.excerpt ? (
                <p className="mt-1 text-text-main">“{ev.excerpt}”</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
