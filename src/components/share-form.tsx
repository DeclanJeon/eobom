"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShareForm({
  sourceEntryId,
  initialBody = "",
  initialScripture = "",
}: {
  sourceEntryId?: string;
  initialBody?: string;
  initialScripture?: string;
}) {
  const router = useRouter();
  const [publicBody, setPublicBody] = useState(initialBody);
  const [scriptureRefsText, setScriptureRefsText] = useState(initialScripture);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/together", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceEntryId,
        publicBody,
        scriptureRefs: scriptureRefsText
          .split(/[,，、\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        topicTags: [],
        pseudonym: "익명의 순례자",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "게시에 실패했습니다.");
      return;
    }
    setPublicBody("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium">내용</span>
        <textarea
          value={publicBody}
          onChange={(e) => setPublicBody(e.target.value)}
          rows={5}
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
          placeholder="나누고 싶은 문장만"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">성구</span>
        <input
          value={scriptureRefsText}
          onChange={(e) => setScriptureRefsText(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        />
      </label>
      {error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-50"
      >
        {loading ? "게시 중…" : "게시"}
      </button>
    </form>
  );
}
