"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { displayCrossRef } from "@/lib/bible/parse";

type Ref = {
  sourceRef: string; targetRef: string; targetCode: string; targetChapter: number; targetStart: number; targetEnd: number;
  votes: string; anchorPhrase: string; source: string; sourceName: string; license: string;
};

type Grouped = { total: number; byVerse: Array<{ verse: number; total: number; refs: Ref[] }> };
type Flat = { total: number; refs: Ref[]; verseRef: string };

type Passage = { binding: { display: string }; verses: Array<{ verse: number; text: string }> };

/**
 * 연결 성구 항목 — 클릭하면 본문을 인라인으로 펼쳐 '읽기'를 제공하고,
 * 본문 아래에 '이 본문으로 기록하기' 명시적 액션을 둔다.
 * 탐색(읽기)과 기록(작성)을 분리한다.
 */
function CrossRefItem({ ref }: { ref: Ref }) {
  const [open, setOpen] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const label = displayCrossRef(ref);

  function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (passage) return;
    setLoading(true);
    const qs = new URLSearchParams({
      code: ref.targetCode,
      chapter: String(ref.targetChapter),
      startVerse: String(ref.targetStart),
      endVerse: String(ref.targetEnd),
    });
    fetch(`/api/bible/passage?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPassage(data as Passage | null))
      .catch(() => setPassage(null))
      .finally(() => setLoading(false));
  }

  return (
    <li className="flex flex-col gap-2 text-body-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={`chip-gold px-2 py-1 text-xs ${open ? "ring-1 ring-accent-gold/40" : ""}`}
        >
          {label} {open ? "▾" : "▸"}
        </button>
        <span className="text-label-xs text-text-muted">
          {ref.votes ? `투표 ${ref.votes}` : ""}
          {ref.votes && ref.anchorPhrase ? " · " : ""}
          {ref.anchorPhrase ? `앵커 ${ref.anchorPhrase}` : ""}
          {ref.votes || ref.anchorPhrase ? " · " : ""}{ref.license}
        </span>
      </div>
      {open ? (
        <div className="rounded-lg border border-border/20 bg-card/60 px-3 py-2">
          {loading ? (
            <p className="text-label-xs text-text-muted">본문 불러오는 중…</p>
          ) : passage?.verses?.length ? (
            <>
              <p className="text-label-xs text-gold-ink">{passage.binding.display}</p>
              <div className="mt-1 space-y-1.5">
                {passage.verses.map((v) => (
                  <p key={v.verse} className="text-body-sm leading-relaxed text-text-main">
                    <span className="mr-2 font-mono text-label-xs text-text-muted/60">{v.verse}</span>
                    {v.text}
                  </p>
                ))}
              </div>
              <Link
                href={`/entries/new?scripture=${encodeURIComponent(label)}`}
                className="mt-2 inline-flex min-h-9 items-center text-label-sm text-leaf hover:text-primary"
              >
                이 본문으로 기록하기 →
              </Link>
            </>
          ) : (
            <p className="text-label-xs text-text-muted">본문을 불러오지 못했습니다.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function PassageAnnotationList({ code, chapter, startVerse, endVerse }: { code: string; chapter: number; startVerse: number; endVerse: number }) {
  const isSingle = startVerse === endVerse;
  const [data, setData] = useState<Flat | Grouped | null>(null);

  useEffect(() => {
    const qs = isSingle
      ? `code=${code}&chapter=${chapter}&verse=${startVerse}&limit=8`
      : `code=${code}&chapter=${chapter}&verse=${startVerse}&endVerse=${endVerse}&grouped=1&limit=8`;
    fetch(`/api/bible/crossrefs?${qs}`)
      .then((response) => {
        if (!response.ok) throw new Error(`crossrefs ${response.status}`);
        return response.json();
      })
      .then((payload) => setData(payload as Flat | Grouped))
      .catch(() => setData(null));
  }, [code, chapter, startVerse, endVerse, isSingle]);

  if (!data || data.total === 0) return null;

  const isGrouped = "byVerse" in data;
  if (isGrouped) {
    const g = data as Grouped;
    const visible = g.byVerse.filter((v) => v.total > 0);
    if (!visible.length) return null;
    return (
      <div className="mt-3 space-y-2">
        {visible.map(({ verse, total, refs }) => (
          <details key={verse} className="rounded-xl border border-border/20 bg-card/40 px-3 py-2">
            <summary className="cursor-pointer list-none text-label-xs text-text-muted">
              {verse}절 · 연관 {total}개 {total > refs.length ? `· 상위 ${refs.length}개` : ""} <span className="ml-2 text-gold-ink">펼치기</span>
            </summary>
            <ul className="mt-3 space-y-2">
              {refs.map((r) => (
                <CrossRefItem key={`${r.targetRef}-${r.source}-${r.votes}`} ref={r} />
              ))}
              {total > refs.length ? <li className="text-label-xs text-text-muted">외 {total - refs.length}개는 CSV에서 확인</li> : null}
            </ul>
          </details>
        ))}
      </div>
    );
  }

  const flat = data as Flat;
  const hidden = flat.total - flat.refs.length;
  return (
    <details className="mt-3 rounded-xl border border-border/20 bg-card/40 px-3 py-2">
      <summary className="cursor-pointer list-none text-label-xs text-text-muted">
        연관성구 {flat.total}개 {hidden > 0 ? `· 상위 ${flat.refs.length}개` : ""} <span className="ml-2 text-gold-ink">펼치기</span>
      </summary>
      <ul className="mt-3 space-y-2">
        {flat.refs.map((r) => (
          <CrossRefItem key={`${r.targetRef}-${r.source}-${r.votes}`} ref={r} />
        ))}
        {hidden > 0 ? <li className="text-label-xs text-text-muted">외 {hidden}개는 CSV에서 확인</li> : null}
      </ul>
    </details>
  );
}