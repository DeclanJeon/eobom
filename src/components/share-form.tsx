"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import type { ScriptureBinding } from "@/lib/bible";
import { ScriptureChipList } from "@/components/scripture/scripture-chip-list";
import { ScripturePicker } from "@/components/scripture/scripture-picker";
import { ScripturePreviewCard } from "@/components/scripture/scripture-preview-card";
import { ScriptureQuickInput } from "@/components/scripture/scripture-quick-input";

export function ShareForm({
  sourceEntryId,
  initialBody = "",
  initialBindings = [],
  onSuccess,
  compact = false,
}: {
  sourceEntryId?: string;
  initialBody?: string;
  initialBindings?: ScriptureBinding[];
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [publicBody, setPublicBody] = useState(initialBody);
  const [bindings, setBindings] = useState<ScriptureBinding[]>(initialBindings);
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState("");

  useEffect(() => {
    setPublicBody(initialBody);
  }, [initialBody]);

  useEffect(() => {
    setBindings(initialBindings);
  }, [initialBindings]);

  const scriptureRefs = useMemo(
    () => bindings.map((b) => b.display),
    [bindings],
  );

  const canSubmit = publicBody.trim().length >= 20 && !loading;

  function addBindings(next: ScriptureBinding[]) {
    setBindings((prev) => {
      const map = new Map(prev.map((b) => [b.slug, b]));
      for (const b of next) {
        if (map.size >= 3) break;
        map.set(b.slug, b);
      }
      return [...map.values()].slice(0, 3);
    });
  }

  function addTag(raw: string) {
    const tag = raw.replace(/^#+/, "").trim().slice(0, 12);
    if (tag.length < 2) return;
    setTopicTags((prev) => {
      if (prev.includes(tag) || prev.length >= 5) return prev;
      return [...prev, tag];
    });
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTopicTags((prev) => prev.filter((t) => t !== tag));
  }

  async function suggestTags() {
    if (publicBody.trim().length < 12 || suggesting) return;
    setSuggesting(true);
    setSuggestNote("");
    setError("");
    try {
      const res = await fetch("/api/together/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicBody,
          scriptureRefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "태그 제안에 실패했습니다.");
        return;
      }
      const next = Array.isArray(data.tags) ? (data.tags as string[]) : [];
      setTopicTags((prev) => {
        const merged = [...prev];
        for (const tag of next) {
          if (!merged.includes(tag) && merged.length < 5) merged.push(tag);
        }
        return merged;
      });
      setSuggestNote(
        data.modelProvider === "mimo"
          ? "AI가 본문에 맞는 주제를 제안했습니다. 필요하면 빼거나 더하세요."
          : "본문에서 주제를 골라 제안했습니다. 필요하면 수정하세요.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "태그 제안에 실패했습니다.");
    } finally {
      setSuggesting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/together", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntryId,
          publicBody,
          scriptureRefs,
          topicTags,
          pseudonym: "익명의 순례자",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "게시에 실패했습니다.");
        return;
      }
      setPublicBody("");
      setBindings([]);
      setTopicTags([]);
      setSuggestNote("");
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-label-md text-gold-ink">성구</p>
              <p className="mt-0.5 text-label-sm text-text-muted">
                선택하면 피드에 함께 표시됩니다
              </p>
            </div>
            <button
              type="button"
              disabled={bindings.length >= 3}
              onClick={() => setPickerOpen(true)}
              className="min-h-11 rounded-full border border-accent-gold/35 bg-bg-warm px-3.5 py-2 text-label-md text-primary transition hover:border-accent-gold/55"
            >
              + 성구 선택
            </button>
          </div>
          <ScriptureChipList
            bindings={bindings}
            onRemove={(slug) =>
              setBindings((prev) => prev.filter((b) => b.slug !== slug))
            }
          />
          {bindings[0] ? <ScripturePreviewCard binding={bindings[0]} /> : null}
          <button
            type="button"
            onClick={() => setShowQuick((v) => !v)}
            className="inline-flex min-h-11 items-center px-2 text-label-sm text-text-muted underline-offset-2 hover:underline"
          >
            {showQuick ? "직접 입력 닫기" : "성구 직접 입력"}
          </button>
          {showQuick ? (
            <ScriptureQuickInput
              disabled={bindings.length >= 3}
              onAdd={addBindings}
            />
          ) : null}
        </div>

        <label className="block">
          <span className="text-label-md text-primary">나누고 싶은 문장</span>
          <textarea
            value={publicBody}
            onChange={(e) => setPublicBody(e.target.value)}
            rows={compact ? 6 : 8}
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-body-md leading-relaxed outline-none ring-accent-gold/30 placeholder:text-zinc-400 focus:ring-2"
            placeholder="원문 전체가 아니라, 마음에 남은 한 토막만 남겨 주세요. (20자 이상)"
          />
          <span className="mt-1.5 flex justify-between text-label-sm text-text-muted">
            <span>원문은 공개되지 않습니다</span>
            <span>{publicBody.trim().length}자</span>
          </span>
        </label>

        <div className="space-y-3 rounded-2xl border border-border bg-surface-low/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-label-md text-primary">주제 태그</p>
              <p className="mt-0.5 text-label-sm text-text-muted">
                AI 제안 후 직접 다듬을 수 있어요
              </p>
            </div>
            <button
              type="button"
              onClick={() => void suggestTags()}
              disabled={suggesting || publicBody.trim().length < 12}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-label-sm text-text-main transition hover:border-accent-terracotta/40 hover:text-accent-terracotta"
            >
              {suggesting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {suggesting ? "분석 중…" : "AI 제안"}
            </button>
          </div>

          {topicTags.length ? (
            <div className="flex flex-wrap gap-2">
              {topicTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="chip-gold inline-flex min-h-[44px] min-w-[44px] items-center gap-1"
                  aria-label={`${tag} 제거`}
                >
                  #{tag}
                  <X className="size-3 opacity-70" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-label-sm text-text-muted">
              아직 태그가 없습니다. AI 제안 또는 직접 추가해 보세요.
            </p>
          )}

          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="태그 직접 추가"
              disabled={topicTags.length >= 5}
              className="min-h-[44px] flex-1 rounded-xl border border-border bg-white px-3 py-2 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            <button
              type="button"
              disabled={topicTags.length >= 5 || tagInput.trim().length < 2}
              onClick={() => addTag(tagInput)}
              className="min-h-[44px] rounded-xl border border-border bg-white px-4 text-label-md text-primary"
            >
              추가
            </button>
          </div>
          {suggestNote ? (
            <p className="text-label-sm text-text-muted" role="status">
              {suggestNote}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="cta-primary w-full"
        >
          {loading ? "게시 중…" : "익명으로 나누기"}
        </button>
      </form>

      <ScripturePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        disabled={bindings.length >= 3}
        onSelect={(b) => addBindings([b])}
      />
    </>
  );
}
