"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { displayCrossRef } from "@/lib/bible/parse";

type Ref = {
  sourceRef: string; targetRef: string; targetCode: string; targetChapter: number; targetStart: number; targetEnd: number;
  votes: string; anchorPhrase: string; source: string; sourceName: string; license: string; why?: string;
};

type VerseCommentaryInfo = { theme: string; summary: string };
type Grouped = { total: number; byVerse: Array<{ verse: number; total: number; refs: Ref[]; commentary?: VerseCommentaryInfo }> };
type Flat = { total: number; refs: Ref[]; verseRef: string; commentary?: VerseCommentaryInfo };

type Passage = { binding: { display: string }; verses: Array<{ verse: number; text: string }> };

/**
 * 연결 성구의 '왜 연결됐는지' 근거를 정직하게 표현한다.
 * - 투표수(openbible): '연결 추천 N'으로 연결 신뢰도만 표시
 * - 앵커 문구(phrase): 의미 있는 단어(고유명사 등)만 '연결 근거'로 표시, 영어 기능어는 숨김
 * 억지로 해설을 만들지 않고, 본문 인라인 펼침으로 연결점을 읽게 한다.
 */
const ANCHOR_STOPWORDS = new Set([
  "for", "but", "that", "and", "they", "which", "thou", "in", "as", "if", "he", "all", "what", "who", "with", "this", "let", "when", "because", "behold", "the lord", "god", "i will", "i am", "shall", "of", "to", "is", "it", "a", "not", "have", "be", "we", "you", "his", "him", "her", "them", "there", "their", "by", "from", "so", "or", "was", "were", "are", "upon", "into", "out", "then", "thus", "also", "even", "will", "may", "now", "said", "one", "man", "every", "these", "those", "saying", "done", "made", "come", "went", "hath", "hast", "doth", "unto", "thee", "thy", "mine", "saith",
]);

function meaningfulAnchor(anchor: string): boolean {
  const word = anchor.trim().toLowerCase();
  if (!word) return false;
  if (word.length < 4) return false;
  return !ANCHOR_STOPWORDS.has(word);
}

function CrossRefItem({ crossRef }: { crossRef: Ref }) {
  const [open, setOpen] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = displayCrossRef(crossRef);
  const anchor = meaningfulAnchor(crossRef.anchorPhrase) ? crossRef.anchorPhrase : null;
  const votes = Number(crossRef.votes);
  const hasWhy = Boolean(crossRef.why?.trim());

  function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (passage) return;
    setLoading(true);
    const qs = new URLSearchParams({
      code: crossRef.targetCode,
      chapter: String(crossRef.targetChapter),
      startVerse: String(crossRef.targetStart),
      endVerse: String(crossRef.targetEnd),
    });
    fetch(`/api/bible/passage?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data ? setPassage(data as Passage) : setFailed(true)))
      .catch(() => setFailed(true))
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
          {hasWhy ? (
            <span className="text-gold-ink">연결 해설 {crossRef.why}</span>
          ) : (
            <>
              {votes > 0 ? `연결 추천 ${votes}` : ""}
              {votes > 0 && anchor ? " · " : ""}
              {anchor ? `연결 근거 ${anchor}` : ""}
            </>
          )}
          {votes > 0 || anchor || hasWhy ? " · " : ""}{crossRef.license}
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
              <p className="mt-1 text-label-xs text-text-muted">
                두 본문을 나란히 읽으며 연결점을 살펴보세요.
              </p>
              <Link
                href={`/entries/new?scripture=${encodeURIComponent(label)}`}
                className="mt-2 inline-flex min-h-9 items-center text-label-sm text-leaf hover:text-primary"
              >
                이 본문으로 기록하기 →
              </Link>
            </>
          ) : (
            <>
              <p className="text-label-xs text-text-muted">
                {failed ? "이 성구의 본문은 이 한글본에 담겨 있지 않습니다." : "본문을 불러오는 중…"}
              </p>
              <Link
                href={`/entries/new?scripture=${encodeURIComponent(label)}`}
                className="mt-2 inline-flex min-h-9 items-center text-label-sm text-leaf hover:text-primary"
              >
                이 본문으로 기록하기 →
              </Link>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

function VerseCommentaryIntro({ commentary }: { commentary?: VerseCommentaryInfo }) {
  if (!commentary?.theme?.trim()) return null;
  return (
    <p className="mt-2 rounded-lg border border-gold-ink/20 bg-gold-ink/5 px-3 py-2 text-body-sm leading-relaxed">
      <span className="font-medium text-gold-ink">주제 · {commentary.theme}</span>
      {commentary.summary?.trim() ? <span className="text-text-main"> — {commentary.summary}</span> : null}
    </p>
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
        {visible.map(({ verse, total, refs, commentary }) => (
          <details key={verse} className="rounded-xl border border-border/20 bg-card/40 px-3 py-2">
            <summary className="cursor-pointer list-none text-label-xs text-text-muted">
              {verse}절 · 연관 {total}개 {total > refs.length ? `· 상위 ${refs.length}개` : ""} <span className="ml-2 text-gold-ink">펼치기</span>
            </summary>
            <VerseCommentaryIntro commentary={commentary} />
            <ul className="mt-3 space-y-2">
              {refs.map((r) => (
                <CrossRefItem key={`${r.targetRef}-${r.source}-${r.votes}`} crossRef={r} />
              ))}
              {total > refs.length ? <li className="text-label-xs text-text-muted">외 {total - refs.length}개는 CSV에서 확인</li> : null}
            </ul>
            <p className="mt-2 text-label-xs text-text-muted/70">연결 해설은 사전 생성된 AI 초안입니다.</p>
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
      <VerseCommentaryIntro commentary={flat.commentary} />
      <ul className="mt-3 space-y-2">
        {flat.refs.map((r) => (
          <CrossRefItem key={`${r.targetRef}-${r.source}-${r.votes}`} crossRef={r} />
        ))}
        {hidden > 0 ? <li className="text-label-xs text-text-muted">외 {hidden}개는 CSV에서 확인</li> : null}
      </ul>
      <p className="mt-2 text-label-xs text-text-muted/70">연결 해설은 사전 생성된 AI 초안입니다.</p>
    </details>
  );
}