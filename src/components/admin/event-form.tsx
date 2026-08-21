"use client";

import { useState } from "react";

type Seat = { id: string; seatCode: string; slug: string; status: string; eventId?: string | null };

export function EventForm({ seats }: { seats: Seat[] }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState("retreat");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [messagePrompt, setMessagePrompt] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  function toggleSeat(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submit() {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          kind,
          periodStart: periodStart ? new Date(`${periodStart}T00:00:00+09:00`).toISOString() : null,
          periodEnd: periodEnd ? new Date(`${periodEnd}T00:00:00+09:00`).toISOString() : null,
          messagePrompt: messagePrompt || null,
          seatIds: selected,
        }),
      });
      const body = (await response.json()) as { event?: { title: string }; error?: string };
      if (!response.ok) throw new Error(body.error || "이벤트 생성에 실패했습니다.");
      setFeedback(`생성됨: ${body.event?.title || title}`);
      setTitle("");
      setSlug("");
      setPeriodStart("");
      setPeriodEnd("");
      setMessagePrompt("");
      setSelected([]);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "이벤트 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="paper-card p-5 text-left">
        <h2 className="text-headline-sm text-primary">이벤트 만들기</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-label-md text-primary">
            이벤트 이름
            <input className="mt-1 min-h-11 w-full rounded-lg border border-border px-3" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </label>
          <label className="text-label-md text-primary">
            slug
            <input className="mt-1 min-h-11 w-full rounded-lg border border-border px-3" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="summer-retreat-2026" />
          </label>
          <label className="text-label-md text-primary">
            종류
            <select className="mt-1 min-h-11 w-full rounded-lg border border-border px-3" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="retreat">수련회</option>
              <option value="seminar">세미나</option>
              <option value="team">팀</option>
            </select>
          </label>
          <label className="text-label-md text-primary">
            시작일
            <input type="date" className="mt-1 min-h-11 w-full rounded-lg border border-border px-3" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </label>
          <label className="text-label-md text-primary">
            종료일
            <input type="date" className="mt-1 min-h-11 w-full rounded-lg border border-border px-3" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </label>
        </div>
        <label className="mt-4 block text-label-md text-primary">
          DAY 30/90 메시지
          <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border px-3 py-2" value={messagePrompt} onChange={(e) => setMessagePrompt(e.target.value)} maxLength={500} placeholder="수련회에서 붙잡은 결단이 오늘도 이어지길 바랍니다." />
        </label>
        <button type="button" disabled={busy || !title || !slug || !periodEnd} onClick={submit} className="cta-primary mt-5 min-h-11 px-5 py-3">
          {busy ? "생성 중…" : "이벤트 생성"}
        </button>
        {feedback ? <p className="mt-3 text-label-md text-text-muted" role="status">{feedback}</p> : null}
      </section>

      <section className="text-left">
        <h2 className="text-headline-sm text-primary">연결할 좌석 ({selected.length}개 선택)</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {seats.filter((seat) => !seat.eventId && seat.status !== "revoked").map((seat) => (
            <label key={seat.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white px-3">
              <input type="checkbox" checked={selected.includes(seat.id)} onChange={() => toggleSeat(seat.id)} />
              <span className="text-label-md text-primary">{seat.seatCode} · /j/{seat.slug}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
