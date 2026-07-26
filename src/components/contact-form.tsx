"use client";

import { useState } from "react";

export function ContactForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setError("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus("error");
      setError(data.error || "전송에 실패했습니다.");
      return;
    }
    setStatus("ok");
    setSubject("");
    setMessage("");
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl bg-sage-light/50 px-4 py-5 text-sm leading-relaxed">
        문의가 접수되었습니다. 확인 후 이메일로 답변드리겠습니다.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium">이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">이메일</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">제목</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="mt-1.5 w-full rounded-xl border border-border bg-white/80 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">내용</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
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
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "전송 중…" : "문의 보내기"}
      </button>
    </form>
  );
}
