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
      <div className="rounded-2xl bg-surface-low px-4 py-5 text-body-md text-text-main">
        문의가 접수되었습니다. 확인 후 이메일로 답변드리겠습니다.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {(
        [
          ["이름", name, setName, "text"],
          ["이메일", email, setEmail, "email"],
          ["제목", subject, setSubject, "text"],
        ] as const
      ).map(([label, value, setter, type]) => (
        <label key={label} className="block text-label-md">
          <span className="text-primary">{label}</span>
          <input
            type={type}
            value={value}
            onChange={(e) => setter(e.target.value)}
            required
            className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
          />
        </label>
      ))}
      <label className="block text-label-md">
        <span className="text-primary">내용</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className="mt-1.5 w-full rounded-xl border border-border-subtle bg-white px-3 py-3 text-body-md outline-none ring-accent-gold/30 focus:ring-2"
        />
      </label>
      {error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={loading} className="cta-primary w-full py-4">
        {loading ? "전송 중…" : "문의 보내기"}
      </button>
    </form>
  );
}
