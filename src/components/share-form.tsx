"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import type { ScriptureBinding } from "@/lib/bible";
import { ScriptureChipList } from "@/components/scripture/scripture-chip-list";
import { ScripturePicker } from "@/components/scripture/scripture-picker";
import { ScripturePreviewCard } from "@/components/scripture/scripture-preview-card";
import { ScriptureQuickInput } from "@/components/scripture/scripture-quick-input";
import { TogetherImageGrid } from "@/components/together-image-grid";
import { TOGETHER_MEDIA_MAX_COUNT } from "@/lib/together-media-shared";
import { cn } from "@/lib/utils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [publicBody, setPublicBody] = useState(initialBody);
  const [bindings, setBindings] = useState<ScriptureBinding[]>(initialBindings);
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const canSubmit = publicBody.trim().length >= 20 && !loading && !uploading;

  function addBindings(next: ScriptureBinding[]) {
    setBindings((prev) => {
      const merged = [...prev];
      for (const binding of next) {
        if (!merged.some((item) => item.slug === binding.slug) && merged.length < 3) {
          merged.push(binding);
        }
      }
      return merged;
    });
  }

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "");
    if (tag.length < 2) return;
    setTopicTags((prev) => (prev.includes(tag) || prev.length >= 5 ? prev : [...prev, tag]));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTopicTags((prev) => prev.filter((t) => t !== tag));
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((item) => item !== url));
  }

  async function uploadImages(files: FileList | File[]) {
    const selected = Array.from(files).slice(0, TOGETHER_MEDIA_MAX_COUNT - imageUrls.length);
    if (!selected.length) return;

    setUploading(true);
    setError("");
    try {
      for (const file of selected) {
        const form = new FormData();
        form.set("image", file);
        const res = await fetch("/api/together/media", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "이미지 업로드에 실패했습니다.");
        }
        if (typeof data.url === "string") {
          setImageUrls((prev) =>
            prev.includes(data.url) || prev.length >= TOGETHER_MEDIA_MAX_COUNT
              ? prev
              : [...prev, data.url],
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          imageUrls,
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
      setImageUrls([]);
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
        <div className="rounded-[1.75rem] border border-border/80 bg-white/95 p-4 shadow-[0_18px_50px_-36px_rgba(27,28,26,0.55)]">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-warm text-label-md font-semibold text-gold-ink">
              익
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-label-md text-primary">익명의 순례자</p>
                <span className="rounded-full bg-surface-shared px-2 py-0.5 text-label-xs text-text-muted">
                  원문 비공개
                </span>
              </div>
              <textarea
                value={publicBody}
                onChange={(e) => setPublicBody(e.target.value)}
                rows={compact ? 5 : 7}
                className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[17px] leading-7 text-text-main outline-none placeholder:text-text-muted/70"
                placeholder="마음에 남은 한 토막을 남겨 보세요. 사진도 함께 올릴 수 있어요."
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-label-sm text-text-muted">
                <span>원문은 공개되지 않습니다</span>
                <span>{publicBody.trim().length}자</span>
              </div>
            </div>
          </div>

          {imageUrls.length ? (
            <div className="relative mt-4">
              <TogetherImageGrid urls={imageUrls} />
              <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
                {imageUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => removeImage(url)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                    aria-label={`이미지 ${index + 1} 제거`}
                  >
                    <X className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void uploadImages(e.target.files);
              }}
            />
            <button
              type="button"
              disabled={uploading || imageUrls.length >= TOGETHER_MEDIA_MAX_COUNT}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-label-sm text-primary transition hover:border-accent-terracotta/40 hover:text-accent-terracotta"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploading ? "올리는 중…" : "사진"}
            </button>
            <button
              type="button"
              disabled={bindings.length >= 3}
              onClick={() => setPickerOpen(true)}
              className="inline-flex min-h-11 items-center rounded-full border border-accent-gold/35 bg-bg-warm px-3.5 text-label-sm text-primary transition hover:border-accent-gold/55"
            >
              + 성구
            </button>
            <button
              type="button"
              onClick={() => setShowQuick((v) => !v)}
              className="inline-flex min-h-11 items-center px-2 text-label-sm text-text-muted underline-offset-2 hover:underline"
            >
              {showQuick ? "직접 입력 닫기" : "성구 직접 입력"}
            </button>
            <span className="ml-auto text-label-xs text-text-muted">
              사진 {imageUrls.length}/{TOGETHER_MEDIA_MAX_COUNT}
            </span>
          </div>

          {bindings.length ? (
            <div className="mt-3 space-y-2">
              <ScriptureChipList
                bindings={bindings}
                onRemove={(slug) =>
                  setBindings((prev) => prev.filter((b) => b.slug !== slug))
                }
              />
              {bindings[0] ? <ScripturePreviewCard binding={bindings[0]} /> : null}
            </div>
          ) : null}

          {showQuick ? (
            <div className="mt-3">
              <ScriptureQuickInput
                disabled={bindings.length >= 3}
                onAdd={addBindings}
              />
            </div>
          ) : null}
        </div>

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
          className={cn("cta-primary w-full", !canSubmit && "opacity-60")}
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
