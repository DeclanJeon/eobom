"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ScriptureBinding } from "@/lib/bible";
import { ScriptureChipList } from "@/components/scripture/scripture-chip-list";
import { ScripturePicker } from "@/components/scripture/scripture-picker";
import { ScripturePreviewCard } from "@/components/scripture/scripture-preview-card";
import { ScriptureQuickInput } from "@/components/scripture/scripture-quick-input";

const ReflectionEditor = dynamic(
  () =>
    import("@/components/reflection-editor").then(
      (module) => module.ReflectionEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[320px] animate-pulse rounded-xl bg-surface-low" />
    ),
  },
);

export type EntryFormValues = {
  entryDate?: string;
  title?: string;
  scriptureRefsText?: string;
  scriptureExcerpt?: string;
  scriptureBindings?: ScriptureBinding[];
  reflectionBody: string;
  gratitude?: string;
  question?: string;
  prayer?: string;
  actionStep?: string;
  emotionsText?: string;
  tagsText?: string;
  templateType?: string;
};

function splitList(value?: string) {
  return (value || "")
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function EntryForm({
  initial,
  entryId,
}: {
  initial?: EntryFormValues;
  entryId?: string;
}) {
  const router = useRouter();
  const draftKey = `eobom-entry-draft:${entryId || "new"}`;
  const draftLoaded = useRef(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [values, setValues] = useState<EntryFormValues>(
    initial || {
      entryDate: new Date().toISOString().slice(0, 10),
      reflectionBody: "",
      templateType: "free",
      scriptureBindings: [],
    },
  );
  const [bindings, setBindings] = useState<ScriptureBinding[]>(
    initial?.scriptureBindings ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState({
    gratitude: false,
    question: false,
    prayer: false,
    action: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as {
          values?: EntryFormValues;
          bindings?: ScriptureBinding[];
          open?: typeof open;
          savedAt?: number;
        };
        if (draft.values) setValues(draft.values);
        if (draft.bindings) setBindings(draft.bindings);
        if (draft.open) setOpen(draft.open);
        if (draft.savedAt) {
          setDraftMessage("이전에 작성하던 초안을 복구했습니다.");
        }
      }
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      draftLoaded.current = true;
    }
  // Restore only once for this entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoaded.current) return;
    const timer = window.setTimeout(() => {
      const hasContent =
        Boolean(values.reflectionBody.trim()) ||
        Boolean(values.title?.trim()) ||
        bindings.length > 0 ||
        Boolean(values.gratitude?.trim()) ||
        Boolean(values.question?.trim()) ||
        Boolean(values.prayer?.trim()) ||
        Boolean(values.actionStep?.trim());
      if (!hasContent) {
        localStorage.removeItem(draftKey);
        setDraftMessage("");
        return;
      }
      localStorage.setItem(
        draftKey,
        JSON.stringify({ values, bindings, open, savedAt: Date.now() }),
      );
      setDraftMessage("초안이 이 기기에 자동 저장되었습니다.");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [bindings, draftKey, open, values]);

  const canSave = useMemo(() => {
    const hasBody = Boolean(values.reflectionBody.trim());
    const hasTitle = Boolean(values.title?.trim());
    const hasScripture = bindings.length > 0;
    return hasBody && (hasTitle || hasScripture);
  }, [values, bindings]);

  function addBindings(next: ScriptureBinding[]) {
    setBindings((prev) => {
      const map = new Map(prev.map((b) => [b.slug, b]));
      for (const b of next) {
        if (map.size >= 5) break;
        map.set(b.slug, b);
      }
      return [...map.values()].slice(0, 5);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const payload = {
      entryDate: values.entryDate,
      title: values.title,
      scriptureBindings: bindings,
      scriptureRefs: bindings.map((b) => b.display),
      scriptureExcerpt: bindings[0]?.excerpt || values.scriptureExcerpt,
      reflectionBody: values.reflectionBody,
      gratitude: values.gratitude,
      question: values.question,
      prayer: values.prayer,
      actionStep: values.actionStep,
      emotions: splitList(values.emotionsText),
      tags: splitList(values.tagsText),
      templateType: values.templateType || "free",
    };

    const res = await fetch(entryId ? `/api/entries/${entryId}` : "/api/entries", {
      method: entryId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "저장에 실패했습니다.");
      return;
    }
    localStorage.removeItem(draftKey);
    setDraftMessage("");
    router.push(`/entries/${data.entry.id}`);
    router.refresh();
  }

  function optionalBlock(
    key: keyof typeof open,
    label: string,
    field: "gratitude" | "question" | "prayer" | "actionStep",
    placeholder: string,
  ) {
    const isOpen = open[key];
    return (
      <div className="rounded-2xl border border-[#E0DDD7] bg-surface-low/80">
        <button
          type="button"
          onClick={() => setOpen((v) => ({ ...v, [key]: !v[key] }))}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-label-md text-text-main"
        >
          <span>{label}</span>
          <span className="text-text-muted">{isOpen ? "▴" : "▾"}</span>
        </button>
        {isOpen ? (
          <div className="px-4 pb-4">
            <textarea
              value={values[field] || ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field]: e.target.value }))
              }
              rows={3}
              placeholder={placeholder}
              className="w-full rounded-xl border border-[#E0DDD7] bg-white px-3 py-2.5 text-body-md outline-none ring-accent-gold/30 focus:ring-2"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-label-md text-text-muted"
          >
            닫기
          </button>
          <h1 className="text-headline-sm text-primary">
            {entryId ? "기록 수정" : "오늘의 묵상"}
          </h1>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="rounded-full bg-primary px-4 py-2 text-label-md text-primary-foreground disabled:opacity-40"
          >
            {saving ? "…" : "저장"}
          </button>
        </div>

        {draftMessage ? (
          <p className="text-center text-label-sm text-text-muted" role="status">
            {draftMessage}
          </p>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-label-md text-gold-ink">성구</p>
            <button
              type="button"
              disabled={bindings.length >= 5}
              onClick={() => setPickerOpen(true)}
              className="text-label-md text-primary disabled:opacity-40"
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
            className="text-label-sm text-text-muted underline-offset-2 hover:underline"
          >
            {showQuick ? "직접 입력 닫기" : "직접 입력"}
          </button>
          {showQuick ? (
            <ScriptureQuickInput
              disabled={bindings.length >= 5}
              onAdd={addBindings}
            />
          ) : null}
          <p className="text-label-sm text-text-muted">
            본문은 한국어 성경(Open Bibles)입니다. 개역개정이 아닙니다.
          </p>
        </div>

        <div>
          <input
            value={values.title || ""}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="제목 (선택)"
            className="mb-3 w-full border-0 bg-transparent py-1 text-headline-sm text-primary outline-none placeholder:text-zinc-500"
          />
          <div className="writing-margin">
            <ReflectionEditor
              markdown={values.reflectionBody}
              onChange={(reflectionBody) =>
                setValues((value) => ({ ...value, reflectionBody }))
              }
              placeholder="이곳에 당신의 묵상을 자유롭게 남겨보세요."
            />
          </div>
          <p className="mt-2 text-label-sm text-text-muted">
            이미지 드래그앤드롭과 붙여넣기를 지원합니다. 상단 전환 버튼에서 Markdown 원문을 편집할 수 있습니다.
          </p>
        </div>

        <div className="space-y-3">
          {optionalBlock("gratitude", "감사의 제목", "gratitude", "감사한 마음을 적어 주세요")}
          {optionalBlock("question", "하나님께 드리는 질문", "question", "마음에 남은 질문")}
          {optionalBlock("prayer", "오늘의 기도", "prayer", "기도문을 적어 주세요")}
          {optionalBlock("action", "삶으로의 결단", "actionStep", "작게 실천할 한 가지")}
        </div>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      <ScripturePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        disabled={bindings.length >= 5}
        onSelect={(b) => addBindings([b])}
      />
    </>
  );
}
