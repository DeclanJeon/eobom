"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type EntryFormValues = {
  entryDate?: string;
  title?: string;
  scriptureRefsText?: string;
  scriptureExcerpt?: string;
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
  const [values, setValues] = useState<EntryFormValues>(
    initial || {
      entryDate: new Date().toISOString().slice(0, 10),
      reflectionBody: "",
      templateType: "free",
    },
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const canSave = useMemo(() => {
    const hasBody = Boolean(values.reflectionBody.trim());
    const hasTitle = Boolean(values.title?.trim());
    const hasScripture = splitList(values.scriptureRefsText).length > 0;
    return hasBody && (hasTitle || hasScripture);
  }, [values]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const payload = {
      entryDate: values.entryDate,
      title: values.title,
      scriptureRefs: splitList(values.scriptureRefsText),
      scriptureExcerpt: values.scriptureExcerpt,
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
    router.push(`/entries/${data.entry.id}`);
    router.refresh();
  }

  function field(
    key: keyof EntryFormValues,
    label: string,
    opts?: { textarea?: boolean; placeholder?: string; required?: boolean },
  ) {
    const common = {
      id: key,
      value: values[key] || "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setValues((v) => ({ ...v, [key]: e.target.value })),
      placeholder: opts?.placeholder,
      className:
        "mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm outline-none ring-primary/30 transition focus:ring-2",
    };
    return (
      <label className="block text-sm">
        <span className="font-medium text-foreground">
          {label}
          {opts?.required ? <span className="text-primary"> *</span> : null}
        </span>
        {opts?.textarea ? (
          <textarea {...common} rows={key === "reflectionBody" ? 8 : 3} />
        ) : (
          <input {...common} type={key === "entryDate" ? "date" : "text"} />
        )}
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("entryDate", "날짜")}
        {field("templateType", "템플릿", {
          placeholder: "free / soap / sermon",
        })}
      </div>
      {field("title", "제목", { placeholder: "오늘의 한 줄" })}
      {field("scriptureRefsText", "성구", {
        placeholder: "빌립보서 1:6, 시편 23:1",
      })}
      {field("scriptureExcerpt", "짧은 성구 인용", {
        placeholder: "직접 입력한 짧은 구절",
      })}
      {field("reflectionBody", "묵상 본문", {
        textarea: true,
        required: true,
        placeholder: "마음에 남은 생각, 깨달음, 고민을 자유롭게 적어 주세요.",
      })}

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-sm text-primary"
      >
        {showOptional ? "선택 항목 접기" : "감사·질문·기도·결단 추가"}
      </button>

      {showOptional ? (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-secondary/40 p-4">
          {field("gratitude", "감사", { textarea: true })}
          {field("question", "마음에 남은 질문", { textarea: true })}
          {field("prayer", "기도", { textarea: true })}
          {field("actionStep", "오늘의 결단", { textarea: true })}
          {field("emotionsText", "감정", { placeholder: "평안, 부담, 감사" })}
          {field("tagsText", "태그", { placeholder: "관계, 소명, 쉼" })}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSave || saving}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-sage-dark disabled:opacity-50"
      >
        {saving ? "저장 중…" : entryId ? "수정 저장" : "묵상 저장"}
      </button>
    </form>
  );
}
