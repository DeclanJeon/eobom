"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ScriptureBinding } from "@/lib/bible";
import { shouldApplyScriptureSeed } from "@/lib/entry-seed";
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

function titleFromBody(body: string): string {
  const plain = body
    .replace(/[#>*_`~\-\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "오늘의 묵상";
  return plain.slice(0, 40) + (plain.length > 40 ? "…" : "");
}

export function EntryForm({
  initial,
  entryId,
  seedScripture,
}: {
  initial?: EntryFormValues;
  entryId?: string;
  seedScripture?: string;
}) {
  const router = useRouter();
  const draftKey = `eobom-entry-draft:${entryId || "new"}`;
  const seedApplied = useRef(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [autosaveLabel, setAutosaveLabel] = useState("초안 대기");
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
    gratitude: Boolean(initial?.gratitude?.trim()),
    question: Boolean(initial?.question?.trim()),
    prayer: Boolean(initial?.prayer?.trim()),
    action: Boolean(initial?.actionStep?.trim()),
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
          setAutosaveLabel("초안 복구됨");
        }
      }
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      setIsDraftLoaded(true);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!isDraftLoaded) return;
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
        setAutosaveLabel("초안 대기");
        return;
      }
      localStorage.setItem(
        draftKey,
        JSON.stringify({ values, bindings, open, savedAt: Date.now() }),
      );
      setAutosaveLabel("임시 저장됨");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [bindings, draftKey, isDraftLoaded, open, values]);

  useEffect(() => {
    if (!isDraftLoaded || seedApplied.current) return;
    if (
      !shouldApplyScriptureSeed({
        seedScripture,
        values,
        bindingsCount: bindings.length,
      })
    ) {
      seedApplied.current = true;
      return;
    }
    seedApplied.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/bible/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: seedScripture }),
        });
        const data = await res.json();
        if (res.ok && data.ok?.length) addBindings(data.ok);
      } catch {
        // ignore seed parse failures
      }
    })();
  }, [bindings.length, isDraftLoaded, seedScripture, values]);

  const canSave = useMemo(
    () => Boolean(values.reflectionBody.trim()),
    [values.reflectionBody],
  );

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
    const resolvedTitle =
      values.title?.trim() || titleFromBody(values.reflectionBody);
    const payload = {
      entryDate: values.entryDate,
      title: resolvedTitle,
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
          className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 text-left text-label-md text-text-main"
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
      <form
        id="entry-form"
        onSubmit={onSubmit}
        className="space-y-8 pb-36 md:pb-28"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="min-h-11 text-label-md text-text-muted"
          >
            닫기
          </button>
          <h1 className="text-headline-sm text-primary">
            {entryId ? "기록 수정" : "오늘의 묵상"}
          </h1>
          <span className="w-12" aria-hidden />
        </div>

        {draftMessage ? (
          <p className="text-center text-label-sm text-text-muted" role="status">
            {draftMessage}
          </p>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-label-sm font-medium text-primary">
              1 · 오늘 묵상한 말씀
            </p>
            <p className="text-label-xs text-text-muted">선택</p>
          </div>
          <button
            type="button"
            disabled={bindings.length >= 5}
            onClick={() => setPickerOpen(true)}
            className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[#E0DDD7] bg-white px-4 py-3 text-left transition hover:border-accent-gold/40 disabled:opacity-40"
          >
            <span className="text-label-md text-text-muted">
              {bindings.length
                ? `성구 ${bindings.length}개 선택됨 · 추가하기`
                : "성경 구절을 선택하세요"}
            </span>
            <span className="text-text-muted">›</span>
          </button>
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
            className="min-h-11 text-label-sm text-text-muted underline-offset-2 hover:underline"
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
        </section>

        <section className="space-y-3">
          <p className="text-label-sm font-medium text-primary">
            2 · 마음에 남은 것
          </p>
          <div className="writing-margin">
            <ReflectionEditor
              markdown={values.reflectionBody}
              onChange={(reflectionBody) =>
                setValues((value) => ({ ...value, reflectionBody }))
              }
              placeholder="이곳에 당신의 묵상을 자유롭게 남겨보세요."
            />
          </div>
          <p className="text-label-sm text-text-muted">
            제목은 저장 시 첫 문장으로 자동 붙습니다. 이미지 드래그앤드롭과
            붙여넣기를 지원합니다.
          </p>
          <div className="space-y-3">
            {optionalBlock(
              "gratitude",
              "감사의 제목",
              "gratitude",
              "감사한 마음을 적어 주세요",
            )}
            {optionalBlock(
              "question",
              "하나님께 드리는 질문",
              "question",
              "마음에 남은 질문",
            )}
            {optionalBlock(
              "prayer",
              "오늘의 기도",
              "prayer",
              "기도문을 적어 주세요",
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-label-sm font-medium text-primary">
            3 · 오늘 살아낼 한 가지
          </p>
          {optionalBlock(
            "action",
            "삶으로의 결단",
            "actionStep",
            "작게 실천할 한 가지",
          )}
        </section>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-md md:bottom-0 md:pb-safe">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-label-sm text-text-muted" role="status">
            {autosaveLabel}
          </p>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => {
              const form = document.getElementById("entry-form");
              if (form instanceof HTMLFormElement) form.requestSubmit();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-label-md text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "저장 중…" : entryId ? "수정 완료" : "묵상 마치기"}
          </button>
        </div>
      </div>

      <ScripturePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        disabled={bindings.length >= 5}
        onSelect={(b) => addBindings([b])}
      />
    </>
  );
}
