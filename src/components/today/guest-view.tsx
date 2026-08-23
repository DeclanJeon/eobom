import { AppShell } from "@/components/app-shell";
import { StartRecordingButton } from "@/components/start-recording-button";
import { PageIntro } from "@/components/ui-blocks";
import { GlobalScriptureCard } from "@/components/today/global-scripture-card";
import { GlobalCardImpression } from "@/components/today/global-card-impression";
import { toKstDateKey } from "@/lib/kst";
import { formatDateKo } from "@/lib/utils";

/**
 * 게스트 오늘 — 전역 오늘의 말씀 카드 1장 + 로그인 CTA.
 * GATE-2/R-B3: 개인 데이터 조회 없음 (전역 말씀만, 개인 요소 0).
 * session·db import 없음 — 테스트 격리를 위해 독립 파일.
 */
export async function GuestTodayView({ now }: { now: Date }) {
  return (
    <AppShell wide bare publicLogo>
      <section className="mb-10 md:mb-12">
        <PageIntro
          className="mb-0"
          title={<span className="mt-1 block">오늘 함께 읽을 말씀</span>}
          titleClassName="md:text-4xl lg:text-[2.75rem]"
        />
        <GlobalCardImpression dateKey={toKstDateKey(now)} />
        <div className="mt-6">
          <GlobalScriptureCard now={now} />
        </div>
        <div className="mt-8 max-w-xs">
          <StartRecordingButton label="기록으로 잇기" />
        </div>
        <p className="mt-4 max-w-xl text-body-sm text-text-muted">
          기록을 남기면 내일부터 이 카드가 당신을 위해 달라집니다.
        </p>
      </section>
    </AppShell>
  );
}
