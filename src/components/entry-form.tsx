"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { MDXEditorMethods } from "@mdxeditor/editor";
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
  shareVisibility?: "public" | "private";
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
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [autosaveLabel, setAutosaveLabel] = useState("초안 대기");
  const [values, setValues] = useState<EntryFormValues>(
    initial || {
      entryDate: new Date().toISOString().slice(0, 10),
      reflectionBody: "",
      templateType: "free",
      scriptureBindings: [],
      shareVisibility: "private",
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

  const hasDraftContent = useMemo(() => {
    return (
      Boolean(values.reflectionBody.trim()) ||
      Boolean(values.title?.trim()) ||
      bindings.length > 0 ||
      Boolean(values.gratitude?.trim()) ||
      Boolean(values.question?.trim()) ||
      Boolean(values.prayer?.trim()) ||
      Boolean(values.actionStep?.trim())
    );
  }, [bindings.length, values]);

  function resetDraft() {
    // 새 기록: 빈 폼. 수정 모드: 서버 initial로 되돌림.
    const nextValues: EntryFormValues = entryId
      ? {
          entryDate: initial?.entryDate || new Date().toISOString().slice(0, 10),
          reflectionBody: initial?.reflectionBody || "",
          title: initial?.title || "",
          templateType: initial?.templateType || "free",
          scriptureBindings: initial?.scriptureBindings || [],
          shareVisibility: initial?.shareVisibility || "private",
          gratitude: initial?.gratitude || "",
          question: initial?.question || "",
          prayer: initial?.prayer || "",
          actionStep: initial?.actionStep || "",
          emotionsText: initial?.emotionsText || "",
          tagsText: initial?.tagsText || "",
        }
      : {
          entryDate: new Date().toISOString().slice(0, 10),
          reflectionBody: "",
          title: "",
          templateType: "free",
          scriptureBindings: [],
          shareVisibility: "private",
          gratitude: "",
          question: "",
          prayer: "",
          actionStep: "",
          emotionsText: "",
          tagsText: "",
        };
    const nextBindings = entryId ? (initial?.scriptureBindings ?? []) : [];
    setValues(nextValues);
    setBindings(nextBindings);
    setOpen({
      gratitude: Boolean(nextValues.gratitude?.trim()),
      question: Boolean(nextValues.question?.trim()),
      prayer: Boolean(nextValues.prayer?.trim()),
      action: Boolean(nextValues.actionStep?.trim()),
    });
    setError("");
    localStorage.removeItem(draftKey);
    setDraftMessage(
      entryId
        ? "수정 전 내용으로 되돌렸습니다."
        : "초안을 비웠습니다. 처음부터 작성할 수 있어요.",
    );
    setAutosaveLabel(entryId ? "원본으로 복원" : "초안 대기");
    try {
      editorRef.current?.setMarkdown(nextValues.reflectionBody || "");
      editorRef.current?.focus?.(undefined, { defaultSelection: "rootStart" });
    } catch {
      // ignore editor focus failures
    }
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
      shareVisibility: values.shareVisibility === "private" ? "private" : "public",
    };

    try {
      const res = await fetch(entryId ? `/api/entries/${entryId}` : "/api/entries", {
        method: entryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      localStorage.removeItem(draftKey);
      setDraftMessage("");
      router.push(`/entries/${data.entry.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function optionalBlock(
    key: keyof typeof open,
    label: string,
    field: "gratitude" | "question" | "prayer" | "actionStep",
    placeholder: string,
  ) {
    const isOpen = open[key];
    return (
      <div className="rounded-2xl border border-border bg-surface-low/80">
        <button
          type="button"
          aria-expanded={isOpen}
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
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-body-md outline-none ring-accent-gold/30 focus:ring-2"
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
        className="space-y-6 pb-36 md:pb-28"
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

        {draftMessage || hasDraftContent ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            {draftMessage ? (
              <p className="text-label-sm text-text-muted" role="status">
                {draftMessage}
              </p>
            ) : null}
            {hasDraftContent ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      entryId
                        ? "수정 중인 내용을 원래 기록으로 되돌릴까요?"
                        : "작성 중인 초안을 모두 지우고 처음부터 쓸까요?",
                    )
                  ) {
                    return;
                  }
                  resetDraft();
                }}
                className="min-h-11 text-label-sm text-leaf underline-offset-2 hover:underline"
              >
                {entryId ? "원본으로 되돌리기" : "초안 비우고 처음부터"}
              </button>
            ) : null}
          </div>
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
            className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-left transition hover:border-accent-gold/40"
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
              ref={editorRef}
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

        <section className="space-y-3 rounded-2xl border border-border bg-surface-low/70 p-4">
          <div>
            <p className="text-label-md text-primary">함께 공개</p>
            <p className="mt-1 text-label-sm text-text-muted">
              기본은 비공개입니다. 공개를 선택하면 정리된 나눔 문장만 익명으로 함께 피드에 올라갑니다. 원문은 공개되지 않습니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setValues((prev) => ({ ...prev, shareVisibility: "private" }))
              }
              className={`min-h-11 rounded-xl border px-4 py-3 text-left transition ${
                (values.shareVisibility ?? "private") === "private"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-primary hover:border-accent-gold/40"
              }`}
              aria-pressed={(values.shareVisibility ?? "private") === "private"}
            >
              <span className="block text-label-md">비공개</span>
              <span
                className={`mt-1 block text-label-sm ${
                  (values.shareVisibility ?? "private") === "private"
                    ? "text-primary-foreground/80"
                    : "text-text-muted"
                }`}
              >
                나만 보는 기록
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                setValues((prev) => ({ ...prev, shareVisibility: "public" }))
              }
              className={`min-h-11 rounded-xl border px-4 py-3 text-left transition ${
                values.shareVisibility === "public"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-primary hover:border-accent-gold/40"
              }`}
              aria-pressed={values.shareVisibility === "public"}
            >
              <span className="block text-label-md">공개</span>
              <span
                className={`mt-1 block text-label-sm ${
                  values.shareVisibility === "public"
                    ? "text-primary-foreground/80"
                    : "text-text-muted"
                }`}
              >
                익명으로 함께에 나눔
              </span>
            </button>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <div className="fixed inset-x-0 bottom-[var(--nav-height)] z-40 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-md md:bottom-0 md:pb-safe">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label-sm text-text-muted" role="status">
              {autosaveLabel}
            </p>
            {hasDraftContent ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      entryId
                        ? "수정 중인 내용을 원래 기록으로 되돌릴까요?"
                        : "작성 중인 초안을 모두 지우고 처음부터 쓸까요?",
                    )
                  ) {
                    return;
                  }
                  resetDraft();
                }}
                className="mt-0.5 min-h-11 text-left text-label-sm text-leaf underline-offset-2 hover:underline"
              >
                {entryId ? "원본으로 되돌리기" : "초안 비우고 처음부터"}
              </button>
            ) : !canSave && !saving ? (
              <p className="mt-0.5 text-label-sm text-text-muted">
                본문을 작성하면 저장할 수 있어요
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => {
              const form = document.getElementById("entry-form");
              if (form instanceof HTMLFormElement) form.requestSubmit();
            }}
            className="cta-primary shrink-0"
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
