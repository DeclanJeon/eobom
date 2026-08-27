import { ReceiveEntrance } from "@/components/j/receive-entrance";
import { GlobalCardImpression } from "@/components/today/global-card-impression";
import { getPassageFromRef } from "@/lib/bible/corpus";
import { getChapterBackground } from "@/lib/bible/chapter-background";
import { selectGlobalScripture } from "@/lib/daily-scripture";
import { toKstDateKey } from "@/lib/kst";

/**
 * Guest today — Receive-first public surface.
 * No member navigation or personal data query is allowed here.
 */
export async function GuestTodayView({ now }: { now: Date }) {
  const dailyScripture = selectGlobalScripture(now);
  const verses = getPassageFromRef(dailyScripture.ref)?.verses ?? [];
  const dateKey = toKstDateKey(now);
  const chapterBackground = getChapterBackground({
    code: dailyScripture.ref.code,
    chapter: dailyScripture.ref.chapter,
    locale: "ko",
  });

  return (
    <main className="min-h-dvh bg-background">
      <GlobalCardImpression dateKey={dateKey} surface="guest" />
      <ReceiveEntrance
        dateKey={dateKey}
        display={dailyScripture.display}
        verses={verses}
        fallbackText={dailyScripture.text}
        surface="today"
        chapterBackground={chapterBackground}
        scriptureRef={dailyScripture.ref}
      />
    </main>
  );
}
