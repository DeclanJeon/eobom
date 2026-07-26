"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const LABELS: Record<string, string> = {
  empathize: "공감",
  pray: "기도",
  same_scripture: "같은 말씀",
  bookmark: "저장",
};

export function TogetherActions({
  id,
  counts,
}: {
  id: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(reactionType: string) {
    setPending(reactionType);
    await fetch(`/api/together/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reactionType }),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(LABELS).map(([key, label]) => (
        <button
          key={key}
          type="button"
          disabled={pending === key}
          onClick={() => toggle(key)}
          className="rounded-full border border-[#E0DDD7] bg-white px-3 py-1.5 text-label-sm text-text-muted transition hover:border-accent-terracotta/40 hover:text-accent-terracotta"
        >
          {label}
          {counts[key] ? ` ${counts[key]}` : ""}
        </button>
      ))}
    </div>
  );
}
