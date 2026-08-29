"use client";

import { useEffect, useState } from "react";

export function CompanionMessageForm({ connectionId }: { connectionId: string }) {
  const [messages, setMessages] = useState<Array<{ id: string; body: string; senderUserId: string }>>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/companions/connections/${connectionId}/messages`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: { messages?: Array<{ id: string; body: string; senderUserId: string }> } | null) => {
        if (active) setMessages(data?.messages ?? []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [connectionId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/companions/connections/${connectionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!response.ok) throw new Error();
      setBody("");
      setMessages((items) => [...items, { id: crypto.randomUUID(), body: body.trim(), senderUserId: "me" }]);
      setMessage("첫 인사를 보냈어요.");
    } catch {
      setMessage("메시지를 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {messages.length ? (
        <ul className="space-y-2" aria-label="동행 메시지">
          {messages.map((item) => <li key={item.id} className="rounded-xl bg-surface-low px-3 py-2 text-body-sm">{item.body}</li>)}
        </ul>
      ) : null}
      <form onSubmit={send} className="space-y-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={300}
        rows={3}
        placeholder="첫 인사를 직접 확인하고 보내세요."
        className="w-full rounded-xl border border-border bg-white px-3 py-3 text-body-md"
      />
      <button type="submit" disabled={sending || !body.trim()} className="cta-primary min-h-11 px-4">
        {sending ? "보내는 중…" : "첫 인사 보내기"}
      </button>
      {message ? <p className="text-label-sm text-text-muted" role="status">{message}</p> : null}
      </form>
    </div>
  );
}
