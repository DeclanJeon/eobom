"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookOpen, HandHeart, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const REACTIONS: Array<{
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}> = [
  { key: "empathize", label: "공감", Icon: Heart },
  { key: "pray", label: "기도", Icon: HandHeart },
  { key: "same_scripture", label: "같은 말씀", Icon: BookOpen },
  { key: "bookmark", label: "저장", Icon: Bookmark },
];

export function TogetherActions({
  id,
  counts,
}: {
  id: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [local, setLocal] = useState(counts);
  const [reactionError, setReactionError] = useState("");

  useEffect(() => {
    setLocal(counts);
  }, [counts]);

  async function toggle(reactionType: string) {
    if (pending) return;
    setPending(reactionType);
    setReactionError("");
    try {
      const res = await fetch(`/api/together/${id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
      });
      if (!res.ok) {
        setReactionError("반응을 보내지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setReactionError("반응을 보내지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map(({ key, label, Icon }) => {
        const count = local[key] || 0;
        return (
          <button
            key={key}
            type="button"
            disabled={pending === key}
            onClick={() => void toggle(key)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-label-sm text-text-muted transition hover:border-accent-terracotta/30 hover:text-accent-terracotta active:scale-[0.98]",
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
            {count ? (
              <span className="tabular-nums opacity-80">{count}</span>
            ) : null}
          </button>
        );
      })}
      {reactionError ? (
        <p className="w-full text-label-sm text-destructive" role="alert">
          {reactionError}
        </p>
      ) : null}
    </div>
  );
}
