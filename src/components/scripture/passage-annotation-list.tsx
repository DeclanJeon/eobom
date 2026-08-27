"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { displayCrossRef, localizeVerseReferenceInText } from "@/lib/bible/parse";

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
 * - 투표수(openbible): 칩의 title 툴팁으로만 (시각 노이즈 X)
 * - 앵커 문구(phrase): 의미 있는 단어만 "연결 단어" 라벨로 표시
 * - 같은 target으로 묶인 cross-ref는 한 번만 + "N건 매칭"으로 묶어 표시
 * - 본문은 칩 클릭으로만 펼쳐진다 (default 닫힘)
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

/**
 * 같은 target(예: 이사야 58:12)으로 묶인 cross-ref를 한 번만 보여주고,
 * "N건 매칭"으로 신뢰도를 표현한다. UI 단계의 dedupe이므로 백엔드 응답은
 * 그대로 둔다.
 */
function dedupeByTarget(refs: Ref[]): Array<{ ref: Ref; matchCount: number }> {
  const map = new Map<string, Ref & { _count: number }>();
  for (const r of refs) {
    const key = `${r.targetCode}:${r.targetChapter}:${r.targetStart}-${r.targetEnd}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...r, _count: 1 });
    } else {
      existing._count += 1;
      // 더 높은 votes를 가진 항목을 대표로 유지한다.
      if (Number(r.votes) > Number(existing.votes)) {
        map.set(key, { ...r, _count: existing._count });
      }
    }
  }
  return Array.from(map.values())
    .map((r) => ({ ref: r, matchCount: r._count }))
    .sort((a, b) => Number(b.ref.votes) - Number(a.ref.votes));
}

function CrossRefItem({ crossRef, matchCount }: { crossRef: Ref; matchCount?: number }) {
  const [open, setOpen] = useState(false);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = displayCrossRef(crossRef);
  const anchor = meaningfulAnchor(crossRef.anchorPhrase) ? crossRef.anchorPhrase : null;
  const votes = Number(crossRef.votes);
  const hasWhy = Boolean(crossRef.why?.trim());
  const sourceLabel = crossRef.sourceName || crossRef.source;
  // 칩에 들어가는 짧은 tooltip — 시각 노이즈 없이 추가 정보 전달
  const tip = [
    votes > 0 ? `연결 추천 ${votes}건` : null,
    anchor ? `연결 단어: ${anchor}` : null,
    hasWhy ? `해설: ${localizeVerseReferenceInText(crossRef.why ?? "")}` : null,
  ].filter(Boolean).join(" · ");

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
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          title={tip || undefined}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-serif text-[14px] font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C3D14] focus-visible:ring-offset-1 ${
            open
              ? "border-[#5C3D14] bg-[#FBF6EC] text-primary"
              : "border-[#C8BBA0] bg-[#FAF7F0] text-primary hover:border-[#5C3D14]"
          }`}
        >
          <span>{label}</span>
          {matchCount && matchCount > 1 ? (
            <span className="rounded-full bg-accent-gold/30 px-1.5 text-[10.5px] font-bold text-[#5C3D14]">{matchCount}건 매칭</span>
          ) : null}
          <span aria-hidden className={`text-[10px] text-[#5C574F] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
        {hasWhy ? (
          <p className="font-journal text-[12.5px] leading-snug text-[#5C3D14]">{localizeVerseReferenceInText(crossRef.why ?? "")}</p>
        ) : null}
      </div>
      {open ? (
        <div className="ml-1 rounded-2xl border border-[#D9CFB7] bg-white p-4 shadow-[0_4px_18px_-12px_rgba(27,28,26,0.18)]">
          {loading ? (
            <p className="text-[13px] text-text-muted">본문 불러오는 중…</p>
          ) : passage?.verses?.length ? (
            <>
              <p className="font-journal text-[12.5px] font-semibold text-accent-gold-ink">{passage.binding.display}</p>
              <div className="mt-2 space-y-1.5">
                {passage.verses.map((v) => (
                  <p key={v.verse} className="font-serif text-[15.5px] leading-[1.85] text-primary">
                    <span className="mr-2 font-mono text-[12px] text-text-muted/70">{v.verse}</span>
                    {v.text}
                  </p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECE5D8] pt-3">
                <p className="font-sans text-[11px] text-text-muted">{sourceLabel} · {crossRef.license}</p>
                <Link
                  href={`/entries/new?scripture=${encodeURIComponent(label)}`}
                  className="inline-flex min-h-9 items-center font-sans text-[13px] font-semibold text-leaf hover:text-primary"
                >
                  이 본문으로 기록하기 →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-journal text-[13.5px] text-text-muted">
                {failed ? "이 성구의 본문은 이 한글본에 담겨 있지 않습니다." : "본문을 불러오는 중…"}
              </p>
              <div className="mt-3 flex justify-end border-t border-[#ECE5D8] pt-3">
                <Link
                  href={`/entries/new?scripture=${encodeURIComponent(label)}`}
                  className="inline-flex min-h-9 items-center font-sans text-[13px] font-semibold text-leaf hover:text-primary"
                >
                  이 본문으로 기록하기 →
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

// 한국어 성경 책 약어 + 장:절 패턴. (예: 골 1:28, 요 17:21, 엡 4:3, 고전 14:20,
// 벧후 3:18, 히 5:14, 렘 32:38-39, 창 1:1, 시 23:1, 마 5:3 등)
const KOREAN_BOOK_RE = /((?:[가-힣]{1,3}|[1-3][가-힣]{1,2}))(\s?\d+:\d+(?:[-–]\d+)?)/g;

/**
 * 한 문단을 문장 단위로 분리하고, 성경 레퍼런스를 인라인 강조한다.
 * 데이터는 한 줄짜리 string이지만 UI는 가독성 있게.
 *
 * - 마침표(.) / 물음표(?) / 느낌표(!) / 한국어 마침표(。) 뒤 공백에서 문장 분리.
 * - 성경 레퍼런스(예: 골 1:28)는 <strong>으로 강조.
 * - 인용 부호('...')는 데이터에 일관되게 등장하지 않아(어떤 row는 열고 닫음
 *   모두, 어떤 row는 열기만) 분리하지 않는다. 안정적인 fallback으로 본문에
 *   그대로 두고, 한국어 인용 부호(' / ")는 자연스러운 산문으로 보여준다.
 */
function renderCommentarySummary(summary: string) {
  if (!summary) return null;
  const sentences = summary.split(/(?<=[.!?。])\s+/).filter(Boolean);
  return (
    <div className="mt-2 space-y-2.5">
      {sentences.map((sentence, i) => (
        <p
          key={`s-${i}`}
          className="font-journal text-[14.5px] leading-[1.85] text-text-main"
        >
          <SentenceWithRefs sentence={sentence} />
        </p>
      ))}
    </div>
  );
}

function SentenceWithRefs({ sentence }: { sentence: string }) {
  // 영문/한글 약어 모두 한국어 풀네임으로 변환한 뒤, 그 위치를 찾아
  // 인라인 강조한다. 매핑은 BOOK_ALIASES (parse.ts) 단일 source of truth.
  const localized = localizeVerseReferenceInText(sentence);
  const parts: Array<{ kind: "text" | "ref"; value: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(KOREAN_BOOK_RE.source, "g");
  while ((m = re.exec(localized)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ kind: "text", value: localized.slice(lastIndex, m.index) });
    }
    parts.push({ kind: "ref", value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < localized.length) {
    parts.push({ kind: "text", value: localized.slice(lastIndex) });
  }
  return (
    <>
      {parts.map((p, idx) =>
        p.kind === "ref" ? (
          <span key={idx} className="font-semibold text-[#5C3D14]">{p.value}</span>
        ) : (
          <span key={idx}>{p.value}</span>
        )
      )}
      {" "}
    </>
  );
}

function VerseCommentaryIntro({ commentary }: { commentary?: VerseCommentaryInfo }) {
  if (!commentary?.theme?.trim()) return null;
  return (
    <div className="mt-2 rounded-xl border border-[#E0CBAA] bg-[#FBF6EC] px-3.5 py-3">
      <p className="font-sans text-[11.5px] font-bold uppercase tracking-[0.04em] text-accent-gold-ink">이 절의 연결 단서</p>
      {commentary.theme.trim() ? (
        <p className="mt-1 font-journal text-[14.5px] font-semibold leading-snug text-primary">{commentary.theme}</p>
      ) : null}
      {commentary.summary?.trim() ? renderCommentarySummary(commentary.summary) : null}
    </div>
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

  // Hooks는 early return 전에 모두 호출되어야 한다. dedupe 결과는
  // isGrouped/flat 양쪽 분기에서 쓰이므로 여기서 한 번만 계산한다.
  const isGrouped = !!data && "byVerse" in data;
  const flatRefs = !isGrouped && data ? (data as Flat).refs : null;
  const deduped = useMemo(
    () => (flatRefs ? dedupeByTarget(flatRefs) : []),
    [flatRefs]
  );

  if (!data || data.total === 0) return null;

  if (isGrouped) {
    const g = data as Grouped;
    const visible = g.byVerse.filter((v) => v.total > 0);
    if (!visible.length) return null;
    return (
      <div className="mt-3 space-y-2.5">
        {visible.map(({ verse, total, refs, commentary }) => {
          const deduped = dedupeByTarget(refs);
          const hidden = total - refs.length;
          return (
            <details key={verse} className="rounded-2xl border border-[#D9CFB7] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 hover:bg-[#FBF6EC]">
                <span className="font-sans text-[13.5px] font-semibold text-primary">
                  {verse}절 · 관련 {deduped.length}건
                  {hidden > 0 ? <span className="ml-1 text-[12px] font-normal text-text-muted">(전체 {total}건 중)</span> : null}
                </span>
                <span className="shrink-0 font-sans text-[11.5px] font-medium text-accent-gold-ink group-open:hidden">펼치기 ▾</span>
                <span className="hidden shrink-0 font-sans text-[11.5px] font-medium text-accent-gold-ink group-open:inline">접기 ▴</span>
              </summary>
              <div className="px-4 pb-4">
                <VerseCommentaryIntro commentary={commentary} />
                <ul className="mt-3 flex flex-col gap-2.5">
                  {deduped.map(({ ref, matchCount }) => (
                    <CrossRefItem
                      key={`${ref.targetRef}-${ref.source}-${ref.votes}`}
                      crossRef={ref}
                      matchCount={matchCount}
                    />
                  ))}
                </ul>
                <p className="mt-3 font-sans text-[11px] text-text-muted/80">
                  {hidden > 0 ? `이 절에서 더 많은 연결이 매칭됩니다 — ` : ""}
                  연결 해설은 사전 생성된 AI 초안입니다.
                </p>
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  const flat = data as Flat;
  const hidden = flat.total - flat.refs.length;
  return (
    <details className="mt-3 rounded-2xl border border-[#D9CFB7] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 hover:bg-[#FBF6EC]">
        <span className="font-sans text-[13.5px] font-semibold text-primary">
          관련 {deduped.length}건
          {hidden > 0 ? <span className="ml-1 text-[12px] font-normal text-text-muted">(전체 {flat.total}건 중)</span> : null}
        </span>
        <span className="shrink-0 font-sans text-[11.5px] font-medium text-accent-gold-ink group-open:hidden">펼치기 ▾</span>
        <span className="hidden shrink-0 font-sans text-[11.5px] font-medium text-accent-gold-ink group-open:inline">접기 ▴</span>
      </summary>
      <div className="px-4 pb-4">
        <VerseCommentaryIntro commentary={flat.commentary} />
        <ul className="mt-3 flex flex-col gap-2.5">
          {deduped.map(({ ref, matchCount }) => (
            <CrossRefItem
              key={`${ref.targetRef}-${ref.source}-${ref.votes}`}
              crossRef={ref}
              matchCount={matchCount}
            />
          ))}
        </ul>
        <p className="mt-3 font-sans text-[11px] text-text-muted/80">
          {hidden > 0 ? `이 구절에서 더 많은 연결이 매칭됩니다 — ` : ""}
          연결 해설은 사전 생성된 AI 초안입니다.
        </p>
      </div>
    </details>
  );
}