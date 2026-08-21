import { getPassageFromRef } from "@/lib/bible/corpus";
import { PassageAnnotationList } from "./passage-annotation-list";

export function ScripturePassageCard({
  display,
  translation,
  code,
  chapter,
  startVerse,
  endVerse,
}: {
  display: string;
  translation: string;
  code: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}) {
  const passage = getPassageFromRef({ code: code.toUpperCase(), chapter, startVerse, endVerse });
  const verses = passage?.verses ?? [];
  return (
    <div className="writing-margin">
      <p className="text-label-md text-gold-ink">{display}</p>
      {verses.length ? (
        <>
          <div className="mt-3 space-y-3">
            {verses.map((v) => (
              <div key={v.verse} className="flex gap-3">
                <span className="mt-1 min-w-6 text-right text-label-xs text-text-muted/60 font-mono">{v.verse}</span>
                <div className="flex-1">
                  <p className="text-body-lg leading-relaxed text-text-main">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
          <PassageAnnotationList code={code} chapter={chapter} startVerse={startVerse} endVerse={endVerse} />
        </>
      ) : null}
      <p className="mt-3 text-label-sm text-text-muted">
        {translation === "ko-open-bible" ? "한국어 성경 (Open Bibles) · 개역개정 아님" : translation === "user-typed" ? "사용자 입력 인용" : translation}
      </p>
    </div>
  );
}
