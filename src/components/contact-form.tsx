"use client";

import { useState } from "react";

export type ContactFormKind = "contact" | "suggest";

const SUGGEST_CATEGORIES = [
  { id: "feature", label: "기능 추가", hint: "없는 걸 만들고 싶다" },
  { id: "redesign", label: "개편", hint: "흐름·화면을 바꾸고 싶다" },
  { id: "improve", label: "개선", hint: "거슬리는 점을 다듬고 싶다" },
  { id: "other", label: "기타", hint: "위에 없는 이야기" },
] as const;

export function ContactForm({
  kind = "contact",
  defaultName = "",
  defaultEmail = "",
}: {
  kind?: ContactFormKind;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const isSuggest = kind === "suggest";
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          kind,
          category: isSuggest ? category || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "전송에 실패했습니다.");
        return;
      }
      setStatus("ok");
      setSubject("");
      setMessage("");
      setCategory("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl bg-surface-low px-4 py-5 text-body-md text-text-main">
        {isSuggest
          ? "제안이 접수되었습니다. 확인 후 이메일로 답변드릴 수 있어요."
          : "문의가 접수되었습니다. 확인 후 이메일로 답변드리겠습니다."}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {(
        [
          ["이름", name, setName, "text"],
          ["이메일", email, setEmail, "email"],
          [isSuggest ? "한 줄 요약" : "제목", subject, setSubject, "text"],
        ] as const
      ).map(([label, value, setter, type]) => (
        <label key={label} className="block text-label-md">
          <span className="text-primary">{label}</span>
          <input
            type={type}
            value={value}
            onChange={(e) => setter(e.target.value)}
            required
            maxLength={label === "한 줄 요약" ? 80 : undefined}
            placeholder={
              isSuggest && label === "한 줄 요약"
                ? "예: 회고를 기간별로 다시 만들고 싶어요"
                : undefined
            }
            className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
          />
        </label>
      ))}

      {isSuggest ? (
        <fieldset className="space-y-2">
          <legend className="text-label-md text-primary">제안 종류</legend>
          <div className="grid grid-cols-2 gap-2">
            {SUGGEST_CATEGORIES.map((item) => {
              const active = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-pressed={active}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-accent-gold bg-accent-gold/10 text-primary"
                      : "border-border bg-white text-text-main hover:border-accent-gold/40"
                  }`}
                >
                  <span className="block text-label-md">{item.label}</span>
                  <span className="mt-0.5 block text-label-sm text-text-muted">
                    {item.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <label className="block text-label-md">
        <span className="text-primary">
          {isSuggest ? "왜 필요한지 / 어떻게 바뀌면 좋은지" : "내용"}
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          placeholder={
            isSuggest
              ? "지금 겪는 장면, 바꾸고 싶은 점, 있으면 좋은 흐름을 적어 주세요."
              : undefined
          }
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-3 text-body-md outline-none ring-accent-gold/30 focus:ring-2"
        />
      </label>
      {error ? (
        <p
          className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={loading} className="cta-primary w-full py-4">
        {loading ? "전송 중…" : isSuggest ? "제안 보내기" : "문의 보내기"}
      </button>
    </form>
  );
}
