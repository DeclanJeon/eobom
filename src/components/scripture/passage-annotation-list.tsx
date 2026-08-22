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
                <li key={`${r.targetRef}-${r.source}-${r.votes}`} className="flex flex-wrap items-center gap-2 text-body-sm">
                  <Link href={`/entries/new?scripture=${encodeURIComponent(displayCrossRef(r))}`} className="chip-gold text-label-sm px-2 py-1 text-xs">{displayCrossRef(r)}</Link>
                  <span className="text-label-xs text-text-muted">{r.votes ? `투표 ${r.votes}` : ""}{r.votes && r.anchorPhrase ? " · " : ""}{r.anchorPhrase ? `앵커 ${r.anchorPhrase}` : ""} · {r.license}</span>
                </li>
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
          <li key={`${r.targetRef}-${r.source}-${r.votes}`} className="flex flex-wrap items-center gap-2 text-body-sm">
            <Link href={`/entries/new?scripture=${encodeURIComponent(displayCrossRef(r))}`} className="chip-gold text-label-sm px-2 py-1 text-xs">{displayCrossRef(r)}</Link>
            <span className="text-label-xs text-text-muted">{r.votes ? `투표 ${r.votes}` : ""}{r.votes && r.anchorPhrase ? " · " : ""}{r.anchorPhrase ? `앵커 ${r.anchorPhrase}` : ""} · {r.license}</span>
          </li>
        ))}
        {hidden > 0 ? <li className="text-label-xs text-text-muted">외 {hidden}개는 CSV에서 확인</li> : null}
      </ul>
    </details>
  );
}
