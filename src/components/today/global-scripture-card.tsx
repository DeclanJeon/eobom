import { selectGlobalScripture } from "@/lib/daily-scripture";

/**
 * 전역 오늘의 말씀 카드 본문 — (KST dateKey)만으로 결정 (C2).
 * 게스트/비소유자 노출용. AppShell·CTA 없이 카드 본문만 렌더 — /j 쉘과 /today 게스트에서 공유.
 * 개인 데이터 조회 없음 (R-B3).
 */
export async function GlobalScriptureCard({ now }: { now: Date }) {
  const dailyScripture = selectGlobalScripture(now);
  const heroDisplay = dailyScripture.display;
  const heroReason = dailyScripture.background?.trim() || null;
  const passageText = dailyScripture.text;

  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 px-5 py-8 md:px-8 md:py-10">
      <p className="text-label-sm text-accent-gold-ink">오늘 함께 읽을 말씀</p>
      <p className="chip-gold mt-3 inline-flex">{heroDisplay}</p>
      {passageText ? (
        <p className="mt-4 font-journal text-xl leading-relaxed text-primary md:text-2xl">
          {passageText}
        </p>
      ) : null}
      {heroReason ? (
        <p className="mt-3 text-body-md text-text-muted line-clamp-2">{heroReason}</p>
      ) : null}
    </section>
  );
}
