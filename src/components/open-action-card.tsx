"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateShort } from "@/lib/utils";
import {
  ACTION_STATUS_LABEL,
  type ActionStatus,
} from "@/lib/action-status";

export type OpenActionItem = {
  id: string;
  body: string;
  status: ActionStatus;
  statusLabel: string;
  reflectionOnResult: string | null;
  sourceEntryId: string | null;
  createdAt: string | Date;
  sourceEntry: {
    id: string;
    title: string | null;
    entryDate: string | Date;
  } | null;
};

const CHOICES: Array<{ status: ActionStatus; hint: string }> = [
  { status: "walking", hint: "부담 없이 계속 마음에 두기" },
  { status: "stepped", hint: "작은 실천이 있었다면" },
  { status: "released", hint: "지금은 내려두어도 괜찮습니다" },
];

export function OpenActionCard({ item }: { item: OpenActionItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(item.reflectionOnResult || "");
  const [pending, setPending] = useState<ActionStatus | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function choose(status: ActionStatus) {
    if (pending) return;
    setPending(status);
    setError("");
    try {
      const res = await fetch(`/api/actions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reflectionOnResult: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (done) {
    return (
      <div className="paper-card border border-border bg-surface-low/80 p-5">
        <p className="text-eyebrow">결단</p>
        <p className="mt-2 text-body-md text-text-muted">
          한 줄을 남겨 두었습니다. 평가가 아니라 기억입니다.
        </p>
      </div>
    );
  }

  const when = item.sourceEntry?.entryDate || item.createdAt;

  return (
    <div className="paper-card writing-margin border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-eyebrow">열린 결단</p>
        <span className="chip-gold">{item.statusLabel}</span>
      </div>

      <p className="mt-3 font-journal text-lg leading-relaxed text-primary">
        {item.body}
      </p>

      <p className="mt-2 text-label-sm text-text-muted">
        {formatDateShort(when)}
        {item.sourceEntry?.title ? ` · ${item.sourceEntry.title}` : ""}
      </p>

      <p className="mt-3 text-label-sm text-text-muted">
        부담 없이, 한 줄만 이어도 충분합니다.
      </p>

      {!open ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cta-secondary min-h-[44px] px-4 py-2"
          >
            한 줄 남기기
          </button>
          {item.sourceEntryId ? (
            <Link
              href={`/entries/${item.sourceEntryId}`}
              className="inline-flex min-h-[44px] items-center px-3 text-label-md text-leaf hover:underline"
            >
              기록 보기
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="선택 사항 · 마음에 남은 한 줄"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-body-md outline-none ring-accent-gold/30 focus:ring-2"
          />
          <div className="flex flex-col gap-2">
            {CHOICES.map(({ status, hint }) => (
              <button
                key={status}
                type="button"
                disabled={Boolean(pending)}
                onClick={() => void choose(status)}
                className="flex min-h-[48px] flex-col items-start rounded-xl border border-border bg-white px-4 py-2.5 text-left transition hover:border-accent-gold/40 disabled:opacity-50"
              >
                <span className="text-label-md text-primary">
                  {pending === status ? "…" : ACTION_STATUS_LABEL[status]}
                </span>
                <span className="text-label-sm text-text-muted">{hint}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-label-sm text-text-muted underline-offset-2 hover:underline"
          >
            접기
          </button>
          {error ? (
            <p className="text-label-sm text-destructive">{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
