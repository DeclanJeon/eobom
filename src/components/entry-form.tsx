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
  const [showMore, setShowMore] = useState(false);

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
    opts?: { textarea?: boolean; placeholder?: string; rows?: number },
  ) {
    const common = {
      id: key,
      value: values[key] || "",
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setValues((v) => ({ ...v, [key]: e.target.value })),
      placeholder: opts?.placeholder,
      className:
        "mt-1.5 w-full rounded-2xl border border-border bg-white/80 px-3 py-3 text-sm outline-none ring-primary/25 transition focus:ring-2",
    };
    return (
      <label className="block text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {opts?.textarea ? (
          <textarea {...common} rows={opts.rows ?? 3} />
        ) : (
          <input {...common} type={key === "entryDate" ? "date" : "text"} />
        )}
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {field("scriptureRefsText", "성구", {
        placeholder: "예: 빌립보서 1:6",
      })}
      {field("title", "제목", { placeholder: "없어도 됩니다 (성구가 있으면)" })}
      {field("reflectionBody", "묵상", {
        textarea: true,
        rows: 10,
        placeholder: "마음에 남은 것을 자유롭게 적어 주세요.",
      })}

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {showMore ? "간단히" : "기도·결단 더 쓰기"}
      </button>

      {showMore ? (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-secondary/30 p-4">
          {field("entryDate", "날짜")}
          {field("prayer", "기도", { textarea: true })}
          {field("actionStep", "결단", { textarea: true })}
          {field("gratitude", "감사", { textarea: true })}
          {field("question", "질문", { textarea: true })}
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
        className="w-full rounded-full bg-foreground px-5 py-4 text-base font-medium text-background transition active:scale-[0.99] disabled:opacity-40"
      >
        {saving ? "저장 중…" : entryId ? "수정 저장" : "저장"}
      </button>
    </form>
  );
}
