import { selectGlobalScripture } from "@/lib/daily-scripture";
import { toDisplay } from "@/lib/bible";
import { getPassageFromRef } from "@/lib/bible/corpus";
import { GuestScriptureSignal } from "@/components/today/guest-scripture-signal";

/**
 * 전역 오늘의 말씀 카드 본문 — (KST dateKey)만으로 결정 (C2).
 * 게스트/비소유자 노출용. AppShell·CTA 없이 카드 본문 + "마음에 남아요" 신호.
 * 개인 데이터 조회 없음 (R-B3). 신호 저장은 로그인 후에만 (GATE-2).
 * 절별 렌더(writing-margin + 절 번호)는 멤버 오늘 카드와 동일한 가독성 계약.
 */
export async function GlobalScriptureCard({ now }: { now: Date }) {
  const dailyScripture = selectGlobalScripture(now);
  const heroDisplay = dailyScripture.display;
  const heroReason = dailyScripture.background?.trim() || null;
  const scriptureRef = toDisplay(dailyScripture.ref);
  const verses = getPassageFromRef(dailyScripture.ref)?.verses ?? [];

  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 px-5 py-8 md:px-8 md:py-10">
      <p className="text-label-sm text-accent-gold-ink">오늘 함께 읽을 말씀</p>
      <p className="chip-gold mt-3 inline-flex">{heroDisplay}</p>
      {verses.length > 0 ? (
        <div
          className="writing-margin mt-4 space-y-4 md:space-y-3"
          aria-label="성경 본문 절별 읽기"
        >
          {verses.map((v) => (
            <div key={v.verse} className="flex gap-2.5 md:gap-3">
              <span className="mt-1 min-w-5 shrink-0 text-right font-mono text-[11px] leading-5 text-text-muted/55 md:min-w-6 md:text-label-xs">
                {v.verse}
              </span>
              <p className="flex-1 font-journal text-body-md leading-[1.85] text-primary md:text-body-lg">
                {v.text}
              </p>
            </div>
          ))}
        </div>
      ) : dailyScripture.text ? (
        <p className="mt-4 font-journal text-xl leading-relaxed text-primary md:text-2xl">
          {dailyScripture.text}
        </p>
      ) : null}
      {heroReason ? (
        <p className="mt-3 text-body-md text-text-muted line-clamp-2">{heroReason}</p>
      ) : null}
      <GuestScriptureSignal scriptureRef={scriptureRef} />
    </section>
  );
}
