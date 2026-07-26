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
  const [topicTagsText, setTopicTagsText] = useState("");
  const [pseudonym, setPseudonym] = useState("익명의 순례자");
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
        topicTags: topicTagsText
          .split(/[,，、\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        pseudonym,
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
        <span className="font-medium">공개 본문</span>
        <textarea
          value={publicBody}
          onChange={(e) => setPublicBody(e.target.value)}
          rows={5}
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
          placeholder="원문 전체가 아니라, 나누고 싶은 문장만 적어 주세요."
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">성구</span>
          <input
            value={scriptureRefsText}
            onChange={(e) => setScriptureRefsText(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">닉네임</span>
          <input
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">주제 태그</span>
        <input
          value={topicTagsText}
          onChange={(e) => setTopicTagsText(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
          placeholder="관계, 감사, 기다림"
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
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {loading ? "게시 중…" : "익명으로 게시"}
      </button>
    </form>
  );
}
